// src/features/vault/crypto/recovery-kek.ts
import sodium from "libsodium-wrappers-sumo";
import { deriveWrappingKey, toArrayBufferView, type KdfPolicy } from "./vault-crypto";
import { normalizeRecoveryCode } from "./recovery-code";

// Argon2id over the (normalised) recovery code → 32 raw bytes → AES-GCM KEK. Cold path.
export async function kekFromRecoveryCode(code: string, policy: KdfPolicy): Promise<CryptoKey> {
  await sodium.ready;
  const raw = await deriveWrappingKey(normalizeRecoveryCode(code), policy);
  try {
    return await crypto.subtle.importKey("raw", toArrayBufferView(raw), { name: "AES-GCM" }, false, ["wrapKey", "unwrapKey"]);
  } finally {
    sodium.memzero(raw);
  }
}
