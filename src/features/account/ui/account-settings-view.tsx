"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { AccountDeletionSection } from "@/features/vault/ui/account-deletion-section";

// Account-level settings for trustee-only members (no personal vault). Currently just the
// irreversible account deletion — no export gate, since they hold no vaults of their own.
export function AccountSettingsView() {
  const t = useTranslations("account.settings");
  return (
    <main className="workspace" id="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("heading")}</h1>
          <p className="lead-heading">{t("lead")}</p>
        </div>
      </header>

      <AccountDeletionSection requireExport={false} />

      <p className="settings-foot">
        <Link href="/shared">{t("backLink")}</Link>
      </p>
    </main>
  );
}
