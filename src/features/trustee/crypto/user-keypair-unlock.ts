import { kekFromPrfOutput } from "@/features/vault/crypto/passkey-prf";
import { kekFromRecoveryCode } from "@/features/vault/crypto/recovery-kek";
import type { KdfPolicy } from "@/features/vault/crypto/vault-crypto";
import type { PrfAssertion } from "@/features/vault/crypto/passkey-port";

import { keypairFromPrivateKey, type TrusteeKeypair } from "./trustee-keypair";
import { unwrapTrusteePrivateKey, type WrappedTrusteePrivateKey } from "./trustee-keypair-wrap";

export type KeypairPrfWrapEntry = { credentialID: string; wrapped: WrappedTrusteePrivateKey };

export async function unlockKeypairWithPrf(
  entries: KeypairPrfWrapEntry[],
  assertion: PrfAssertion,
): Promise<TrusteeKeypair> {
  const entry = entries.find((e) => e.credentialID === assertion.credentialID) ?? entries[0];
  if (!entry) throw new Error("KEYPAIR_KEY_NOT_FOUND");
  const kek = await kekFromPrfOutput(assertion.prfOutput.slice(0));
  const privateKey = await unwrapTrusteePrivateKey(entry.wrapped, kek);
  return keypairFromPrivateKey(privateKey);
}

export async function unlockKeypairWithRecovery(
  recoveryWrap: WrappedTrusteePrivateKey,
  recoveryCode: string,
  kdfPolicy: KdfPolicy,
): Promise<TrusteeKeypair> {
  const kek = await kekFromRecoveryCode(recoveryCode, kdfPolicy);
  const privateKey = await unwrapTrusteePrivateKey(recoveryWrap, kek);
  return keypairFromPrivateKey(privateKey);
}
