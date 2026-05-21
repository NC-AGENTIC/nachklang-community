import type { DecryptedVaultItem } from "./vault-items-client";

export class VaultStaleRevisionError extends Error {
  readonly snapshot: DecryptedVaultItem[];

  constructor(snapshot: DecryptedVaultItem[]) {
    super("vault_item_stale");
    this.name = "VaultStaleRevisionError";
    this.snapshot = snapshot;
  }
}
