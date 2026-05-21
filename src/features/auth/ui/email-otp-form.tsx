"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { TurnstileWidget } from "./turnstile-widget";

type Props = {
  onRequest: (input: { name: string; email: string; captchaToken?: string }) => Promise<void>;
  turnstileSiteKey?: string | null;
  requireName?: boolean;
  submitLabel?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailOtpForm({ onRequest, turnstileSiteKey, requireName = true, submitLabel }: Props) {
  const t = useTranslations("auth.emailOtp");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (requireName && !trimmedName) {
      setError(t("errorNameRequired"));
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(t("errorEmailInvalid"));
      return;
    }
    if (turnstileSiteKey && !captchaToken) {
      setError(t("errorCaptchaRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await onRequest({
        name: trimmedName,
        email: trimmedEmail,
        captchaToken: captchaToken ?? undefined,
      });
    } catch {
      setError(t("errorRequestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {requireName ? (
        <div className="field">
          <label htmlFor="otp-name">{t("nameLabel")}</label>
          <input
            id="otp-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="otp-email">{t("emailLabel")}</label>
        <input
          id="otp-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {turnstileSiteKey ? (
        <TurnstileWidget siteKey={turnstileSiteKey} onToken={setCaptchaToken} />
      ) : null}
      <button className="button full-width" type="submit" disabled={submitting}>
        {submitLabel ?? t("submitDefault")}
      </button>
      {error ? (
        <p className="notice-line error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
