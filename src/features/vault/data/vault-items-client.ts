import {
  decryptVaultEntry,
  decryptVaultEntryV2,
  encryptVaultEntryV2,
  type EncryptedVaultEntry,
  type EncryptedVaultEntryV1,
  type EncryptedVaultEntryV2,
  type VaultEntryAssociatedData,
} from "@/features/vault/crypto/vault-crypto";
import { type VaultEntry, type VaultEntryInput, vaultEntrySchema } from "@/features/vault/domain/vault-entry";

import { VaultStaleRevisionError } from "./vault-stale-revision-error";

export type DecryptedVaultItem = {
  itemId: string;
  ownerId: string;
  vaultId: string;
  revision: number;
  entry: VaultEntry;
  createdAt: string;
  updatedAt: string;
};

export type VaultItemsContext = {
  vaultId: string;
  ownerId: string;
};

type ServerItem = {
  itemId: string;
  ownerId: string;
  revision: number;
  algorithm: "xchacha20poly1305-ietf" | "aes-256-gcm";
  nonceBase64: string;
  ciphertextBase64: string;
  associatedData: VaultEntryAssociatedData;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { vaultId: string; items: ServerItem[] };

async function fetchServerItems(): Promise<ServerItem[]> {
  const response = await fetch("/api/vault/items", { method: "GET", credentials: "same-origin" });
  if (response.status === 404) {
    throw new Error("vault_not_onboarded");
  }
  if (!response.ok) {
    throw await responseError(response);
  }
  return ((await response.json()) as ListResponse).items;
}

export async function listItems(rootKey: CryptoKey, ctx: VaultItemsContext): Promise<DecryptedVaultItem[]> {
  const items = await fetchServerItems();
  const out: DecryptedVaultItem[] = [];
  for (const item of items) {
    if (item.algorithm !== "aes-256-gcm") {
      // Should never happen: legacy v1 entries are migrated to v2 at unlock,
      // before the workspace lists them. Surfacing it loudly beats silent
      // mis-decryption.
      throw new Error("vault_unmigrated_entry");
    }
    const entry = await decryptVaultEntryV2(rootKey, toEncryptedV2(item));
    out.push({
      itemId: item.itemId,
      ownerId: item.ownerId,
      vaultId: ctx.vaultId,
      revision: item.revision,
      entry,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
  return out;
}

/**
 * SP6c one-time migration: re-encrypt any legacy v1 (XChaCha20) entries as v2
 * (AES-256-GCM) so the raw root key can be discarded. Runs at unlock while the
 * raw key bytes are still available. Idempotent — v2 entries are skipped.
 */
export async function migrateLegacyEntries(rawRootKey: Uint8Array, rootCryptoKey: CryptoKey): Promise<void> {
  const items = await fetchServerItems();
  for (const item of items) {
    if (item.algorithm === "aes-256-gcm") continue;
    const plaintext = await decryptVaultEntry(rawRootKey, toEncryptedV1(item));
    const existing: DecryptedVaultItem = {
      itemId: item.itemId,
      ownerId: item.ownerId,
      // The original (authoritative) vaultId lives in the entry's associated data.
      vaultId: item.associatedData.vaultId,
      revision: item.revision,
      entry: plaintext,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
    await updateItem(rootCryptoKey, existing, plaintext);
  }
}

export async function createItem(
  rootKey: CryptoKey,
  draft: VaultEntryInput,
  ctx: VaultItemsContext,
): Promise<DecryptedVaultItem> {
  const itemId = crypto.randomUUID();
  const encrypted = await encryptVaultEntryV2(rootKey, {
    vaultId: ctx.vaultId,
    itemId,
    ownerId: ctx.ownerId,
    revision: 1,
    plaintext: draft,
  });
  const response = await fetch("/api/vault/items", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(toBody(itemId, 1, encrypted)),
  });
  if (response.status === 409) {
    // Extremely unlikely: client minted UUID collision. Treat as failure.
    throw new Error("vault_item_exists");
  }
  if (!response.ok) {
    throw await responseError(response);
  }
  const ack = (await response.json()) as { itemId: string; revision: number; createdAt: string; updatedAt: string };
  return { itemId: ack.itemId, ownerId: ctx.ownerId, vaultId: ctx.vaultId, revision: ack.revision, entry: vaultEntrySchema.parse(draft), createdAt: ack.createdAt, updatedAt: ack.updatedAt };
}

export async function updateItem(
  rootKey: CryptoKey,
  existing: DecryptedVaultItem,
  patch: VaultEntryInput,
): Promise<DecryptedVaultItem> {
  const nextRevision = existing.revision + 1;
  const encrypted = await encryptVaultEntryV2(rootKey, {
    vaultId: existing.vaultId,
    itemId: existing.itemId,
    ownerId: existing.ownerId,
    revision: nextRevision,
    plaintext: patch,
  });
  const response = await fetch(`/api/vault/items/${encodeURIComponent(existing.itemId)}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(toBody(existing.itemId, nextRevision, encrypted)),
  });
  if (response.status === 409) {
    const snapshot = await listItems(rootKey, { vaultId: existing.vaultId, ownerId: existing.ownerId });
    throw new VaultStaleRevisionError(snapshot);
  }
  if (!response.ok) {
    throw await responseError(response);
  }
  const ack = (await response.json()) as { itemId: string; revision: number; updatedAt: string };
  return { ...existing, revision: ack.revision, entry: vaultEntrySchema.parse(patch), updatedAt: ack.updatedAt };
}

export async function deleteItem(rootKey: CryptoKey, item: DecryptedVaultItem): Promise<void> {
  const response = await fetch(
    `/api/vault/items/${encodeURIComponent(item.itemId)}?revision=${item.revision}`,
    { method: "DELETE", credentials: "same-origin" },
  );
  if (response.status === 204) return;
  if (response.status === 409) {
    const snapshot = await listItems(rootKey, { vaultId: item.vaultId, ownerId: item.ownerId });
    throw new VaultStaleRevisionError(snapshot);
  }
  throw await responseError(response);
}

function toEncryptedV1(item: ServerItem): EncryptedVaultEntryV1 {
  return {
    version: 1,
    algorithm: "xchacha20poly1305-ietf",
    nonceBase64: item.nonceBase64,
    ciphertextBase64: item.ciphertextBase64,
    associatedData: item.associatedData,
  };
}

function toEncryptedV2(item: ServerItem): EncryptedVaultEntryV2 {
  return {
    version: 2,
    algorithm: "aes-256-gcm",
    nonceBase64: item.nonceBase64,
    ciphertextBase64: item.ciphertextBase64,
    associatedData: item.associatedData,
  };
}

function toBody(itemId: string, revision: number, encrypted: EncryptedVaultEntry) {
  return {
    itemId,
    revision,
    algorithm: encrypted.algorithm,
    nonceBase64: encrypted.nonceBase64,
    ciphertextBase64: encrypted.ciphertextBase64,
    associatedData: encrypted.associatedData,
  };
}

async function responseError(response: Response): Promise<Error> {
  let detail = "";
  try {
    const data = await response.json();
    detail = typeof data?.error === "string" ? data.error : JSON.stringify(data);
  } catch {
    detail = await response.text().catch(() => "");
  }
  return new Error(`${response.status} ${detail || response.statusText}`);
}
