"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { fetchAuditEvents, type AuditEvent } from "@/features/audit/data/audit-client";
import { listItems } from "@/features/vault/data/vault-items-client";
import { useRootKey } from "@/features/vault/state/use-root-key";

// Maps a raw action code to a friendly, non-technical i18n message key. Unknown actions fall back
// to a generic line so the log never shows a raw code without context.
const ACTION_KEYS: Record<string, string> = {
  "share.invited": "shareInvited",
  "share.accepted": "shareAccepted",
  "share.accepted.self": "shareAcceptedSelf",
  "share.sealed": "shareSealed",
  "share.revoked": "shareRevoked",
  "share.purged": "sharePurged",
  "vault.read": "vaultRead",
  "item.status_changed": "statusChanged",
  "item.status_changed.self": "statusChangedSelf",
  "user.delete": "userDeleted",
  "Vault.delete": "vaultDeleted",
  "VaultCiphertext.delete": "itemDeleted",
  "VaultShare.delete": "shareDeleted",
  "ShareInvite.delete": "inviteDeleted",
  "UserKeypair.delete": "keypairDeleted",
  "passkey.delete": "passkeyDeleted",
};

export function AuditLog() {
  const t = useTranslations("audit");
  const format = useFormatter();
  const rootKey = useRootKey();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  // itemId → entry name, decrypted CLIENT-SIDE from the viewer's own unlocked vault. The server
  // never sees entry names; if the vault is locked, events fall back to a generic label.
  const [itemNames, setItemNames] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchAuditEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    if (!rootKey) return;
    void listItems(rootKey.rootKey, { vaultId: rootKey.vaultId, ownerId: "" })
      .then((items) => setItemNames(Object.fromEntries(items.map((i) => [i.itemId, i.entry.displayName]))))
      .catch(() => {});
  }, [rootKey]);

  function describe(ev: AuditEvent): string {
    const key = ACTION_KEYS[ev.action];
    if (!key) return t("event.generic", { action: ev.action });
    const meta = (ev.metadata ?? {}) as { itemId?: string };
    const name = ev.actorName ?? t("someoneTrusted");
    const entry = (meta.itemId && itemNames[meta.itemId]) || t("anEntry");
    return t(`event.${key}`, { name, entry });
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

      {events && events.length === 0 ? <p className="shared-empty">{t("empty")}</p> : null}

      {events && events.length > 0 ? (
        <ul className="audit-list">
          {events.map((ev) => (
            <li key={ev.id} className="audit-item">
              <div className="audit-item-head">
                <span className={`audit-actor audit-actor--${ev.source === "db" ? "system" : "user"}`}>
                  {ev.source === "db" ? t("actorSystem") : t("actorUser")}
                </span>
                <time className="audit-time" dateTime={ev.occurredAt}>
                  {format.dateTime(new Date(ev.occurredAt), { dateStyle: "medium", timeStyle: "short" })}
                </time>
              </div>
              <p className="audit-summary">{describe(ev)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
