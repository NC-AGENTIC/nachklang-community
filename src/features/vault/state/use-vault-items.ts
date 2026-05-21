"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createItem,
  deleteItem,
  listItems,
  updateItem,
  type DecryptedVaultItem,
  type VaultItemsContext,
} from "@/features/vault/data/vault-items-client";
import { VaultStaleRevisionError } from "@/features/vault/data/vault-stale-revision-error";
import type { VaultEntry } from "@/features/vault/domain/vault-entry";

export type VaultItemsStatus = "loading" | "ready" | "error";

export type VaultItemsError =
  | { kind: "stale" }
  | { kind: "network"; message: string }
  | { kind: "not_onboarded" };

export type UseVaultItemsArgs = {
  rootKey: CryptoKey | null;
  vaultId: string | null;
  ownerId: string;
};

export type UseVaultItems = {
  items: DecryptedVaultItem[] | null;
  status: VaultItemsStatus;
  error: VaultItemsError | null;
  create(draft: VaultEntry): Promise<void>;
  update(existing: DecryptedVaultItem, patch: VaultEntry): Promise<void>;
  remove(item: DecryptedVaultItem): Promise<void>;
  refresh(): Promise<void>;
};

export function useVaultItems(args: UseVaultItemsArgs): UseVaultItems {
  const { rootKey, vaultId, ownerId } = args;
  const [items, setItems] = useState<DecryptedVaultItem[] | null>(null);
  const [status, setStatus] = useState<VaultItemsStatus>("loading");
  const [error, setError] = useState<VaultItemsError | null>(null);
  const ctxRef = useRef<VaultItemsContext | null>(null);

  ctxRef.current = vaultId ? { vaultId, ownerId } : null;

  const load = useCallback(async () => {
    if (!rootKey || !vaultId) return;
    setStatus("loading");
    try {
      const list = await listItems(rootKey, { vaultId, ownerId });
      setItems(list);
      setError(null);
      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "vault_not_onboarded") {
        setError({ kind: "not_onboarded" });
        setStatus("error");
      } else {
        setError({ kind: "network", message: msg });
        setStatus("error");
      }
    }
  }, [rootKey, vaultId, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (draft: VaultEntry) => {
      if (!rootKey || !ctxRef.current) return;
      const placeholder: DecryptedVaultItem = {
        itemId: `optimistic-${Math.random().toString(36).slice(2)}`,
        ownerId,
        vaultId: ctxRef.current.vaultId,
        revision: 1,
        entry: draft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => [placeholder, ...(prev ?? [])]);
      try {
        const created = await createItem(rootKey, draft, ctxRef.current);
        setItems((prev) => (prev ?? []).map((p) => (p.itemId === placeholder.itemId ? created : p)));
        setError(null);
      } catch (e) {
        setItems((prev) => (prev ?? []).filter((p) => p.itemId !== placeholder.itemId));
        const msg = e instanceof Error ? e.message : String(e);
        setError({ kind: "network", message: msg });
        throw e;
      }
    },
    [rootKey, ownerId],
  );

  const update = useCallback(
    async (existing: DecryptedVaultItem, patch: VaultEntry) => {
      if (!rootKey) return;
      const optimistic: DecryptedVaultItem = {
        ...existing,
        entry: patch,
        revision: existing.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => (prev ?? []).map((p) => (p.itemId === existing.itemId ? optimistic : p)));
      try {
        const saved = await updateItem(rootKey, existing, patch);
        setItems((prev) => (prev ?? []).map((p) => (p.itemId === existing.itemId ? saved : p)));
        setError(null);
      } catch (e) {
        if (e instanceof VaultStaleRevisionError) {
          setItems(e.snapshot);
          setError({ kind: "stale" });
        } else {
          setItems((prev) => (prev ?? []).map((p) => (p.itemId === existing.itemId ? existing : p)));
          const msg = e instanceof Error ? e.message : String(e);
          setError({ kind: "network", message: msg });
        }
        throw e;
      }
    },
    [rootKey],
  );

  const remove = useCallback(
    async (item: DecryptedVaultItem) => {
      if (!rootKey) return;
      const prevSnapshot = items ?? [];
      setItems((prev) => (prev ?? []).filter((p) => p.itemId !== item.itemId));
      try {
        await deleteItem(rootKey, item);
        setError(null);
      } catch (e) {
        if (e instanceof VaultStaleRevisionError) {
          setItems(e.snapshot);
          setError({ kind: "stale" });
        } else {
          setItems(prevSnapshot);
          const msg = e instanceof Error ? e.message : String(e);
          setError({ kind: "network", message: msg });
        }
        throw e;
      }
    },
    [rootKey, items],
  );

  return { items, status, error, create, update, remove, refresh: load };
}
