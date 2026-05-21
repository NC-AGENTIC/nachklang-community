import sodium from "libsodium-wrappers-sumo";

import { assertNoSecretFields, type VaultEntry, type VaultEntryInput, vaultEntrySchema } from "../domain/vault-entry";

export type KdfPolicyBase = {
  algorithm: "argon2id";
  operationsLimit: number;
  memoryLimitBytes: number;
};

export type KdfPolicy = KdfPolicyBase & {
  version: 1;
  saltBase64: string;
};

export type VaultEntryAssociatedData = {
  type: "vault-entry";
  version: 1;
  vaultId: string;
  itemId: string;
  ownerId: string;
  revision: number;
};

export type EncryptedVaultEntryV1 = {
  version: 1;
  algorithm: "xchacha20poly1305-ietf";
  nonceBase64: string;
  ciphertextBase64: string;
  associatedData: VaultEntryAssociatedData;
};

export type EncryptedVaultEntryV2 = {
  version: 2;
  algorithm: "aes-256-gcm";
  nonceBase64: string;
  ciphertextBase64: string;
  associatedData: VaultEntryAssociatedData;
};

// v1 = XChaCha20-Poly1305 (libsodium, raw-byte key).
// v2 = AES-256-GCM (WebCrypto, non-extractable CryptoKey). SP6c.
export type EncryptedVaultEntry = EncryptedVaultEntryV1 | EncryptedVaultEntryV2;

const AES_GCM_IV_BYTES = 12;

export const MIN_KDF_POLICY: KdfPolicyBase = {
  algorithm: "argon2id",
  operationsLimit: 2,
  memoryLimitBytes: 19 * 1024 * 1024,
};

export const DEFAULT_KDF_POLICY: KdfPolicyBase = {
  algorithm: "argon2id",
  operationsLimit: 3,
  memoryLimitBytes: 64 * 1024 * 1024,
};

const ROOT_KEY_BYTES = 32;
const KDF_SALT_BYTES = 16;

export function generateRootKey(): Uint8Array {
  return sodium.randombytes_buf(ROOT_KEY_BYTES);
}

export function generateKdfPolicy(): KdfPolicy {
  const salt = sodium.randombytes_buf(KDF_SALT_BYTES);
  return {
    ...DEFAULT_KDF_POLICY,
    version: 1,
    saltBase64: sodium.to_base64(salt, sodium.base64_variants.URLSAFE_NO_PADDING),
  };
}

export async function deriveWrappingKey(passphrase: string, policy: KdfPolicy): Promise<Uint8Array> {
  await sodium.ready;
  verifyKdfPolicy(policy);
  return sodium.crypto_pwhash(
    ROOT_KEY_BYTES,
    passphrase,
    fromBase64(policy.saltBase64),
    policy.operationsLimit,
    policy.memoryLimitBytes,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
}

export function verifyKdfPolicy(policy: KdfPolicyBase): void {
  if (policy.algorithm !== MIN_KDF_POLICY.algorithm) {
    throw new Error(`Unsupported KDF algorithm "${policy.algorithm}".`);
  }
  if (policy.operationsLimit < MIN_KDF_POLICY.operationsLimit) {
    throw new Error("KDF operationsLimit is below the NachKlang security minimum.");
  }
  if (policy.memoryLimitBytes < MIN_KDF_POLICY.memoryLimitBytes) {
    throw new Error("KDF memoryLimitBytes is below the NachKlang security minimum.");
  }
}

export async function encryptVaultEntry(
  rootKey: Uint8Array,
  input: {
    vaultId: string;
    itemId: string;
    ownerId: string;
    revision: number;
    plaintext: VaultEntryInput;
  },
): Promise<EncryptedVaultEntry> {
  await sodium.ready;
  assertKeyLength(rootKey, "rootKey");
  assertNoSecretFields(input.plaintext);
  const plaintext = vaultEntrySchema.parse(input.plaintext);
  const associatedData: VaultEntryAssociatedData = {
    type: "vault-entry",
    version: 1,
    vaultId: input.vaultId,
    itemId: input.itemId,
    ownerId: input.ownerId,
    revision: input.revision,
  };
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    textBytes(canonicalJson(plaintext)),
    aadBytes(associatedData),
    null,
    nonce,
    rootKey,
  );

  return {
    version: 1,
    algorithm: "xchacha20poly1305-ietf",
    nonceBase64: toBase64(nonce),
    ciphertextBase64: toBase64(ciphertext),
    associatedData,
  };
}

