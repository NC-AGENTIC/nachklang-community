// src/features/vault/crypto/webcrypto-rootkey.ts
export const PRF_INFO = "nachklang-vault-prf-v1";

export type WrappedRootKeyAad = {
  type: "vault-root-key-prf" | "vault-root-key-recovery";
  vaultId: string;
  credentialID?: string;
  version: 2;
};

export type WebCryptoWrappedRootKey = {
  version: 2;
  algorithm: "aes-256-gcm";
  ivBase64: string;
  ciphertextBase64: string;
  associatedData: WrappedRootKeyAad;
};

const IV_BYTES = 12;

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

// Copy into a fresh ArrayBuffer-backed view so WebCrypto's BufferSource typing
// (TS 5.7+) accepts the bytes regardless of the source's ArrayBufferLike origin.
function toArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

// Canonical, stable JSON for AAD (sorted keys), matching the rest of the crypto core.
function canonicalAad(aad: WrappedRootKeyAad): Uint8Array<ArrayBuffer> {
  const ordered = {
    credentialID: aad.credentialID,
    type: aad.type,
    vaultId: aad.vaultId,
    version: aad.version,
  };
  return toArrayBufferView(new TextEncoder().encode(JSON.stringify(ordered)));
}

// Extractable so it can be wrapKey'd; raw bytes are generated inside WebCrypto and never enter JS.
export async function generateRootKeyCryptoKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function wrapRootKey(
  rootKey: CryptoKey,
  kek: CryptoKey,
  associatedData: WrappedRootKeyAad,
): Promise<WebCryptoWrappedRootKey> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.wrapKey("raw", rootKey, kek, {
    name: "AES-GCM",
    iv,
    additionalData: canonicalAad(associatedData),
  });
  return {
    version: 2,
    algorithm: "aes-256-gcm",
    ivBase64: toBase64(iv),
    ciphertextBase64: toBase64(wrapped),
    associatedData,
  };
}

export async function unwrapRootKey(
  env: WebCryptoWrappedRootKey,
  kek: CryptoKey,
  extractable = false,
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    fromBase64(env.ciphertextBase64),
    kek,
    { name: "AES-GCM", iv: fromBase64(env.ivBase64), additionalData: canonicalAad(env.associatedData) },
    { name: "AES-GCM", length: 256 },
    extractable,
    ["encrypt", "decrypt"],
  );
}
