"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { formatRecoveryCode, normalizeRecoveryCode } from "@/features/vault/crypto/recovery-code";
import { registerWithPrf, type PrfRegistration } from "@/features/vault/crypto/passkey-port";
import { detectPasskeyDeviceName } from "./passkey-device-name";
import { bootstrapVault } from "@/features/vault/crypto/vault-bootstrap";
import { bootstrapUserKeypair } from "@/features/trustee/crypto/user-keypair-bootstrap";
import { createMyKeypair } from "@/features/trustee/data/keypair-client";
import { createVault as createVaultClient } from "@/features/vault/data/vault-keys-client";
import type { CreateVaultPayload } from "@/features/vault/domain/vault-setup-schemas";
import { setRootKey } from "@/features/vault/state/root-key-store";

import { ConfirmationStep } from "./onboarding/confirmation-step";
import { OnboardingShell } from "./onboarding/onboarding-shell";
import { PasskeyStep } from "./onboarding/passkey-step";
import { RecoveryStep } from "./onboarding/recovery-step";

type PasskeyPortSeam = { registerWithPrf: (name?: string) => Promise<PrfRegistration> };

type Props = {
  email?: string;
  port?: PasskeyPortSeam;
  createVault?: (payload: CreateVaultPayload) => Promise<void>;
  onUnlocked?: () => void;
};

type WizardState =
  | { step: "passkey" }
  | { step: "recovery"; vaultId: string; recoveryCode: string }
  | { step: "confirm"; vaultId: string; recoveryCode: string };

export function OnboardingWizard({
  email = "",
  port = { registerWithPrf },
  createVault = createVaultClient,
  onUnlocked,
}: Props) {
  const t = useTranslations("onboarding.wizard");
  const tErrors = useTranslations("vault.errors");
  const tDevice = useTranslations("vault.managePasskeys");
  const router = useRouter();
  const [state, setState] = useState<WizardState>({ step: "passkey" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepLabels = t.raw("stepLabels") as [string, string, string];

  const META = {
    passkey: {
      step: 1 as const,
      eyebrow: t("step1Eyebrow"),
      title: t("step1Title"),
      subtitle: t("step1Subtitle"),
    },
    recovery: {
      step: 2 as const,
      eyebrow: t("step2Eyebrow"),
      title: t("step2Title"),
      subtitle: t("step2Subtitle"),
    },
    confirm: {
      step: 3 as const,
      eyebrow: t("step3Eyebrow"),
      title: t("step3Title"),
      subtitle: t("step3Subtitle"),
    },
  } as const;

  function finish() {
    if (onUnlocked) {
      onUnlocked();
      return;
    }
    router.push("/vault");
  }

  async function handleCreatePasskey() {
    setBusy(true);
    setError(null);
    try {
      const reg = await port.registerWithPrf(detectPasskeyDeviceName(tDevice("deviceFallback")));
      const boot = await bootstrapVault(reg);
      await createVault(boot.payload);
      // Best-effort: also create the trustee keypair (lets this user be a trustee later).
      // A failure here must never block vault onboarding; it can be created from settings.
      try {
        const kpBoot = await bootstrapUserKeypair(reg, boot.recoveryCode, boot.payload.kdfPolicy);
        await createMyKeypair(kpBoot.payload);
      } catch {
        // ignore — keypair can be provisioned lazily
      }
      setRootKey({ vaultId: boot.vaultId, rootKey: boot.sessionRootKey, unlockedVia: "passkey" });
      setState({ step: "recovery", vaultId: boot.vaultId, recoveryCode: boot.recoveryCode });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      const message = code === "PRF_NOT_SUPPORTED"
        ? tErrors("prfNotSupported")
        : code
        ? tErrors("generic")
        : t("passkeyErrorGeneric");
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function handleRecoveryContinue() {
    if (state.step !== "recovery") return;
    setState({ step: "confirm", vaultId: state.vaultId, recoveryCode: state.recoveryCode });
  }

  function handleBackToRecovery() {
    if (state.step !== "confirm") return;
    setState({ step: "recovery", vaultId: state.vaultId, recoveryCode: state.recoveryCode });
  }

  function handleConfirm() {
    if (state.step !== "confirm") return;
    finish();
  }

  const meta = META[state.step];
  const onBack = state.step === "confirm" ? handleBackToRecovery : undefined;

  return (
    <OnboardingShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      subtitle={meta.subtitle}
      step={meta.step}
      totalSteps={3}
      stepLabels={stepLabels}
      onBack={onBack}
      backLabel={t("backLabel")}
    >
      {state.step === "passkey" && (
        <PasskeyStep onCreate={handleCreatePasskey} busy={busy} error={error} />
      )}
      {state.step === "recovery" && (
        <RecoveryStep
          recoveryCode={formatRecoveryCode(normalizeRecoveryCode(state.recoveryCode))}
          email={email}
          vaultId={state.vaultId}
          onContinue={handleRecoveryContinue}
        />
      )}
      {state.step === "confirm" && (
        <ConfirmationStep
          recoveryCode={state.recoveryCode}
          onConfirm={handleConfirm}
          submitLabel={t("openVaultButton")}
        />
      )}
    </OnboardingShell>
  );
}
