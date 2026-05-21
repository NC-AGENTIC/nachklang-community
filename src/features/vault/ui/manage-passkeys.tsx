"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export type ManagedPasskey = {
  id: string;
  name?: string | null;
  credentialID?: string;
};

type Props = {
  passkeys: ManagedPasskey[];
  onAddThisDevice: () => Promise<void> | void;
  onRemove: (credentialID: string) => Promise<void> | void;
  onRename: (id: string, name: string) => Promise<void> | void;
};

export function ManagePasskeys({ passkeys, onAddThisDevice, onRemove, onRename }: Props) {
  const t = useTranslations("vault.managePasskeys");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const onlyOne = passkeys.length <= 1;

  async function runGuarded(action: () => Promise<void> | void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  function startEditing(pk: ManagedPasskey) {
    setEditingId(pk.id);
    setDraftName(pk.name ?? "");
  }

  async function saveRename(id: string) {
    const name = draftName.trim();
    if (!name) return;
    await runGuarded(async () => {
      await onRename(id, name);
      setEditingId(null);
    });
  }

  return (
    <section className="manage-passkeys" aria-labelledby="manage-passkeys-heading">
      <h2 id="manage-passkeys-heading">{t("heading")}</h2>
      <p className="manage-passkeys__hint">{t("hint")}</p>

      <ul className="manage-passkeys__list">
        {passkeys.map((pk) => (
          <li key={pk.id} className="manage-passkeys__item">
            {editingId === pk.id ? (
              <form
                className="manage-passkeys__rename"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveRename(pk.id);
                }}
              >
                <label className="sr-only" htmlFor={`pk-name-${pk.id}`}>
                  {t("renameLabel")}
                </label>
                <input
                  id={`pk-name-${pk.id}`}
                  className="manage-passkeys__rename-input"
                  value={draftName}
                  maxLength={60}
                  autoFocus
                  onChange={(event) => setDraftName(event.target.value)}
                />
                <button type="submit" className="button" disabled={busy || !draftName.trim()}>
                  {t("renameSave")}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setEditingId(null)}
                >
                  {t("renameCancel")}
                </button>
              </form>
            ) : (
              <>
                <span className="manage-passkeys__name">{pk.name ?? t("unnamed")}</span>
                <div className="manage-passkeys__actions">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => startEditing(pk)}
                  >
                    {t("renameButton")}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy || onlyOne}
                    onClick={() => runGuarded(() => onRemove(pk.credentialID ?? pk.id))}
                  >
                    {t("removeButton")}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="button full-width"
        disabled={busy}
        onClick={() => runGuarded(onAddThisDevice)}
      >
        {busy ? t("addBusy") : t("addButton")}
      </button>
      <p className="notice-line" role={error ? "alert" : undefined} aria-live="polite">
        {error ?? ""}
      </p>
    </section>
  );
}
