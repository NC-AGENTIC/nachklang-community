import sodium from "libsodium-wrappers-sumo";

// X25519 keypair used to share a vault with a trustee. The private key is wrapped
// (per passkey + recovery) the same way the Root Key is — see trustee-keypair-wrap.ts.
export type TrusteeKeypair = { publicKey: Uint8Array; privateKey: Uint8Array };

export async function generateTrusteeKeypair(): Promise<TrusteeKeypair> {
  await sodium.ready;
  const kp = sodium.crypto_box_keypair();
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

// Reconstruct the full keypair from the (unwrapped) private key — the X25519 public key
// is the scalar-mult of the base point with the private key.
export async function keypairFromPrivateKey(privateKey: Uint8Array): Promise<TrusteeKeypair> {
  await sodium.ready;
  return { privateKey, publicKey: sodium.crypto_scalarmult_base(privateKey) };
}

export function publicKeyToBase64(publicKey: Uint8Array): string {
  return sodium.to_base64(publicKey, sodium.base64_variants.ORIGINAL);
}

export function publicKeyFromBase64(value: string): Uint8Array {
  return sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
}

export function sealedToBase64(sealed: Uint8Array): string {
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

export function sealedFromBase64(value: string): Uint8Array {
  return sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
}

// Anonymous sealed box to the recipient's public key (crypto_box_seal): the sender is
// not authenticated, which is fine — authenticity of the *recipient* is established
// out-of-band via the SAS fingerprint before the owner seals.
export async function sealToPublicKey(
  message: Uint8Array,
  recipientPublicKey: Uint8Array,
): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.crypto_box_seal(message, recipientPublicKey);
}

export async function openSealed(sealed: Uint8Array, keypair: TrusteeKeypair): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.crypto_box_seal_open(sealed, keypair.publicKey, keypair.privateKey);
}

// Short authentication string for out-of-band verification: SHA-256(publicKey) rendered
// as three 4-digit groups (e.g. "0421-9837-1056"). Deterministic and stable for a key.
export async function fingerprintPublicKey(publicKey: Uint8Array): Promise<string> {
  await sodium.ready;
  const hash = sodium.crypto_hash_sha256(publicKey);
  const groups: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const value = ((hash[i * 2] << 8) | hash[i * 2 + 1]) % 10000;
    groups.push(String(value).padStart(4, "0"));
  }
  return groups.join("-");
}

// Seal an extractable copy of the owner's Root Key to a trustee's public key. The caller
// obtains the extractable copy transiently (same pattern as "add this device") and discards
// it; the raw bytes are zeroed here after sealing.
export async function sealRootKeyToTrustee(
  extractableRootKey: CryptoKey,
  trusteePublicKey: Uint8Array,
): Promise<Uint8Array> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", extractableRootKey));
  try {
    return await sealToPublicKey(raw, trusteePublicKey);
  } finally {
    raw.fill(0);
  }
}

// Trustee side: unseal the Root Key and import it as a non-extractable AES-GCM key for
// decrypting the owner's vault ciphertext.
export async function openSealedRootKey(
  sealed: Uint8Array,
  keypair: TrusteeKeypair,
): Promise<CryptoKey> {
  const raw = await openSealed(sealed, keypair);
  // Copy into a fresh ArrayBuffer-backed view so WebCrypto's BufferSource typing accepts
  // libsodium's Uint8Array<ArrayBufferLike> output.
  const rawView = new Uint8Array(raw.byteLength);
  rawView.set(raw);
  try {
    return await crypto.subtle.importKey("raw", rawView, { name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
  } finally {
    raw.fill(0);
    rawView.fill(0);
  }
}
