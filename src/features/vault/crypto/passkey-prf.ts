// src/features/vault/crypto/passkey-prf.ts
import { PRF_INFO } from "./webcrypto-rootkey";

let cachedSalt: ArrayBuffer | null = null;

// Fixed app-wide PRF eval salt = SHA-256(PRF_INFO). Stable across sessions; non-secret.
export async function prfEvalSalt(): Promise<ArrayBuffer> {
  if (!cachedSalt) {
    cachedSalt = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(PRF_INFO));
  }
  return cachedSalt;
}

// PRF output (high entropy) → non-extractable HKDF key → non-extractable AES-GCM KEK.
export async function kekFromPrfOutput(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const hkdf = await crypto.subtle.importKey("raw", prfOutput, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: new TextEncoder().encode(PRF_INFO) },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

// Static capability hint; the real check is whether clientExtensionResults.prf.results is returned at ceremony time.
export function maybePrfCapable(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}
