"use client";

import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { DecryptedVaultItem } from "@/features/vault/data/vault-items-client";
import { LIFECYCLE_STATUSES, type LifecycleStatus } from "@/features/vault/domain/vault-entry";

// "aktiv" is the owner's baseline and is set by the owner only; a trustee can only move an account
// forward through the handling states.
const TRUSTEE_STATUS_OPTIONS = LIFECYCLE_STATUSES.filter((s) => s !== "aktiv");

export type SharedVaultPanelProps = {
  entries: DecryptedVaultItem[] | null;
  ownerName: string | null;
  ownerUpdatedAt: string | null;
  statuses: Record<string, LifecycleStatus>;
  locked: boolean;
  loading: boolean;
  onUnlock: () => Promise<void> | void;
  onChangeStatus: (itemId: string, status: LifecycleStatus) => void;
  savingItemId: string | null;
  error: string | null;
};

export function SharedVaultPanel({
  entries,
  ownerName,
  ownerUpdatedAt,
  statuses,
  locked,
  loading,
  onUnlock,
  onChangeStatus,
  savingItemId,
  error,
}: SharedVaultPanelProps) {
  const t = useTranslations("trustee.shared");
  const tLifecycle = useTranslations("vault.lifecycle");
  const format = useFormatter();

  return (
    <main className="workspace" id="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t("viewEyebrow")}</p>
          <h1>{t("viewHeading")}</h1>
          <p className="lead-heading">
            {ownerName ? <span className="shared-owner-badge">{t("ownerBadge", { owner: ownerName })}</span> : null}
            <span className="shared-readonly-badge">{t("readOnly")}</span>
          </p>
          {!locked && ownerUpdatedAt ? (
            <p className="shared-updated">
              {t("ownerUpdated", {
                date: format.dateTime(new Date(ownerUpdatedAt), { dateStyle: "medium", timeStyle: "short" }),
              })}
            </p>
          ) : null}
        </div>
      </header>

      {error === "forbidden" ? <p className="shared-empty">{t("forbidden")}</p> : null}
      {error && error !== "forbidden" ? <p className="shared-empty">{t("error")}</p> : null}

      {locked && !error ? (
        <section className="surface-card">
          <p className="trustees-lead">{t("unlockLead")}</p>
          <button className="button full-width" type="button" onClick={() => void onUnlock()} disabled={loading}>
            {loading ? t("unlockBusy") : t("unlock")}
          </button>
        </section>
      ) : null}

      {!locked && entries && entries.length === 0 ? (
        <p className="shared-empty">{t("entriesEmpty")}</p>
      ) : null}

      {!locked && entries && entries.length > 0 ? (
        <ul className="shared-entries">
          {entries.map((item) => (
            <li key={item.itemId}>
              <details className="shared-entry">
                <summary className="shared-entry-summary">
                  <span className="shared-entry-name">{item.entry.displayName}</span>
                  {statuses[item.itemId] ? (
                    <span className="shared-entry-badge">{tLifecycle(statuses[item.itemId])}</span>
                  ) : null}
                </summary>
                <dl>
                  <dt>{t("fieldLogin")}</dt>
                  <dd>
                    <a href={item.entry.loginUrl} target="_blank" rel="noreferrer noopener">
                      {item.entry.loginUrl}
                    </a>
                  </dd>
                  <dt>{t("fieldStatus")}</dt>
                  <dd>{tLifecycle(item.entry.lifecycleStatus as LifecycleStatus)}</dd>
                  <dt>{t("handlingStatus")}</dt>
                  <dd>
                    <select
                      className="shared-status-select"
                      aria-label={t("handlingStatus")}
                      value={statuses[item.itemId] ?? ""}
                      disabled={savingItemId === item.itemId}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) onChangeStatus(item.itemId, value as LifecycleStatus);
                      }}
                    >
                      <option value="">{t("handlingStatusUnset")}</option>
                      {TRUSTEE_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {tLifecycle(s)}
                        </option>
                      ))}
                    </select>
                    <span className="shared-status-hint">{t("handlingStatusHint")}</span>
                  </dd>
                  <dt>{t("fieldHint")}</dt>
                  <dd>{item.entry.passwordLocationHint || t("fieldEmpty")}</dd>
                  <dt>{t("fieldNotes")}</dt>
                  <dd>{item.entry.notes || t("fieldEmpty")}</dd>
                </dl>
              </details>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="settings-foot">
        <Link href="/shared">{t("back")}</Link>
      </p>
    </main>
  );
}
