"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/features/auth/ui/auth-shell";

export type AcceptPreview = { ownerName: string; acceptable: boolean };
export type AcceptResultView = { fingerprint: string };
export type AcceptPhase = "ready" | "anonymous" | "register";

export type AcceptInvitePanelProps = {
  preview: AcceptPreview | null;
  loading: boolean;
  onAccept: () => Promise<void> | void;
  result: AcceptResultView | null;
  busy: boolean;
  error: string | null;
  phase: AcceptPhase;
  returnTo: string;
};

export function AcceptInvitePanel({
  preview,
  loading,
  onAccept,
  result,
  busy,
  error,
  phase,
  returnTo,
}: AcceptInvitePanelProps) {
  const t = useTranslations("trustee.accept");
  const rt = `?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("heading")} subtitle="">
      <div className="trustee-accept">
        {loading ? <p className="trustee-accept-loading">{t("loading")}</p> : null}

        {!loading && !preview ? <p className="trustee-accept-invalid">{t("invalid")}</p> : null}

        {!loading && preview && !preview.acceptable && !result ? (
          <p className="trustee-accept-invalid">{t("notAcceptable")}</p>
        ) : null}

        {!loading && preview && preview.acceptable && !result ? (
          <div className="trustee-accept-offer">
            <p className="trustee-accept-lead">{t("lead", { owner: preview.ownerName })}</p>

            {phase === "anonymous" ? (
              <div className="trustee-accept-auth">
                <p className="trustee-accept-lead">{t("authPrompt")}</p>
                <div className="trustee-accept-auth-actions">
                  <Link className="button full-width" href={`/signup${rt}`}>
                    {t("createAccount")}
                  </Link>
                  <Link className="button secondary full-width" href={`/signin${rt}`}>
                    {t("signIn")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <button
                  className="button full-width"
                  type="button"
                  onClick={() => void onAccept()}
                  disabled={busy}
                >
                  {busy
                    ? t("acceptBusy")
                    : phase === "register"
                      ? t("registerAndAccept")
                      : t("acceptCta")}
                </button>
                {error ? (
                  <p className="notice-line trustee-accept-error" role="alert">
                    {error}
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {result ? (
          <div className="trustee-accept-success">
            <h2>{t("waitingHeading")}</h2>
            <p className="trustee-accept-lead">
              {t("waitingLead", { owner: preview?.ownerName ?? "" })}
            </p>
            <div className="trustee-accept-fingerprint">
              <span>{t("fingerprintLabel")}</span>
              <code>{result.fingerprint}</code>
            </div>
            <p className="trustee-accept-back">
              <Link href="/shared">{t("toShared")}</Link>
            </p>
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}
