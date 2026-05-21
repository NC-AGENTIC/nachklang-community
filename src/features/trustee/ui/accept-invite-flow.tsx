"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  acceptInvite,
  fetchInvitePreview,
  provisionTrusteeKeypair,
  type InvitePreview,
} from "@/features/trustee/data/share-client";

import { AcceptInvitePanel, type AcceptPhase } from "./accept-invite-panel";

export function AcceptInviteFlow({ token, phase }: { token: string; phase: AcceptPhase }) {
  const t = useTranslations("trustee.accept");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ fingerprint: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetchInvitePreview(token)
      .then((p) => {
        if (!active) return;
        setPreview(p);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setPreview(null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      // A freshly signed-up invitee has no passkey yet → register one (which provisions the
      // trustee keypair, no personal vault). Existing-passkey users let acceptInvite's
      // ensureMyKeypair handle it.
      if (phase === "register") {
        await provisionTrusteeKeypair();
      }
      const res = await acceptInvite(token);
      setResult({ fingerprint: res.fingerprint });
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AcceptInvitePanel
      preview={preview ? { ownerName: preview.ownerName, acceptable: preview.acceptable } : null}
      loading={loading}
      onAccept={handleAccept}
      result={result}
      busy={busy}
      error={error}
      phase={phase}
      returnTo={`/shares/accept/${token}`}
    />
  );
}
