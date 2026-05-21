"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { entriesToCsv } from "../domain/vault-csv";
import { csvToEncryptedZip } from "../domain/vault-csv-zip";
import { toVaultWorklistEntry } from "../domain/vault-worklist";
import { useRootKey } from "@/features/vault/state/use-root-key";
import { useVaultItems } from "@/features/vault/state/use-vault-items";
import type { VaultMember } from "../domain/vault-permissions";

import { TrusteesSection } from "@/features/trustee/ui/trustees-section";

import { AccountDeletionSection } from "./account-deletion-section";
import { ManagePasskeysContainer } from "./manage-passkeys-container";
import { VaultExportForm } from "./vault-export-form";

export type VaultSettingsProps = {
  vaultAdmin: VaultMember;
};

export function VaultSettings({ vaultAdmin }: VaultSettingsProps) {
  const t = useTranslations("vault.settings");
  const router = useRouter();
  const rootKeyState = useRootKey();
  const { items } = useVaultItems({
    rootKey: rootKeyState?.rootKey ?? null,
    vaultId: rootKeyState?.vaultId ?? null,
    ownerId: vaultAdmin.userId,
  });

  const [exportPassphrase, setExportPassphrase] = useState("");
  const [notice, setNotice] = useState(t("noticeDefault"));
  // Gate the irreversible account deletion behind "export your data first".
  const [hasExported, setHasExported] = useState(false);

  useEffect(() => {
    if (!rootKeyState) {
      router.replace("/unlock");
    }
  }, [rootKeyState, router]);

  if (!rootKeyState) {
    return <p className="vault-locked">{t("locked")}</p>;
  }

  async function handleExportCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (exportPassphrase.trim().length < 8) {
      setNotice(t("noticeBlocked"));
      return;
    }
    try {
      const entries = (items ?? []).map((item) => toVaultWorklistEntry(item));
      const stamp = new Date().toISOString().slice(0, 10);
      const zipBytes = await csvToEncryptedZip({
        csv: entriesToCsv(entries),
        password: exportPassphrase,
        entryName: `nachklang-export-${stamp}.csv`,
      });
      const blob = new Blob([new Uint8Array(zipBytes)], { type: "application/zip" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `nachklang-export-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setNotice(t("noticeReady"));
      setHasExported(true);
    } catch {
      setNotice(t("noticeBlocked"));
    }
  }

  return (
    <main className="workspace" id="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("heading")}</h1>
          <p className="lead-heading">{t("lead")}</p>
        </div>
      </header>

      <ManagePasskeysContainer vaultId={rootKeyState.vaultId} />

      <TrusteesSection />

      <VaultExportForm
        exportPassphrase={exportPassphrase}
        notice={notice}
        onExportPassphraseChange={setExportPassphrase}
        onExportCsv={handleExportCsv}
      />

      <AccountDeletionSection requireExport hasExported={hasExported} />

      <p className="settings-foot">
        <Link href="/vault">{t("backLink")}</Link>
      </p>
    </main>
  );
}
