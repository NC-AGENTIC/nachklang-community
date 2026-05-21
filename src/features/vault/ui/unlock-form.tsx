"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { AuthShell } from "@/features/auth/ui/auth-shell";
import type { KdfPolicy } from "@/features/vault/crypto/vault-crypto";
import { assertPrf as defaultAssertPrf, type PrfAssertion } from "@/features/vault/crypto/passkey-port";
import {
  unlockWithPrf as defaultUnlockWithPrf,
  unlockWithRecoveryCode as defaultUnlockWithRecoveryCode,
  type PrfWrapEntry,
} from "@/features/vault/crypto/vault-unlock";
import type { WebCryptoWrappedRootKey } from "@/features/vault/crypto/webcrypto-rootkey";
import { setRootKey } from "@/features/vault/state/root-key-store";

export type UnlockVaultMaterial = {
  vaultId: string;
  prfWrappedRootKeys: PrfWrapEntry[];
  recoveryWrappedRootKey: WebCryptoWrappedRootKey | null;
  kdfPolicy: KdfPolicy;
};

type PasskeyPortSeam = { assertPrf: () => Promise<PrfAssertion> };

type Props = {
  vault: UnlockVaultMaterial;
  port?: PasskeyPortSeam;
  unlockWithPrf?: (entries: PrfWrapEntry[], assertion: PrfAssertion) => Promise<CryptoKey>;
  unlockWithRecoveryCode?: (
    recoveryWrap: WebCryptoWrappedRootKey,
    code: string,
    policy: KdfPolicy,
  ) => Promise<CryptoKey>;
  onUnlocked?: () => void;
};

function mapVaultErrorCode(code: string, tErrors: ReturnType<typeof useTranslations<"vault.errors">>): string {
  switch (code) {
    case "PRF_NOT_SUPPORTED": return tErrors("prfNotSupported");
    case "PRF_SIGNIN_FAILED": return tErrors("prfSigninFailed");
    case "PRF_UNLOCK_FAILED": return tErrors("prfUnlockFailed");
    case "PRF_KEY_NOT_FOUND": return tErrors("prfKeyNotFound");
    case "RECOVERY_CODE_INVALID_CHAR": return tErrors("recoveryCodeInvalidChar");
    case "RECOVERY_CODE_LENGTH": return tErrors("recoveryCodeLength");
    default: return tErrors("generic");
  }
}

export function UnlockForm({
  vault,
  port = { assertPrf: defaultAssertPrf },
  unlockWithPrf = defaultUnlockWithPrf,
  unlockWithRecoveryCode = defaultUnlockWithRecoveryCode,
  onUnlocked,
}: Props) {
  const t = useTranslations("vault.unlock");
  const tErrors = useTranslations("vault.errors");
  const router = useRouter();
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function finish() {
    if (onUnlocked) {
      onUnlocked();
      return;
    }
    router.push("/vault");
  }

  async function handlePasskey() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const assertion = await port.assertPrf();
      const rootKey = await unlockWithPrf(vault.prfWrappedRootKeys, assertion);
      setRootKey({ vaultId: vault.vaultId, rootKey, unlockedVia: "passkey" });
      finish();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(mapVaultErrorCode(code, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!recoveryCode || busy) return;
    setBusy(true);
    setRecoveryError(null);
    try {
      if (!vault.recoveryWrappedRootKey) throw new Error("RECOVERY_NO_MATERIAL");
      const rootKey = await unlockWithRecoveryCode(
        vault.recoveryWrappedRootKey,
        recoveryCode,
        vault.kdfPolicy,
      );
      setRootKey({ vaultId: vault.vaultId, rootKey, unlockedVia: "recovery" });
      finish();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setRecoveryError(
        code === "RECOVERY_NO_MATERIAL" ? t("recoveryNoMaterial") : mapVaultErrorCode(code, tErrors),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")}>
      <button
        type="button"
        className="button full-width"
        onClick={handlePasskey}
        disabled={busy}
      >
        {busy ? t("passkeyBusy") : t("passkeySubmit")}
      </button>
      <p className="notice-line" role={error ? "alert" : undefined} aria-live="polite">
        {error ?? ""}
      </p>

      <div className="auth__recovery">
        <button
          type="button"
          className="auth__recovery-toggle"
          aria-expanded={recoveryOpen}
          onClick={() => setRecoveryOpen((open) => !open)}
        >
          <span>{t("recoveryToggle")}</span>
          <span aria-hidden="true" className="auth__recovery-chevron" data-open={recoveryOpen}>
            ↓
          </span>
        </button>

        {recoveryOpen ? (
          <form onSubmit={handleRecovery} className="auth__recovery-form">
            <div className="field">
              <label htmlFor="recovery-code">{t("recoveryLabel")}</label>
              <input
                id="recovery-code"
                name="recovery-code"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
              />
            </div>
            <button type="submit" disabled={busy} className="button secondary full-width">
              {t("recoverySubmit")}
            </button>
            <p className="notice-line" role={recoveryError ? "alert" : undefined} aria-live="polite">
              {recoveryError ?? ""}
            </p>
          </form>
        ) : null}
      </div>
    </AuthShell>
  );
}
