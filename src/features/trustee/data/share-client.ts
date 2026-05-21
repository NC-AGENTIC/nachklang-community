import { bootstrapUserKeypairPrfOnly } from "@/features/trustee/crypto/user-keypair-bootstrap";
import {
  openSealedRootKey,
  publicKeyFromBase64,
  sealRootKeyToTrustee,
  sealedFromBase64,
  sealedToBase64,
  type TrusteeKeypair,
} from "@/features/trustee/crypto/trustee-keypair";
import { unlockKeypairWithPrf } from "@/features/trustee/crypto/user-keypair-unlock";
import {
  decryptItemStatus,
  encryptItemStatus,
} from "@/features/trustee/crypto/trustee-progress-crypto";
import { createMyKeypair, fetchMyKeypair } from "@/features/trustee/data/keypair-client";
import { assertPrf, registerWithPrf } from "@/features/vault/crypto/passkey-port";
import { decryptVaultEntryV2 } from "@/features/vault/crypto/vault-crypto";
import type { LifecycleStatus } from "@/features/vault/domain/vault-entry";
import { unlockWithPrf } from "@/features/vault/crypto/vault-unlock";
import type { DecryptedVaultItem } from "@/features/vault/data/vault-items-client";

export type InvitePreview = {
  inviteeEmail: string;
  status: string;
  acceptable: boolean;
  ownerName: string;
};

export type ShareSummary = {
  id: string;
  label: string;
  status: string;
  trusteePublicKey: string;
  fingerprint: string;
  createdAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
};

export type AccessLogEntry = { accessedAt: string; ipAddress: string | null; userAgent: string | null };
export type SharedVaultSummary = { vaultId: string; ownerName: string };
export type SharedVaultRead = {
  vaultId: string;
  ownerId: string;
  ownerName: string | null;
  ownerUpdatedAt: string | null;
  entries: DecryptedVaultItem[];
  // Kept in memory so the trustee can write handling-status updates without re-unlocking.
  rootKey: CryptoKey;
  // itemId → the trustee's last-saved handling status (decrypted from the overlay).
  statuses: Record<string, LifecycleStatus>;
};

export type AcceptResult = { shareId: string; status: string; fingerprint: string };

export async function createShareInvite(input: {
  inviteeEmail: string;
  label: string;
}): Promise<{ acceptUrl: string; emailSent: boolean }> {
  const res = await fetch("/api/shares/invite", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create_invite_failed_${res.status}`);
  return (await res.json()) as { acceptUrl: string; emailSent: boolean };
}

export async function fetchInvitePreview(token: string): Promise<InvitePreview | null> {
  const res = await fetch(`/api/shares/invite/${encodeURIComponent(token)}`, {
    method: "GET",
    credentials: "same-origin",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetch_invite_failed_${res.status}`);
  return (await res.json()) as InvitePreview;
}

export async function fetchMyShares(): Promise<ShareSummary[]> {
  const res = await fetch("/api/shares", { method: "GET", credentials: "same-origin" });
  if (!res.ok) throw new Error(`fetch_shares_failed_${res.status}`);
  const body = (await res.json()) as { shares: ShareSummary[] };
  return body.shares;
}

// Returns the caller's keypair public key, provisioning a PRF-only keypair on the fly if the
// user (an existing account) doesn't have one yet. Newly onboarded users already have a full
// keypair from onboarding, so this is a no-op fetch for them. Uses an assertion on an EXISTING
// passkey — only valid when the caller already has a passkey.
export async function ensureMyKeypair(): Promise<string> {
  const existing = await fetchMyKeypair();
  if (existing) return existing.publicKey;

  const reg = await assertPrf();
  const boot = await bootstrapUserKeypairPrfOnly(reg);
  await createMyKeypair(boot.payload);
  return boot.payload.publicKey;
}

// Trustee-only onboarding: a freshly signed-up invitee has a session but NO passkey yet, so we
// REGISTER a passkey (which also yields PRF output) and bootstrap a PRF-only keypair from it.
// No personal vault is created — the account exists purely to receive shared vaults. If the
// device is lost, the owner re-invites (no recovery code for a read-only trustee in v1).
export async function provisionTrusteeKeypair(): Promise<string> {
  // Register the passkey FIRST: until a passkey exists the account isn't "fully authenticated",
  // and GET /api/keypair (requireFullyAuthenticated) would redirect to /onboarding. registering
  // the passkey makes the account fully authenticated, so the subsequent POST /api/keypair is
  // accepted. createMyKeypair treats a 409 (already exists) as success, so this is idempotent.
  const reg = await registerWithPrf();
  const boot = await bootstrapUserKeypairPrfOnly(reg);
  await createMyKeypair(boot.payload);
  return boot.payload.publicKey;
}

