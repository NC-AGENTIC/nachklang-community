"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { normalizeRecoveryCode } from "@/features/vault/crypto/recovery-code";

type Props = {
  recoveryCode: string;
  onConfirm: () => void;
  onBack?: () => void;
  submitLabel?: string;
};

export function ConfirmationStep({
  recoveryCode,
  onConfirm,
  onBack,
  submitLabel,
}: Props) {
  const t = useTranslations("onboarding.confirmation");
  const [typed, setTyped] = useState("");
  const [agreed, setAgreed] = useState(false);

  let typedNormalized: string | null = null;
  try {
    typedNormalized = normalizeRecoveryCode(typed);
  } catch {
    typedNormalized = null;
  }
  let targetNormalized: string;
  try {
    targetNormalized = normalizeRecoveryCode(recoveryCode);
  } catch {
    targetNormalized = recoveryCode;
  }

  const matches = typedNormalized !== null && typedNormalized === targetNormalized;
  const ready = matches && agreed;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onConfirm();
      }}
      className="onboarding-step"
    >
      <label className="field" htmlFor="confirmation-code">
        {t("codeLabel")}
        <input
          id="confirmation-code"
          type="text"
          value={typed}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
        />
      </label>
      {typed && !matches ? (
        <small className="onboarding-step__error">{t("mismatchError")}</small>
      ) : null}

      <label htmlFor="confirmation-consent" className="onboarding-step__checkbox">
        <input
          id="confirmation-consent"
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        {t("consentLabel")}
      </label>

      <div className="onboarding-step__actions">
        {onBack ? (
          <button type="button" className="onboarding__back" onClick={onBack}>
            {t("backButton")}
          </button>
        ) : null}
        <button type="submit" className="button primary" disabled={!ready}>
          {submitLabel ?? t("defaultSubmitLabel")}
        </button>
      </div>
    </form>
  );
}
