import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import type { LifecycleStatus } from "../domain/vault-entry";
import type { VaultWorklistEntry } from "../domain/vault-worklist";
import { VaultEntryCard } from "./vault-entry-card";

export type VaultEntriesListProps = {
  entries: VaultWorklistEntry[];
  query: string;
  onQueryChange: (value: string) => void;
  onEdit: (entry: VaultWorklistEntry) => void;
  onStatusChange: (entry: VaultWorklistEntry, status: LifecycleStatus) => void;
  onDelete: (entry: VaultWorklistEntry) => void;
  highlightItemId?: string | null;
};

export function VaultEntriesList({
  entries,
  query,
  onQueryChange,
  onEdit,
  onStatusChange,
  onDelete,
  highlightItemId,
}: VaultEntriesListProps) {
  const t = useTranslations("vault.entriesList");
  return (
    <section className="surface-card vault-list" aria-labelledby="entries-title">
      <div className="section-title">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="entries-title">{t("heading")}</h2>
        </div>
        <div className="search-box">
          <Search aria-hidden="true" />
          <input
            aria-label={t("searchAriaLabel")}
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
      </div>
      <div className="entry-list" role="list" aria-label={t("listAriaLabel")}>
        {entries.map((entry) => (
          <VaultEntryCard
            key={entry.itemId}
            entry={entry}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            highlight={entry.itemId === highlightItemId}
          />
        ))}
      </div>
    </section>
  );
}