export async function acceptInvite(token: string): Promise<AcceptResult> {
  await ensureMyKeypair();
  const res = await fetch(`/api/shares/invite/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`accept_invite_failed_${res.status}`);
  return (await res.json()) as AcceptResult;
}

// --- SP3: owner seal / revoke / audit, trustee read ---

// Owner grants access: transiently derive an EXTRACTABLE copy of the Root Key (the "add device"
// pattern), seal it to the trustee's verified public key, and store only the sealed blob.
export async function sealShare(shareId: string, trusteePublicKey: string): Promise<void> {
  const vaultRes = await fetch("/api/vault", { method: "GET", credentials: "same-origin" });
  if (!vaultRes.ok) throw new Error(`load_vault_failed_${vaultRes.status}`);
  const vault = (await vaultRes.json()) as {
    prfWrappedRootKeys: Array<{ credentialID: string; wrapped: unknown }>;
  };

  const assertion = await assertPrf();
  const extractableRootKey = await unlockWithPrf(
    vault.prfWrappedRootKeys as never,
    assertion,
    true,
  );
  const sealed = await sealRootKeyToTrustee(extractableRootKey, publicKeyFromBase64(trusteePublicKey));

  const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}/seal`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sealedRootKey: sealedToBase64(sealed) }),
  });
  if (!res.ok) throw new Error(`seal_failed_${res.status}`);
}

export async function revokeShare(shareId: string): Promise<void> {
  const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (res.status !== 204) throw new Error(`revoke_failed_${res.status}`);
}

// Permanently delete a (revoked) share record + its originating invite.
export async function purgeShare(shareId: string): Promise<void> {
  const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}?purge=1`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (res.status !== 204) throw new Error(`purge_failed_${res.status}`);
}

export async function fetchAccessLog(shareId: string): Promise<AccessLogEntry[]> {
  const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}/access-log`, {
    method: "GET",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`access_log_failed_${res.status}`);
  return ((await res.json()) as { entries: AccessLogEntry[] }).entries;
}

export async function fetchSharedWithMe(): Promise<SharedVaultSummary[]> {
  const res = await fetch("/api/shared", { method: "GET", credentials: "same-origin" });
  if (!res.ok) throw new Error(`shared_list_failed_${res.status}`);
  return ((await res.json()) as { shares: SharedVaultSummary[] }).shares;
}

// Unlock the caller's own trustee keypair via passkey PRF (for reading shared vaults).
export async function unlockMyKeypairWithPasskey(): Promise<TrusteeKeypair> {
  const material = await fetchMyKeypair();
  if (!material) throw new Error("no_keypair");
  const assertion = await assertPrf();
  return unlockKeypairWithPrf(material.prfWrappedPrivateKeys, assertion);
}

// Trustee read: fetch the owner's ciphertext + sealed Root Key, unseal it, and decrypt entries.
export async function readSharedVault(
  vaultId: string,
  keypair: TrusteeKeypair,
): Promise<SharedVaultRead> {
  const res = await fetch(`/api/shared/${encodeURIComponent(vaultId)}`, {
    method: "GET",
    credentials: "same-origin",
  });
  if (res.status === 403) throw new Error("forbidden");
  if (!res.ok) throw new Error(`shared_read_failed_${res.status}`);
  const body = (await res.json()) as {
    vaultId: string;
    ownerId: string;
    ownerName: string | null;
    ownerUpdatedAt: string | null;
    sealedRootKey: string | null;
    items: Array<{
      itemId: string;
      ownerId: string;
      revision: number;
      algorithm: string;
      nonceBase64: string;
      ciphertextBase64: string;
      associatedData: never;
      createdAt: string;
      updatedAt: string;
    }>;
    progress?: Array<{ itemId: string; nonceBase64: string; ciphertextBase64: string }>;
  };
  if (!body.sealedRootKey) throw new Error("not_sealed");

  const rootKey = await openSealedRootKey(sealedFromBase64(body.sealedRootKey), keypair);
  const entries: DecryptedVaultItem[] = [];
  for (const item of body.items) {
    if (item.algorithm !== "aes-256-gcm") continue;
    const entry = await decryptVaultEntryV2(rootKey, {
      version: 2,
      algorithm: "aes-256-gcm",
      nonceBase64: item.nonceBase64,
      ciphertextBase64: item.ciphertextBase64,
      associatedData: item.associatedData,
    });
    entries.push({
      itemId: item.itemId,
      ownerId: item.ownerId,
      vaultId,
      revision: item.revision,
      entry,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  const statuses: Record<string, LifecycleStatus> = {};
  for (const p of body.progress ?? []) {
    try {
      statuses[p.itemId] = await decryptItemStatus(rootKey, {
        vaultId,
        itemId: p.itemId,
        nonceBase64: p.nonceBase64,
        ciphertextBase64: p.ciphertextBase64,
      });
    } catch {
      // A blob that fails to decrypt (e.g. tampered) is skipped rather than breaking the read.
    }
  }

  return {
    vaultId,
    ownerId: body.ownerId,
    ownerName: body.ownerName ?? null,
    ownerUpdatedAt: body.ownerUpdatedAt ?? null,
    entries,
    rootKey,
    statuses,
  };
}

// Trustee writes their handling status for one item: encrypt with the in-memory Root Key and PUT
// the opaque blob. The owner's encrypted entry is never touched (strict read-only preserved).
export async function saveItemProgress(
  vaultId: string,
  itemId: string,
  rootKey: CryptoKey,
  status: LifecycleStatus,
): Promise<void> {
  const blob = await encryptItemStatus(rootKey, { vaultId, itemId, status });
  const res = await fetch(`/api/shared/${encodeURIComponent(vaultId)}/progress`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId, nonceBase64: blob.nonceBase64, ciphertextBase64: blob.ciphertextBase64 }),
  });
  if (!res.ok) throw new Error(`save_progress_failed_${res.status}`);
}
