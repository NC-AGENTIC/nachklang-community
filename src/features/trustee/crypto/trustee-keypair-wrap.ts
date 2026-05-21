// Wrap/unwrap a trustee's 32-byte X25519 private key with a KEK (PRF- or recovery-derived),
// reusing the Root Key approach: import the raw bytes as an extractable AES-GCM CryptoKey and
// wrapKey it. The AAD binds the wrap to its purpose, the keypair, and (for PRF wraps) the
// credential — preventing a wrapped blob from being replayed in a different context.

export type TrusteeKeyWrapAad = {
  type: "trustee-private-key-prf" | "trustee-private-key-recovery";
  keypairId: string;
  credentialID?: string;
  version: 2;
};

export type WrappedTrusteePrivateKey = {
  version: 2;
  algorithm: "aes-256-gcm";
  ivBase64: string;
  ciphertextBase64: string;
  associatedData: TrusteeKeyWrapAad;
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

function toArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

// Canonical, sorted-key JSON for the AAD (matches the rest of the crypto core).
function canonicalAad(aad: TrusteeKeyWrapAad): Uint8Array<ArrayBuffer> {
  const ordered = {
    credentialID: aad.credentialID,
    keypairId: aad.keypairId,
    type: aad.type,
    version: aad.version,
  };
  return toArrayBufferView(new TextEncoder().encode(JSON.stringify(ordered)));
}

export async function wrapTrusteePrivateKey(
  privateKey: Uint8Array,
  kek: CryptoKey,
  associatedData: TrusteeKeyWrapAad,
): Promise<WrappedTrusteePrivateKey> {
  const asAesKey = await crypto.subtle.importKey(
    "raw",
    toArrayBufferView(privateKey),
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.wrapKey("raw", asAesKey, kek, {
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

export async function unwrapTrusteePrivateKey(
  env: WrappedTrusteePrivateKey,
  kek: CryptoKey,
): Promise<Uint8Array> {
  const asAesKey = await crypto.subtle.unwrapKey(
    "raw",
    fromBase64(env.ciphertextBase64),
    kek,
    { name: "AES-GCM", iv: fromBase64(env.ivBase64), additionalData: canonicalAad(env.associatedData) },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  return new Uint8Array(await crypto.subtle.exportKey("raw", asAesKey));
}
