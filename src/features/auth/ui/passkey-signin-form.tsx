"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { AuthShell } from "@/features/auth/ui/auth-shell";
import { EmailOtpSignin } from "@/features/auth/ui/email-otp-signin";
import { signInWithPrf as defaultSignInWithPrf, type PrfAssertion } from "@/features/vault/crypto/passkey-port";
import {
  unlockWithPrf as defaultUnlockWithPrf,
  type PrfWrapEntry,
} from "@/features/vault/crypto/vault-unlock";
import { setRootKey } from "@/features/vault/state/root-key-store";

type SignInPortSeam = { signInWithPrf: () => Promise<PrfAssertion> };

type VaultMaterial = { vaultId: string; prfWrappedRootKeys: PrfWrapEntry[] };

type Props = {
  port?: SignInPortSeam;
  unlockWithPrf?: (entries: PrfWrapEntry[], assertion: PrfAssertion) => Promise<CryptoKey>;
  loadVault?: () => Promise<VaultMaterial | null>;
  onUnlocked?: () => void;
  turnstileSiteKey?: string | null;
  returnTo?: string | null;
};

// Returns null when the signed-in account has no personal vault (a trustee-only account).
async function fetchVaultMaterial(): Promise<VaultMaterial | null> {
  const res = await fetch("/api/vault", { method: "GET", credentials: "same-origin" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("VAULT_MATERIAL_UNAVAILABLE");
  const body = await res.json();
  return { vaultId: body.vaultId, prfWrappedRootKeys: body.prfWrappedRootKeys ?? [] };
}

export function PasskeySignInForm({
  port = { signInWithPrf: defaultSignInWithPrf },
  unlockWithPrf = defaultUnlockWithPrf,
  loadVault = fetchVaultMaterial,
  onUnlocked,
  turnstileSiteKey,
  returnTo,
}: Props) {
  const router = useRouter();
  const t = useTranslations("auth.signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  // Trustee-only accounts have no personal vault → land on the shared view instead of /vault.
  function finish(hasVault: boolean) {
    if (onUnlocked) {
      onUnlocked();
      return;
    }
    router.push(returnTo ?? (hasVault ? "/vault" : "/shared"));
  }

  async function handleSignIn() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const assertion = await port.signInWithPrf();
      const vault = await loadVault();
      if (vault) {
        const rootKey = await unlockWithPrf(vault.prfWrappedRootKeys, assertion);
        setRootKey({ vaultId: vault.vaultId, rootKey, unlockedVia: "passkey" });
      }
      finish(vault !== null);
    } catch (err) {
      // Never surface a raw error (e.g. a JSON-parse "Unexpected token '<'" when the wrong,
      // unregistered passkey is chosen). A failed assertion almost always means the user picked a
      // passkey/security key that isn't registered for this account → give clear guidance.
      const code = err instanceof Error ? err.message : "";
      const message =
        code === "VAULT_MATERIAL_UNAVAILABLE" ? t("errorVaultMaterial") : t("errorWrongPasskey");
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      subtitle={t("subtitle")}
      secondaryAction={{ label: t("createAccountCta"), href: "/signup" }}
    >
      <button
        type="button"
        className="button full-width"
        onClick={handleSignIn}
        disabled={busy}
      >
        {busy ? t("submitBusy") : t("submit")}
      </button>
      <p className="notice-line" role={error ? "alert" : undefined} aria-live="polite">
        {error ?? ""}
      </p>

      <div className="auth__recovery">
        <button
          type="button"
          className="auth__recovery-toggle"
          aria-expanded={emailOpen}
          onClick={() => setEmailOpen((open) => !open)}
        >
          <span>{t("emailFallbackToggle")}</span>
          <span aria-hidden="true" className="auth__recovery-chevron" data-open={emailOpen}>
            ↓
          </span>
        </button>
        {emailOpen ? (
          <div className="auth__recovery-form">
            <EmailOtpSignin turnstileSiteKey={turnstileSiteKey} returnTo={returnTo} />
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}
