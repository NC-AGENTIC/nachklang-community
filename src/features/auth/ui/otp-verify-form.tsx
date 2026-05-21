"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  email: string;
  onVerify: (code: string) => Promise<void>;
};

export function OtpVerifyForm({ email, onVerify }: Props) {
  const t = useTranslations("auth.otpVerify");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError(t("errorCodeLength"));
      return;
    }
    setSubmitting(true);
    try {
      await onVerify(code);
    } catch {
      setError(t("errorCodeInvalid"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="notice-line" aria-live="polite">
        {t("codeSentNotice", { email })}
      </p>
      <div className="field">
        <label htmlFor="otp-code">{t("codeLabel")}</label>
        <input
          id="otp-code"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>
      <button className="button full-width" type="submit" disabled={submitting}>
        {t("submit")}
      </button>
      {error ? (
        <p className="notice-line error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
