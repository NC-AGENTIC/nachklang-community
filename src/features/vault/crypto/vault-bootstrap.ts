// src/features/vault/crypto/vault-bootstrap.ts
import { generateKdfPolicy } from "./vault-crypto";
import { generateRecoveryCode } from "./recovery-code";
import { kekFromRecoveryCode } from "./recovery-kek";
import { buildPrfWrappedRootKey, type PrfRegistration } from "./passkey-port";
import { generateRootKeyCryptoKey, wrapRootKey, unwrapRootKey } from "./webcrypto-rootkey";
import type { CreateVaultPayload } from "../domain/vault-setup-schemas";

export type VaultBootstrap = {
  vaultId: string;
  recoveryCode: string;
  payload: CreateVaultPayload;
  sessionRootKey: CryptoKey; // non-extractable
};

export async function bootstrapVault(reg: PrfRegistration): Promise<VaultBootstrap> {
  const vaultId = crypto.randomUUID();
  const kdfPolicy = generateKdfPolicy();
  const recoveryCode = generateRecoveryCode();

  const transientRootKey = await generateRootKeyCryptoKey(); // extractable, transient
  const prfWrap = await buildPrfWrappedRootKey(transientRootKey, reg, vaultId);
  const recoveryKek = await kekFromRecoveryCode(recoveryCode, kdfPolicy);
  const recoveryWrap = await wrapRootKey(transientRootKey, recoveryKek, {
    type: "vault-root-key-recovery", vaultId, version: 2,
  });

  // Derive the non-extractable session key from the prf wrap, then drop the transient handle.
  const { kekFromPrfOutput } = await import("./passkey-prf");
  const sessionRootKey = await unwrapRootKey(prfWrap, await kekFromPrfOutput(reg.prfOutput.slice(0)), false);

  return {
    vaultId,
    recoveryCode,
    sessionRootKey,
    payload: {
      vaultId,
      kdfPolicy,
      prfWrappedRootKeys: [{ credentialID: reg.credentialID, wrapped: prfWrap }],
      recoveryWrappedRootKey: recoveryWrap,
    },
  };
}
