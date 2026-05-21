"use client";

import { ChevronDown, Pencil, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { LIFECYCLE_STATUSES, type LifecycleStatus } from "../domain/vault-entry";
import type { VaultWorklistEntry } from "../domain/vault-worklist";

export type VaultEntryCardProps = {
  entry: VaultWorklistEntry;
  onEdit: (entry: VaultWorklistEntry) => void;
  onStatusChange: (entry: VaultWorklistEntry, status: LifecycleStatus) => void;
  onDelete: (entry: VaultWorklistEntry) => void;
  highlight?: boolean;
};

export function VaultEntryCard({ entry, onEdit, onStatusChange, onDelete, highlight }: VaultEntryCardProps) {
  const t = useTranslations("vault.entryCard");
  const tLife = useTranslations("vault.lifecycle");
  // Collapsed by default so a large vault stays a compact, scannable list; expand one entry to see
  // its full details.
  const [expanded, setExpanded] = useState(false);
  return (
    <article
      className={`entry-card${highlight ? " entry-card--highlight" : ""}${expanded ? " entry-card--expanded" : ""}`}
      aria-label={t("ariaLabel", { name: entry.displayName })}
      data-item-id={entry.itemId}
    >
      <div className="entry-card-header">
        <button
          type="button"
          className={`entry-card-title${entry.status === "geloescht" ? " entry-card-title--deleted" : ""}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown className="entry-card-chevron" aria-hidden="true" />
          <strong>{entry.displayName}</strong>
          <span>{entry.tags.join(", ")}</span>
        </button>
        <div className="entry-card-state">
          <span className="status-badge" data-status={entry.status}>
            {tLife(entry.status)}
          </span>
          {entry.notes ? (
            <span
              className="entry-note"
              tabIndex={0}
              role="note"
              title={entry.notes}
              aria-label={t("noteAria", { name: entry.displayName, note: entry.notes })}
            >
              <StickyNote aria-hidden="true" />
            </span>
          ) : null}
          <small className="revision-label">{t("revisionLabel", { rev: entry.revision })}</small>
        </div>
        <div className="row-actions" aria-label={t("ariaActions", { name: entry.displayName })}>
          <label className="status-select">
            <span className="sr-only">{t("ariaStatusChange", { name: entry.displayName })}</span>
            <select
              aria-label={t("ariaStatusChange", { name: entry.displayName })}
              value={entry.status}
              onChange={(event) => onStatusChange(entry, event.target.value as LifecycleStatus)}
            >
              {LIFECYCLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {tLife(status)}
                </option>
              ))}
            </select>
          </label>
          <button aria-label={t("ariaEdit", { name: entry.displayName })} className="icon-button" type="button" onClick={() => onEdit(entry)}>
            <Pencil aria-hidden="true" />
          </button>
          <button aria-label={t("ariaDelete", { name: entry.displayName })} className="icon-button danger" type="button" onClick={() => onDelete(entry)}>
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="entry-card-details">
          <div className="entry-detail">
            <span>{t("labelLogin")}</span>
            <a href={entry.loginUrl}>{entry.loginUrl.replace("https://", "")}</a>
          </div>
          <div className="entry-detail">
            <span>{t("labelIdentity")}</span>
            <strong>{entry.emailUsed || t("noEmail")}</strong>
            <small>{entry.username || t("noUsername")}</small>
          </div>
          <div className="entry-detail wide" data-entry-field="password-hint">
            <span>{t("labelPasswordHint")}</span>
            <p>{entry.passwordLocationHint || t("noPasswordHint")}</p>
          </div>
          <div className="entry-detail wide" data-entry-field="notes">
            <span>{t("labelNotes")}</span>
            <p>{entry.notes || t("noNotes")}</p>
          </div>
          <div className="entry-detail">
            <span>{t("labelStatus")}</span>
            <strong>{tLife(entry.status)}</strong>
            <small>{t("lastChanged", { date: new Date(entry.updatedAt).toLocaleDateString("de-DE") })}</small>
          </div>
        </div>
      ) : null}
    </article>
  );
}
