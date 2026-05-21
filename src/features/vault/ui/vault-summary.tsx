import { useTranslations } from "next-intl";

import type { LifecycleStatus } from "../domain/vault-entry";

export type VaultSummaryProps = {
  entryCount: number;
  activeCount: number;
  breakdown: Record<LifecycleStatus, number>;
};

const NON_ACTIVE_ORDER: LifecycleStatus[] = ["stillgelegt", "anbieter-informiert", "geloescht"];

export function VaultSummary({ entryCount, activeCount, breakdown }: VaultSummaryProps) {
  const t = useTranslations("vault.summary");
  const tLife = useTranslations("vault.lifecycle");
  const nonActive = NON_ACTIVE_ORDER.filter((status) => breakdown[status] > 0).map(
    (status) => `${breakdown[status]} ${tLife(status).toLowerCase()}`,
  );

  return (
    <section className="summary-grid" id="vault" aria-label={t("ariaLabel")}>
      <div className="summary-tile">
        <span className="tile-label">{t("labelEntries")}</span>
        <strong>{entryCount}</strong>
        <span>{t("labelDecrypted")}</span>
      </div>
      <div className="summary-tile attention">
        <span className="tile-label">{t("labelActive")}</span>
        <strong>{activeCount}</strong>
        <span>{nonActive.length > 0 ? nonActive.join(" · ") : t("allActive")}</span>
      </div>
    </section>
  );
}
