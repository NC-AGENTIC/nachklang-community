"use client";

import { Plus, Settings } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useRootKey } from "@/features/vault/state/use-root-key";
import { useVaultItems } from "@/features/vault/state/use-vault-items";
import type { DecryptedVaultItem } from "@/features/vault/data/vault-items-client";
import type { VaultMember } from "../domain/vault-permissions";
import {
  type LifecycleStatus,
  type ProviderCatalogItem,
  type VaultEntry,
} from "../domain/vault-entry";
import { LAST_VAULT_UPDATED_STORAGE_KEY, VAULT_UPDATED_EVENT } from "../domain/vault-metadata";
import {
  toVaultWorklistEntry,
  type VaultWorklistEntry,
} from "../domain/vault-worklist";
import { ToastProvider, useToast } from "@/features/vault/state/toast-store";
import { VaultEntriesList } from "./vault-entries-list";
import { VaultEntryForm, type EntryDraft } from "./vault-entry-form";
import { VaultSummary } from "./vault-summary";
import { ToastViewport } from "./toast-viewport";

export type VaultWorkspaceProps = {
  vaultAdmin: VaultMember;
};

export function VaultWorkspace(props: VaultWorkspaceProps) {
  return (
    <ToastProvider>
      <VaultWorkspaceInner {...props} />
      <ToastViewport />
    </ToastProvider>
  );
}

