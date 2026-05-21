"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

import { AuthShell } from "./auth-shell";
import { EmailOtpForm } from "./email-otp-form";
import { OtpVerifyForm } from "./otp-verify-form";

type Stage =
  | { step: "request" }
  | { step: "verify"; name: string; email: string };

export function EmailOtpSignup({
  turnstileSiteKey,
  returnTo,
}: {
  turnstileSiteKey?: string | null;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("auth.emailOtpSignup");
  const [stage, setStage] = useState<Stage>({ step: "request" });

  async function handleRequest({
    name,
    email,
    captchaToken,
  }: {
    name: string;
    email: string;
    captchaToken?: string;
  }) {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
      fetchOptions: captchaToken
        ? { headers: { "x-captcha-response": captchaToken } }
        : undefined,
    });
    if (result && "error" in result && result.error) {
      throw new Error("send_otp_failed");
    }
    setStage({ step: "verify", name, email });
  }

  async function handleVerify(otp: string) {
    if (stage.step !== "verify") return;
    const result = await authClient.signIn.emailOtp({ email: stage.email, otp });
    if (result && "error" in result && result.error) {
      throw new Error("verify_otp_failed");
    }
    // OTP sign-in does not accept a display name, so set it on the fresh session.
    await authClient.updateUser({ name: stage.name });
    // Invite flow: return to the accept page (which provisions a trustee-only account).
    // Normal sign-up: go to vault onboarding.
    router.push(returnTo ?? "/onboarding");
  }

  return (
    <AuthShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      subtitle={
        stage.step === "request"
          ? t("subtitleStep1")
          : t("subtitleStep2")
      }
      secondaryAction={{ label: t("existingAccountCta"), href: "/signin" }}
    >
      {stage.step === "request" ? (
        <EmailOtpForm onRequest={handleRequest} turnstileSiteKey={turnstileSiteKey} />
      ) : (
        <OtpVerifyForm email={stage.email} onVerify={handleVerify} />
      )}
    </AuthShell>
  );
}