export async function decryptVaultEntry(rootKey: Uint8Array, encrypted: EncryptedVaultEntry): Promise<VaultEntry> {
  await sodium.ready;
  assertKeyLength(rootKey, "rootKey");
  const plaintextBytes = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    fromBase64(encrypted.ciphertextBase64),
    aadBytes(encrypted.associatedData),
    fromBase64(encrypted.nonceBase64),
    rootKey,
  );
  return vaultEntrySchema.parse(JSON.parse(sodium.to_string(plaintextBytes)));
}

// --- SP6c: non-extractable WebCrypto (AES-256-GCM) entry encryption (v2) ---

/**
 * Import the raw 32-byte root key as a NON-EXTRACTABLE AES-256-GCM CryptoKey.
 * After this, the raw bytes can (and should) be memzeroed: the key material is
 * no longer reachable from JS, only usable via crypto.subtle.
 */
export async function importRootKey(rootKeyBytes: Uint8Array): Promise<CryptoKey> {
  assertKeyLength(rootKeyBytes, "rootKey");
  return crypto.subtle.importKey("raw", toArrayBufferView(rootKeyBytes), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptVaultEntryV2(
  rootKey: CryptoKey,
  input: {
    vaultId: string;
    itemId: string;
    ownerId: string;
    revision: number;
    plaintext: VaultEntryInput;
  },
): Promise<EncryptedVaultEntryV2> {
  await sodium.ready;
  assertNoSecretFields(input.plaintext);
  const plaintext = vaultEntrySchema.parse(input.plaintext);
  const associatedData: VaultEntryAssociatedData = {
    type: "vault-entry",
    version: 1,
    vaultId: input.vaultId,
    itemId: input.itemId,
    ownerId: input.ownerId,
    revision: input.revision,
  };
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: toArrayBufferView(aadBytes(associatedData)) },
      rootKey,
      toArrayBufferView(textBytes(canonicalJson(plaintext))),
    ),
  );

  return {
    version: 2,
    algorithm: "aes-256-gcm",
    nonceBase64: toBase64(iv),
    ciphertextBase64: toBase64(ciphertext),
    associatedData,
  };
}

export async function decryptVaultEntryV2(rootKey: CryptoKey, encrypted: EncryptedVaultEntryV2): Promise<VaultEntry> {
  await sodium.ready;
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBufferView(fromBase64(encrypted.nonceBase64)),
        additionalData: toArrayBufferView(aadBytes(encrypted.associatedData)),
      },
      rootKey,
      toArrayBufferView(fromBase64(encrypted.ciphertextBase64)),
    ),
  );
  return vaultEntrySchema.parse(JSON.parse(sodium.to_string(plaintext)));
}

// Copy into a fresh ArrayBuffer-backed view so WebCrypto's BufferSource typing
// (TS 5.7+) accepts libsodium's Uint8Array<ArrayBufferLike> outputs.
export function toArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function assertKeyLength(key: Uint8Array, label: string): void {
  if (key.length !== ROOT_KEY_BYTES) {
    throw new Error(`${label} must be ${ROOT_KEY_BYTES} bytes.`);
  }
}

function aadBytes(value: unknown): Uint8Array {
  return textBytes(canonicalJson(value));
}

function textBytes(value: string): Uint8Array {
  return sodium.from_string(value);
}

function toBase64(value: Uint8Array): string {
  return sodium.to_base64(value, sodium.base64_variants.URLSAFE_NO_PADDING);
}

function fromBase64(value: string): Uint8Array {
  return sodium.from_base64(value, sodium.base64_variants.URLSAFE_NO_PADDING);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(",")}}`;
}