function VaultWorkspaceInner({ vaultAdmin }: VaultWorkspaceProps) {
  const t = useTranslations("vault.workspace");
  const tLife = useTranslations("vault.lifecycle");
  const router = useRouter();
  const rootKeyState = useRootKey();
  const { items, status, error: itemsError, create, update, remove, refresh } = useVaultItems({
    rootKey: rootKeyState?.rootKey ?? null,
    vaultId: rootKeyState?.vaultId ?? null,
    ownerId: vaultAdmin.userId,
  });
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(() => new Set());
  const commitTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const COMMIT_DELAY_MS = 5000;

  const entries: VaultWorklistEntry[] = useMemo(() => {
    return (items ?? [])
      .filter((item) => !pendingDeletes.has(item.itemId))
      .map((item) => toVaultWorklistEntry(item));
  }, [items, pendingDeletes]);

  const [entryQuery, setEntryQuery] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [entryDraft, setEntryDraft] = useState<EntryDraft>(() => createEmptyDraft());
  const [selectedProvider, setSelectedProvider] = useState<ProviderCatalogItem | null>(null);
  const [entryNotice, setEntryNotice] = useState("");

  const toast = useToast();
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);
  const lastItemCountRef = useRef<number | null>(null);

  const isLoading = status === "loading" && items === null;
  const isEmpty = items !== null && items.length === 0;
  const showStaleNotice = itemsError?.kind === "stale";

  useEffect(() => {
    if (itemsError?.kind === "not_onboarded") {
      router.replace("/onboarding");
    }
  }, [itemsError, router]);

  useEffect(() => {
    if (!rootKeyState) {
      router.replace("/unlock");
    }
  }, [rootKeyState, router]);

  // Clear the highlight after 1.5 s.
  useEffect(() => {
    if (!highlightItemId) return;
    const timer = setTimeout(() => setHighlightItemId(null), 1500);
    return () => clearTimeout(timer);
  }, [highlightItemId]);

  // Scroll the highlighted card into view.
  useEffect(() => {
    if (!highlightItemId) return;
    const el = document.querySelector(`[data-item-id="${CSS.escape(highlightItemId)}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightItemId]);

  // When items.length grows (a new entry was added by `create`), highlight the newest item.
  // The hook prepends new items so items[0] is the most recent.
  useEffect(() => {
    const len = items?.length ?? 0;
    if (lastItemCountRef.current === null) {
      lastItemCountRef.current = len;
      return;
    }
    if (len > lastItemCountRef.current && items && items.length > 0) {
      setHighlightItemId(items[0].itemId);
    }
    lastItemCountRef.current = len;
  }, [items]);

  // Clean up all pending commit timers on unmount.
  useEffect(() => {
    const timers = commitTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const visibleEntries = useMemo(() => {
    const needle = entryQuery.trim().toLowerCase();
    if (!needle) {
      return entries;
    }
    return entries.filter((entry) =>
      [entry.displayName, entry.loginUrl, entry.emailUsed, entry.username, entry.passwordLocationHint, entry.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [entries, entryQuery]);

  const breakdown = useMemo(() => {
    const acc: Record<LifecycleStatus, number> = {
      aktiv: 0,
      stillgelegt: 0,
      "anbieter-informiert": 0,
      geloescht: 0,
    };
    for (const entry of entries) {
      acc[entry.status] += 1;
    }
    return acc;
  }, [entries]);

  if (!rootKeyState) {
    return <p className="vault-locked">{t("locked")}</p>;
  }

  function handleProviderSelect(provider: ProviderCatalogItem) {
    setSelectedProvider(provider);
    setEntryDraft((current) => ({
      ...current,
      displayName: provider.name,
      loginUrl: provider.loginUrl,
    }));
  }

  function handleDraftChange(next: EntryDraft) {
    if (selectedProvider && next.displayName !== selectedProvider.name) {
      setSelectedProvider(null);
    }
    setEntryDraft(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const now = new Date();
      if (editingItemId) {
        const existingItem = findItem(items, editingItemId);
        if (!existingItem) throw new Error(t("errorEntryRemoved"));
        const input = createEntryInput(entryDraft, {
          providerId: existingItem.entry.providerId,
          tags: existingItem.entry.tags,
        });
        await update(existingItem, input);
        toast.show({ variant: "success", message: t("toastUpdated", { name: input.displayName }) });
        setHighlightItemId(existingItem.itemId);
        setEntryNotice("");
      } else {
        const input = createEntryInput(
          entryDraft,
          selectedProvider
            ? { providerId: selectedProvider.id, tags: [selectedProvider.category] }
            : { providerId: "custom-provider", tags: [] },
        );
        await create(input);
        toast.show({ variant: "success", message: t("toastAdded", { name: input.displayName }) });
        // Highlight set by the items-length effect (newest item is items[0]).
        setEntryNotice("");
      }
      publishVaultUpdated(now);
      clearEntryForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toastSaveFailed");
      toast.show({ variant: "error", message });
      setEntryNotice(message);
    }
  }

  function startEditing(entry: VaultWorklistEntry) {
    setEditingItemId(entry.itemId);
    setSelectedProvider(null);
    setEntryDraft(createDraftFromEntry(entry));
    setEntryNotice(t("editModeNotice"));
    document.getElementById("entry-form")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function cancelEditing() {
    clearEntryForm();
    setEntryNotice(t("cancelNotice"));
  }

  function handleStatusChange(entry: VaultWorklistEntry, status: LifecycleStatus) {
    const item = findItem(items, entry.itemId);
    if (!item) return;
    if (entry.status === status) return;

    void (async () => {
      try {
        await update(item, { ...item.entry, lifecycleStatus: status });
        publishVaultUpdated(new Date());
        setHighlightItemId(item.itemId);
        toast.show({
          variant: "success",
          message: t("toastStatusChanged", { name: entry.displayName, status: tLife(status) }),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : t("toastStatusFailed");
        toast.show({ variant: "error", message });
      }
    })();
  }

  function handleDeleteEntry(entry: VaultWorklistEntry) {
    const item = findItem(items, entry.itemId);
    if (!item) return;
    if (pendingDeletes.has(item.itemId) || commitTimersRef.current.has(item.itemId)) return;

    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.add(item.itemId);
      return next;
    });

    const commit = () => {
      commitTimersRef.current.delete(item.itemId);
      void (async () => {
        try {
          await remove(item);
        } catch (e) {
          const message = e instanceof Error ? e.message : t("toastDeleteFailed");
          toast.show({ variant: "error", message });
        } finally {
          setPendingDeletes((prev) => {
            const next = new Set(prev);
            next.delete(item.itemId);
            return next;
          });
        }
      })();
    };

    const cancel = () => {
      const timer = commitTimersRef.current.get(item.itemId);
      if (timer) clearTimeout(timer);
      commitTimersRef.current.delete(item.itemId);
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(item.itemId);
        return next;
      });
    };

    const timer = setTimeout(commit, COMMIT_DELAY_MS);
    commitTimersRef.current.set(item.itemId, timer);

    publishVaultUpdated(new Date());
    if (editingItemId === item.itemId) clearEntryForm();
    toast.show({
      variant: "info",
      message: t("toastDeleted", { name: entry.displayName }),
      undo: { label: t("toastUndo"), onUndo: cancel },
    });
  }

  function clearEntryForm() {
    setEditingItemId(null);
    setSelectedProvider(null);
    setEntryDraft(createEmptyDraft());
  }

  return (
    <main className="workspace" id="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("heading")}</h1>
        </div>
        <div className="header-actions">
          <Link className="button secondary" href="/vault/settings">
            <Settings aria-hidden="true" />
            {t("settingsButton")}
          </Link>
          <a className="button" href="#entry-form" role="button">
            <Plus aria-hidden="true" />
            {t("addEntryButton")}
          </a>
        </div>
      </header>

      <VaultSummary entryCount={entries.length} activeCount={breakdown.aktiv} breakdown={breakdown} />

      {showStaleNotice ? (
        <div className="workspace-notice" role="alert" data-testid="vault-stale-notice">
          <p>{t("staleNotice")}</p>
          <button type="button" className="button secondary" onClick={() => { void refresh(); }}>
            {t("staleReload")}
          </button>
        </div>
      ) : null}
      {isLoading ? (
        <p className="workspace-loading" data-testid="vault-loading">{t("loading")}</p>
      ) : null}
      {isEmpty ? (
        <p className="workspace-empty" data-testid="vault-empty">{t("empty")}</p>
      ) : null}

      <div className="operations-grid single">
        <VaultEntriesList
          entries={visibleEntries}
          query={entryQuery}
          onQueryChange={setEntryQuery}
          onEdit={startEditing}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteEntry}
          highlightItemId={highlightItemId}
        />
      </div>

      <VaultEntryForm
        mode={editingItemId ? "edit" : "create"}
        draft={entryDraft}
        notice={entryNotice}
        onDraftChange={handleDraftChange}
        onProviderSelect={handleProviderSelect}
        onSubmit={handleSubmit}
        onCancel={cancelEditing}
      />
    </main>
  );
}

function findItem(items: DecryptedVaultItem[] | null, itemId: string): DecryptedVaultItem | undefined {
  return items?.find((item) => item.itemId === itemId);
}

export function createEmptyDraft(): EntryDraft {
  return {
    displayName: "",
    loginUrl: "",
    emailUsed: "",
    username: "",
    passwordLocationHint: "",
    notes: "",
    lifecycleStatus: "aktiv",
  };
}

function createDraftFromEntry(entry: VaultWorklistEntry): EntryDraft {
  return {
    displayName: entry.displayName,
    loginUrl: entry.loginUrl,
    emailUsed: entry.emailUsed ?? "",
    username: entry.username ?? "",
    passwordLocationHint: entry.passwordLocationHint ?? "",
    notes: entry.notes ?? "",
    lifecycleStatus: entry.status,
  };
}

export function createEntryInput(
  draft: EntryDraft,
  binding: { providerId: string; tags: string[] },
): VaultEntry {
  return {
    providerId: binding.providerId,
    displayName: draft.displayName.trim(),
    loginUrl: draft.loginUrl.trim(),
    emailUsed: draft.emailUsed.trim(),
    username: draft.username.trim(),
    passwordLocationHint: draft.passwordLocationHint.trim(),
    notes: draft.notes.trim(),
    tags: binding.tags,
    lifecycleStatus: draft.lifecycleStatus,
  };
}

function publishVaultUpdated(date: Date): void {
  if (typeof window === "undefined") {
    return;
  }
  const isoDate = date.toISOString();
  window.localStorage.setItem(LAST_VAULT_UPDATED_STORAGE_KEY, isoDate);
  window.dispatchEvent(new CustomEvent(VAULT_UPDATED_EVENT, { detail: { updatedAt: isoDate } }));
}
