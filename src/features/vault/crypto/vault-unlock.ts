// src/features/vault/crypto/vault-unlock.ts
import { kekFromPrfOutput } from "./passkey-prf";
import { kekFromRecoveryCode } from "./recovery-kek";
import { unwrapRootKey, type WebCryptoWrappedRootKey } from "./webcrypto-rootkey";
import type { KdfPolicy } from "./vault-crypto";
import type { PrfAssertion } from "./passkey-port";

export type PrfWrapEntry = { credentialID: string; wrapped: WebCryptoWrappedRootKey };

export async function unlockWithPrf(
  entries: PrfWrapEntry[],
  assertion: PrfAssertion,
  extractable = false,
): Promise<CryptoKey> {
  const entry = entries.find((e) => e.credentialID === assertion.credentialID);
  if (!entry) throw new Error("PRF_KEY_NOT_FOUND");
  return unwrapRootKey(entry.wrapped, await kekFromPrfOutput(assertion.prfOutput.slice(0)), extractable);
}

export async function unlockWithRecoveryCode(
  recoveryWrap: WebCryptoWrappedRootKey,
  code: string,
  policy: KdfPolicy,
): Promise<CryptoKey> {
  return unwrapRootKey(recoveryWrap, await kekFromRecoveryCode(code, policy), false);
}
