"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

import { AuthShell } from "./auth-shell";

type State = "verifying" | "success" | "error";

export function VerifyEmailResult({ token }: { token: string }) {
  const router = useRouter();
  const t = useTranslations("auth.verifyEmailResult");
  const [state, setState] = useState<State>("verifying");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await authClient.verifyEmail({ query: { token } });
        if (!cancelled) setState("success");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")}>
      {state === "verifying" ? <p>{t("verifying")}</p> : null}
      {state === "success" ? (
        <>
          <p>{t("successMessage")}</p>
          <button className="button full-width" type="button" onClick={() => router.push("/onboarding")}>
            {t("successCta")}
          </button>
        </>
      ) : null}
      {state === "error" ? (
        <p className="notice-line" aria-live="polite">
          {t("errorMessage")}
        </p>
      ) : null}
    </AuthShell>
  );
}
