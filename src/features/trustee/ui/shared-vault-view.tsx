"use client";

import { useState } from "react";

import {
  readSharedVault,
  saveItemProgress,
  unlockMyKeypairWithPasskey,
} from "@/features/trustee/data/share-client";
import {
  getSharedVaultSession,
  patchSharedVaultStatuses,
  setSharedVaultSession,
} from "@/features/trustee/state/shared-vault-store";
import type { DecryptedVaultItem } from "@/features/vault/data/vault-items-client";
import type { LifecycleStatus } from "@/features/vault/domain/vault-entry";

import { SharedVaultPanel } from "./shared-vault-panel";

export function SharedVaultView({ vaultId }: { vaultId: string }) {
  // Restore an in-memory session so navigating to Protokoll/Shared and back doesn't force a
  // re-unlock; falls back to the locked state on a fresh load.
  const restored = getSharedVaultSession(vaultId);
  const [entries, setEntries] = useState<DecryptedVaultItem[] | null>(restored?.entries ?? null);
  const [ownerName, setOwnerName] = useState<string | null>(restored?.ownerName ?? null);
  const [ownerUpdatedAt, setOwnerUpdatedAt] = useState<string | null>(restored?.ownerUpdatedAt ?? null);
  const [statuses, setStatuses] = useState<Record<string, LifecycleStatus>>(restored?.statuses ?? {});
  const [rootKey, setRootKey] = useState<CryptoKey | null>(restored?.rootKey ?? null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [locked, setLocked] = useState(restored === null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    setLoading(true);
    setError(null);
    try {
      const keypair = await unlockMyKeypairWithPasskey();
      const result = await readSharedVault(vaultId, keypair);
      setEntries(result.entries);
      setOwnerName(result.ownerName);
      setOwnerUpdatedAt(result.ownerUpdatedAt);
      setStatuses(result.statuses);
      setRootKey(result.rootKey);
      setLocked(false);
      setSharedVaultSession({
        vaultId,
        ownerName: result.ownerName,
        ownerUpdatedAt: result.ownerUpdatedAt,
        rootKey: result.rootKey,
        entries: result.entries,
        statuses: result.statuses,
      });
    } catch (e) {
      setError(e instanceof Error && e.message === "forbidden" ? "forbidden" : "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeStatus(itemId: string, status: LifecycleStatus) {
    if (!rootKey) return;
    const previous = statuses[itemId];
    const next = { ...statuses, [itemId]: status };
    setStatuses(next); // optimistic
    patchSharedVaultStatuses(vaultId, next);
    setSavingItemId(itemId);
    try {
      await saveItemProgress(vaultId, itemId, rootKey, status);
    } catch {
      const rolledBack = { ...statuses };
      if (previous === undefined) delete rolledBack[itemId];
      else rolledBack[itemId] = previous;
      setStatuses(rolledBack);
      patchSharedVaultStatuses(vaultId, rolledBack);
      setError("error");
    } finally {
      setSavingItemId(null);
    }
  }

  return (
    <SharedVaultPanel
      entries={entries}
      ownerName={ownerName}
      ownerUpdatedAt={ownerUpdatedAt}
      statuses={statuses}
      locked={locked}
      loading={loading}
      onUnlock={handleUnlock}
      onChangeStatus={handleChangeStatus}
      savingItemId={savingItemId}
      error={error}
    />
  );
}
