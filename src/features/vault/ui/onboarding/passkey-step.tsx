"use client";

import { useTranslations } from "next-intl";

import { maybePrfCapable } from "@/features/vault/crypto/passkey-prf";

type Props = {
  onCreate: () => void;
  busy?: boolean;
  error?: string | null;
};

export function PasskeyStep({ onCreate, busy = false, error = null }: Props) {
  const t = useTranslations("onboarding.passkey");
  const capable = maybePrfCapable();

  return (
    <div className="onboarding-step">
      <p className="onboarding-step__hint">
        {capable ? t("hintCapable") : t("hintIncapable")}
      </p>
      <button
        type="button"
        className="button primary"
        onClick={onCreate}
        disabled={busy}
      >
        {busy ? t("createBusy") : t("createButton")}
      </button>
      {error ? (
        <p className="onboarding-step__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
