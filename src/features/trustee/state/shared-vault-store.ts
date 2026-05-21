import type { DecryptedVaultItem } from "@/features/vault/data/vault-items-client";
import type { LifecycleStatus } from "@/features/vault/domain/vault-entry";

// In-memory (module-scoped) session for the currently-open shared vault, mirroring how the
// personal vault keeps its Root Key in memory. This lets a trustee navigate to Protokoll / Shared
// and back WITHOUT re-unlocking (the decrypted state survives client-side navigation), while still
// being wiped on a full page reload, sign-out, or by clearSharedVaultSession(). The CryptoKey is
// non-extractable; nothing is persisted to disk.
export type SharedVaultSession = {
  vaultId: string;
  ownerName: string | null;
  ownerUpdatedAt: string | null;
  rootKey: CryptoKey;
  entries: DecryptedVaultItem[];
  statuses: Record<string, LifecycleStatus>;
};

let session: SharedVaultSession | null = null;

export function getSharedVaultSession(vaultId: string): SharedVaultSession | null {
  return session && session.vaultId === vaultId ? session : null;
}

export function setSharedVaultSession(next: SharedVaultSession): void {
  session = next;
}

export function patchSharedVaultStatuses(
  vaultId: string,
  statuses: Record<string, LifecycleStatus>,
): void {
  if (session && session.vaultId === vaultId) {
    session = { ...session, statuses };
  }
}

export function clearSharedVaultSession(): void {
  session = null;
}
