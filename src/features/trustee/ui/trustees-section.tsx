"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { fingerprintPublicKey, publicKeyFromBase64 } from "@/features/trustee/crypto/trustee-keypair";
import {
  createShareInvite,
  fetchAccessLog,
  fetchMyShares,
  purgeShare,
  revokeShare,
  sealShare,
} from "@/features/trustee/data/share-client";

import { TrusteesPanel, type TrusteeShareView } from "./trustees-panel";

export function TrusteesSection() {
  const t = useTranslations("trustee.owner");
  const [shares, setShares] = useState<TrusteeShareView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await fetchMyShares();
    // Recompute the SAS fingerprint client-side from the bound public key — this is the value
    // the owner compares out-of-band, so it must be derived locally, not trusted from the server.
    const views = await Promise.all(
      rows.map(async (s) => ({
        id: s.id,
        label: s.label,
        status: s.status,
        fingerprint: await fingerprintPublicKey(publicKeyFromBase64(s.trusteePublicKey)),
        trusteePublicKey: s.trusteePublicKey,
        createdAt: s.createdAt,
        lastAccessedAt: s.lastAccessedAt,
        accessCount: s.accessCount,
      })),
    );
    setShares(views);
  }, []);

  async function handleSeal(share: TrusteeShareView) {
    setError(null);
    try {
      await sealShare(share.id, share.trusteePublicKey);
      await refresh();
    } catch {
      setError(t("error"));
    }
  }

  async function handleRevoke(share: TrusteeShareView) {
    setError(null);
    try {
      await revokeShare(share.id);
      await refresh();
    } catch {
      setError(t("error"));
    }
  }

  async function handlePurge(share: TrusteeShareView) {
    setError(null);
    try {
      await purgeShare(share.id);
      await refresh();
    } catch {
      setError(t("error"));
    }
  }

  // Poll so a trustee's freshly-accepted invite (and its SAS fingerprint) appears for the owner
  // WITHOUT a manual page refresh — the fingerprint is compared out-of-band, so the owner needs
  // to see it as soon as the trustee accepts.
  useEffect(() => {
    void refresh().catch(() => {});
    const id = setInterval(() => {
      void refresh().catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  async function handleInvite(email: string, label: string) {
    setBusy(true);
    setError(null);
    setInviteNotice(null);
    setInviteLink(null);
    try {
      const res = await createShareInvite({ inviteeEmail: email, label });
      setInviteLink(res.acceptUrl);
      setInviteNotice(res.emailSent ? t("invitedEmailed", { email }) : t("invitedNoMail"));
      await refresh();
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TrusteesPanel
      shares={shares}
      onInvite={handleInvite}
      onSeal={handleSeal}
      onRevoke={handleRevoke}
      onPurge={handlePurge}
      onLoadAccessLog={fetchAccessLog}
      inviteNotice={inviteNotice}
      inviteLink={inviteLink}
      busy={busy}
      error={error}
    />
  );
}
