"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { deleteAccount } from "@/features/account/data/account-client";
import { authClient } from "@/lib/auth-client";

type Phase = "idle" | "notice" | "confirm";

// Irreversible account deletion with offboarding safeguards: a clear legal "nothing is restorable"
// notice, an acknowledgement checkbox, and a typed confirmation phrase. Vault owners must export
// their data first (requireExport); trustee-only members (no vault) just get the warning + confirm.
export function AccountDeletionSection({
  requireExport = true,
  hasExported = false,
}: {
  requireExport?: boolean;
  hasExported?: boolean;
}) {
  const t = useTranslations("vault.deleteAccount");
  const [phase, setPhase] = useState<Phase>("idle");
  const [ack, setAck] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = requireExport && !hasExported;
  const CONFIRM_WORD = t("confirmWord");

  async function handleDelete() {
    if (confirmText.trim() !== CONFIRM_WORD) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      await authClient.signOut().catch(() => {});
      // Full reload to the public landing — the session + all in-memory keys are gone.
      window.location.href = "/";
    } catch {
      setError(t("error"));
      setBusy(false);
    }
  }

  return (
    <section className="surface-card danger-zone" aria-labelledby="delete-account-title">
      <div className="section-title">
        <div>
          <p className="eyebrow danger-zone-eyebrow">{t("eyebrow")}</p>
          <h2 id="delete-account-title">{t("heading")}</h2>
        </div>
      </div>
      <p className="notice-line">{t("lead")}</p>

      {blocked ? (
        <p className="danger-zone-gate">{t("exportFirst")}</p>
      ) : phase === "idle" ? (
        <button className="button danger full-width" type="button" onClick={() => setPhase("notice")}>
          {t("start")}
        </button>
      ) : phase === "notice" ? (
        <div className="danger-zone-step">
          <div className="danger-zone-legal" role="note">
            <p>{t("legal1")}</p>
            <ul>
              <li>{t("legalVaults")}</li>
              <li>{t("legalShares")}</li>
              <li>{t("legalNoRestore")}</li>
            </ul>
          </div>
          <label className="danger-zone-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>{t("ackLabel")}</span>
          </label>
          <div className="danger-zone-actions">
            <button className="button secondary" type="button" onClick={() => setPhase("idle")}>
              {t("cancel")}
            </button>
            <button
              className="button danger"
              type="button"
              disabled={!ack}
              onClick={() => setPhase("confirm")}
            >
              {t("continue")}
            </button>
          </div>
        </div>
      ) : (
        <div className="danger-zone-step">
          <p className="danger-zone-final">{t("confirmLead", { word: CONFIRM_WORD })}</p>
          <div className="field">
            <label htmlFor="delete-confirm">{t("confirmInputLabel", { word: CONFIRM_WORD })}</label>
            <input
              id="delete-confirm"
              type="text"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <div className="danger-zone-actions">
            <button className="button secondary" type="button" onClick={() => setPhase("idle")} disabled={busy}>
              {t("cancel")}
            </button>
            <button
              className="button danger"
              type="button"
              disabled={busy || confirmText.trim() !== CONFIRM_WORD}
              onClick={handleDelete}
            >
              {busy ? t("deleting") : t("deleteFinal")}
            </button>
          </div>
          {error ? (
            <p className="notice-line trustees-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
