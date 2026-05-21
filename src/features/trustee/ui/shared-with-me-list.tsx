"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { fetchSharedWithMe, type SharedVaultSummary } from "@/features/trustee/data/share-client";

export function SharedWithMeList() {
  const t = useTranslations("trustee.shared");
  const [shares, setShares] = useState<SharedVaultSummary[]>([]);

  useEffect(() => {
    void fetchSharedWithMe()
      .then(setShares)
      .catch(() => {});
  }, []);

  return (
    <main className="workspace" id="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t("listEyebrow")}</p>
          <h1>{t("listHeading")}</h1>
          <p className="lead-heading">{t("listLead")}</p>
        </div>
      </header>

      {shares.length === 0 ? (
        <p className="shared-empty">{t("empty")}</p>
      ) : (
        <ul className="shared-list">
          {shares.map((s) => (
            <li key={s.vaultId} className="shared-list-item">
              <span>{t("ownerLabel", { owner: s.ownerName })}</span>
              <Link className="button" href={`/shared/${s.vaultId}`}>
                {t("open")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
