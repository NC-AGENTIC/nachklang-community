import { LockKeyhole, X } from "lucide-react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  LIFECYCLE_STATUSES,
  type LifecycleStatus,
  type ProviderCatalogItem,
} from "../domain/vault-entry";
import { VaultProviderCombobox } from "./vault-provider-combobox";

export type EntryDraft = {
  displayName: string;
  loginUrl: string;
  emailUsed: string;
  username: string;
  passwordLocationHint: string;
  notes: string;
  lifecycleStatus: LifecycleStatus;
};

export type VaultEntryFormProps = {
  mode: "create" | "edit";
  draft: EntryDraft;
  notice: string;
  onDraftChange: (next: EntryDraft) => void;
  onProviderSelect: (provider: ProviderCatalogItem) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function VaultEntryForm({ mode, draft, notice, onDraftChange, onProviderSelect, onSubmit, onCancel }: VaultEntryFormProps) {
  const t = useTranslations("vault.entryForm");
  const tLife = useTranslations("vault.lifecycle");
  const editing = mode === "edit";
  return (
    <section className="surface-card entry-panel" id="entry-form" aria-labelledby="entry-title">
      <div className="section-title">
        <div>
          <p className="eyebrow">{editing ? t("eyebrowEdit") : t("eyebrowCreate")}</p>
          <h2 id="entry-title">{editing ? t("titleEdit") : t("titleCreate")}</h2>
        </div>
        <span className="badge">{t("badge")}</span>
      </div>
      <form className="entry-form" onSubmit={onSubmit}>
        {editing ? (
          <div className="field">
            <label htmlFor="displayName">{t("labelDisplayName")}</label>
            <input
              id="displayName"
              name="displayName"
              value={draft.displayName}
              onChange={(event) => onDraftChange({ ...draft, displayName: event.target.value })}
              required
            />
          </div>
        ) : (
          <VaultProviderCombobox
            id="displayName"
            label={t("labelDisplayName")}
            value={draft.displayName}
            onValueChange={(value) => onDraftChange({ ...draft, displayName: value })}
            onSelect={onProviderSelect}
            required
          />
        )}
        <div className="field">
          <label htmlFor="loginUrl">{t("labelLoginUrl")}</label>
          <input
            id="loginUrl"
            name="loginUrl"
            value={draft.loginUrl}
            inputMode="url"
            onChange={(event) => onDraftChange({ ...draft, loginUrl: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="emailUsed">{t("labelEmailUsed")}</label>
          <input
            id="emailUsed"
            name="emailUsed"
            inputMode="email"
            placeholder="name@example.org"
            value={draft.emailUsed}
            onChange={(event) => onDraftChange({ ...draft, emailUsed: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="username">{t("labelUsername")}</label>
          <input
            id="username"
            name="username"
            placeholder={t("usernameOptional")}
            value={draft.username}
            onChange={(event) => onDraftChange({ ...draft, username: event.target.value })}
          />
        </div>
        <div className="field wide">
          <label htmlFor="passwordLocationHint">{t("labelPasswordHint")}</label>
          <textarea
            id="passwordLocationHint"
            name="passwordLocationHint"
            placeholder={t("passwordHintPlaceholder")}
            value={draft.passwordLocationHint}
            onChange={(event) => onDraftChange({ ...draft, passwordLocationHint: event.target.value })}
            aria-describedby="passwordLocationHint-help"
          />
          <p id="passwordLocationHint-help" className="field-help">
            {t.rich("passwordHintHelp", {
              strong_where: (chunks) => <strong>{chunks}</strong>,
              strong_nopassword: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
        <div className="field wide">
          <label htmlFor="notes">{t("labelNotes")}</label>
          <textarea
            id="notes"
            name="notes"
            placeholder={t("notesPlaceholder")}
            value={draft.notes}
            onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })}
          />
        </div>
        {editing ? (
          <div className="field">
            <label htmlFor="lifecycleStatus">{t("labelStatus")}</label>
            <select
              id="lifecycleStatus"
              name="lifecycleStatus"
              value={draft.lifecycleStatus}
              onChange={(event) =>
                onDraftChange({ ...draft, lifecycleStatus: event.target.value as LifecycleStatus })
              }
            >
              {LIFECYCLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {tLife(status)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="form-actions">
          {editing ? (
            <button className="button secondary" type="button" onClick={onCancel}>
              <X aria-hidden="true" />
              {t("cancelButton")}
            </button>
          ) : null}
          <button className="button submit-button" type="submit">
            <LockKeyhole aria-hidden="true" />
            {editing ? t("saveEditButton") : t("saveCreateButton")}
          </button>
        </div>
        <p className="notice-line form-notice" aria-live="polite">
          {notice}
        </p>
      </form>
    </section>
  );
}
