"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

import { EmailOtpForm } from "./email-otp-form";
import { OtpVerifyForm } from "./otp-verify-form";

type Stage = { step: "request" } | { step: "verify"; email: string };

/**
 * Email-OTP sign-in for returning users whose passkey is unavailable (lost device).
 * After a successful OTP sign-in we route to /unlock, where the recovery-code path
 * lives (and which itself redirects to /onboarding if the account has no vault yet).
 */
export function EmailOtpSignin({
  turnstileSiteKey,
  returnTo,
}: {
  turnstileSiteKey?: string | null;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("auth.emailOtpSignin");
  const [stage, setStage] = useState<Stage>({ step: "request" });

  async function handleRequest({
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
    setStage({ step: "verify", email });
  }

  async function handleVerify(otp: string) {
    if (stage.step !== "verify") return;
    const result = await authClient.signIn.emailOtp({ email: stage.email, otp });
    if (result && "error" in result && result.error) {
      throw new Error("verify_otp_failed");
    }
    // Invite flow returns to the accept page; otherwise /unlock (which routes vault-less
    // accounts onward to the shared view).
    router.push(returnTo ?? "/unlock");
  }

  if (stage.step === "request") {
    return (
      <EmailOtpForm
        onRequest={handleRequest}
        turnstileSiteKey={turnstileSiteKey}
        requireName={false}
        submitLabel={t("submitLabel")}
      />
    );
  }
  return <OtpVerifyForm email={stage.email} onVerify={handleVerify} />;
}
