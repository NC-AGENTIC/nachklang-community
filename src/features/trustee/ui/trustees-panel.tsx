"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";

import type { AccessLogEntry } from "@/features/trustee/data/share-client";

export type TrusteeShareView = {
  id: string;
  label: string;
  status: string;
  fingerprint: string;
  trusteePublicKey: string;
  createdAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
};

export type TrusteesPanelProps = {
  shares: TrusteeShareView[];
  onInvite: (email: string, label: string) => Promise<void> | void;
  onSeal: (share: TrusteeShareView) => Promise<void> | void;
  onRevoke: (share: TrusteeShareView) => Promise<void> | void;
  onPurge: (share: TrusteeShareView) => Promise<void> | void;
  onLoadAccessLog: (shareId: string) => Promise<AccessLogEntry[]>;
  inviteNotice: string | null;
  inviteLink: string | null;
  busy: boolean;
  error: string | null;
};

function statusKey(status: string): "statusPendingVerify" | "statusActive" | "statusRevoked" {
  if (status === "active") return "statusActive";
  if (status === "revoked") return "statusRevoked";
  return "statusPendingVerify";
}

type RowProps = {
  share: TrusteeShareView;
  onSeal: TrusteesPanelProps["onSeal"];
  onRevoke: TrusteesPanelProps["onRevoke"];
  onPurge: TrusteesPanelProps["onPurge"];
  onLoadAccessLog: TrusteesPanelProps["onLoadAccessLog"];
};

function TrusteeRow({ share, onSeal, onRevoke, onPurge, onLoadAccessLog }: RowProps) {
  const t = useTranslations("trustee.owner");
  const format = useFormatter();
  const [busy, setBusy] = useState<null | "seal" | "revoke" | "purge">(null);
  const [log, setLog] = useState<AccessLogEntry[] | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  function fmtDate(iso: string): string {
    return format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
  }

  async function handleSeal() {
    setBusy("seal");
    try {
      await onSeal(share);
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke() {
    setBusy("revoke");
    try {
      await onRevoke(share);
    } finally {
      setBusy(null);
    }
  }

  async function handlePurge() {
    setBusy("purge");
    try {
      await onPurge(share);
    } finally {
      setBusy(null);
    }
  }

  async function toggleLog() {
    if (logOpen) {
      setLogOpen(false);
      return;
    }
    if (!log) {
      const entries = await onLoadAccessLog(share.id);
      setLog(entries);
    }
    setLogOpen(true);
  }

  return (
    <li className="trustees-item">
      <div className="trustees-item-head">
        <span className="trustees-item-label">{share.label}</span>
        <span className={`trustees-status trustees-status--${share.status}`}>
          {t(statusKey(share.status))}
        </span>
      </div>

      <p className="trustees-meta">{t("createdAt", { date: fmtDate(share.createdAt) })}</p>

      {share.status === "pending_verify" ? (
        <>
          <div className="trustees-fingerprint">
            <span className="trustees-fingerprint-label">{t("fingerprintLabel")}</span>
            <code>{share.fingerprint}</code>
          </div>
          <p className="trustees-fingerprint-hint">{t("fingerprintHint")}</p>
        </>
      ) : null}

      {share.status === "active" ? (
        <p className="trustees-meta">
          {share.lastAccessedAt
            ? `${t("lastAccess", { date: fmtDate(share.lastAccessedAt) })} · ${t("accessCount", { count: share.accessCount })}`
            : t("neverAccessed")}
        </p>
      ) : null}

      <div className="trustees-actions">
        {share.status === "pending_verify" ? (
          <button className="button" type="button" onClick={handleSeal} disabled={busy !== null}>
            {busy === "seal" ? t("sealBusy") : t("seal")}
          </button>
        ) : null}
        {share.status === "active" ? (
          <button className="button secondary" type="button" onClick={toggleLog}>
            {logOpen ? t("hideLog") : t("showLog")}
          </button>
        ) : null}
        {share.status !== "revoked" ? (
          <button className="button danger" type="button" onClick={handleRevoke} disabled={busy !== null}>
            {busy === "revoke" ? t("revokeBusy") : t("revoke")}
          </button>
        ) : (
          <button className="button danger" type="button" onClick={handlePurge} disabled={busy !== null}>
            {busy === "purge" ? t("purgeBusy") : t("purge")}
          </button>
        )}
      </div>

      {logOpen ? (
        log && log.length > 0 ? (
          <ul className="trustees-access-log">
            {log.map((entry, i) => (
              <li key={i}>
                <span>{fmtDate(entry.accessedAt)}</span>
                {entry.ipAddress ? <code>{entry.ipAddress}</code> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="trustees-meta">{t("logEmpty")}</p>
        )
      ) : null}
    </li>
  );
}

export function TrusteesPanel({
  shares,
  onInvite,
  onSeal,
  onRevoke,
  onPurge,
  onLoadAccessLog,
  inviteNotice,
  inviteLink,
  busy,
  error,
}: TrusteesPanelProps) {
  const t = useTranslations("trustee.owner");
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onInvite(email.trim(), label.trim());
    setEmail("");
    setLabel("");
  }

  async function handleCopy() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const canSubmit = !busy && email.trim().length > 0 && label.trim().length > 0;

  return (
    <section className="surface-card trustees-panel" aria-labelledby="trustees-heading">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">{t("heading")}</p>
          <h2 id="trustees-heading">{t("listHeading")}</h2>
        </div>
        <span className="badge">{shares.length}</span>
      </div>
      <p className="notice-line trustees-lead">{t("lead")}</p>

      <form className="trustees-invite" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="trustee-email">{t("emailLabel")}</label>
          <input
            id="trustee-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="trustee-label">{t("nameLabel")}</label>
          <input
            id="trustee-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <button className="button full-width" type="submit" disabled={!canSubmit}>
          <UserPlus aria-hidden="true" />
          {busy ? t("submitBusy") : t("submit")}
        </button>
      </form>

      {inviteNotice ? (
        <p className="notice-line trustees-notice" aria-live="polite">
          {inviteNotice}
        </p>
      ) : null}
      {inviteLink ? (
        <div className="trustees-link">
          <a className="trustees-link-url" href={inviteLink} target="_blank" rel="noopener noreferrer">
            {inviteLink}
          </a>
          <button className="button secondary" type="button" onClick={handleCopy}>
            {copied ? t("copied") : t("copyLink")}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="notice-line trustees-error" role="alert">
          {error}
        </p>
      ) : null}

      {shares.length === 0 ? (
        <p className="trustees-empty">{t("empty")}</p>
      ) : (
        <ul className="trustees-list">
          {shares.map((share) => (
            <TrusteeRow
              key={share.id}
              share={share}
              onSeal={onSeal}
              onRevoke={onRevoke}
              onPurge={onPurge}
              onLoadAccessLog={onLoadAccessLog}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
