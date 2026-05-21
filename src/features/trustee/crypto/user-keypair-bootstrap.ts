import { kekFromPrfOutput } from "@/features/vault/crypto/passkey-prf";
import { kekFromRecoveryCode } from "@/features/vault/crypto/recovery-kek";
import type { KdfPolicy } from "@/features/vault/crypto/vault-crypto";
import type { PrfRegistration } from "@/features/vault/crypto/passkey-port";

import { generateTrusteeKeypair, publicKeyToBase64, type TrusteeKeypair } from "./trustee-keypair";
import { wrapTrusteePrivateKey, type WrappedTrusteePrivateKey } from "./trustee-keypair-wrap";

export type CreateKeypairPayload = {
  keypairId: string;
  publicKey: string;
  prfWrappedPrivateKeys: Array<{ credentialID: string; wrapped: WrappedTrusteePrivateKey }>;
  // Omitted when a keypair is provisioned lazily for an existing user (no recovery code at hand):
  // such a keypair is recoverable only via passkey PRF, never via the recovery code.
  recoveryWrappedPrivateKey?: WrappedTrusteePrivateKey;
};

export type UserKeypairBootstrap = {
  keypairId: string;
  keypair: TrusteeKeypair;
  payload: CreateKeypairPayload;
};

// Mirror of vault-bootstrap for the trustee keypair: generate an X25519 keypair and wrap its
// private key per passkey (PRF) and once via the recovery code. Reuses the vault's recovery
// code + KDF policy so a single recovery code restores both the vault and the keypair.
export async function bootstrapUserKeypair(
  reg: PrfRegistration,
  recoveryCode: string,
  kdfPolicy: KdfPolicy,
): Promise<UserKeypairBootstrap> {
  const keypairId = crypto.randomUUID();
  const kp = await generateTrusteeKeypair();

  const prfKek = await kekFromPrfOutput(reg.prfOutput.slice(0));
  const prfWrap = await wrapTrusteePrivateKey(kp.privateKey, prfKek, {
    type: "trustee-private-key-prf",
    keypairId,
    credentialID: reg.credentialID,
    version: 2,
  });

  const recoveryKek = await kekFromRecoveryCode(recoveryCode, kdfPolicy);
  const recoveryWrap = await wrapTrusteePrivateKey(kp.privateKey, recoveryKek, {
    type: "trustee-private-key-recovery",
    keypairId,
    version: 2,
  });

  return {
    keypairId,
    keypair: kp,
    payload: {
      keypairId,
      publicKey: publicKeyToBase64(kp.publicKey),
      prfWrappedPrivateKeys: [{ credentialID: reg.credentialID, wrapped: prfWrap }],
      recoveryWrappedPrivateKey: recoveryWrap,
    },
  };
}

// Lazy provisioning for an existing user who lacks a keypair (e.g. onboarded before this
// feature shipped) and has no recovery code at hand: wrap the private key with the current
// passkey's PRF only. The recovery wrap can be added later if the user re-enters their code.
export async function bootstrapUserKeypairPrfOnly(
  reg: PrfRegistration,
): Promise<UserKeypairBootstrap> {
  const keypairId = crypto.randomUUID();
  const kp = await generateTrusteeKeypair();

  const prfKek = await kekFromPrfOutput(reg.prfOutput.slice(0));
  const prfWrap = await wrapTrusteePrivateKey(kp.privateKey, prfKek, {
    type: "trustee-private-key-prf",
    keypairId,
    credentialID: reg.credentialID,
    version: 2,
  });

  return {
    keypairId,
    keypair: kp,
    payload: {
      keypairId,
      publicKey: publicKeyToBase64(kp.publicKey),
      prfWrappedPrivateKeys: [{ credentialID: reg.credentialID, wrapped: prfWrap }],
    },
  };
}
