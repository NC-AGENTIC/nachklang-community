import sodium from "libsodium-wrappers-sumo";

import { toArrayBufferView } from "@/features/vault/crypto/vault-crypto";
import { LIFECYCLE_STATUSES, type LifecycleStatus } from "@/features/vault/domain/vault-entry";

const IV_BYTES = 12;

export type ItemStatusBlob = { nonceBase64: string; ciphertextBase64: string };
type Binding = { vaultId: string; itemId: string };

function isLifecycleStatus(value: string): value is LifecycleStatus {
  return (LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

// AAD binds the ciphertext to (vault, item) so a blob can't be replayed onto another item/owner.
// cuid/uuid identifiers never contain the delimiter, so a flat string is unambiguous. Per-trustee
// segregation is enforced by the DB (rows are keyed + filtered by trusteeUserId).
function aad(binding: Binding): Uint8Array {
  return sodium.from_string(`share-item-progress|${binding.vaultId}|${binding.itemId}`);
}

function toB64(value: Uint8Array): string {
  return sodium.to_base64(value, sodium.base64_variants.URLSAFE_NO_PADDING);
}

function fromB64(value: string): Uint8Array {
  return sodium.from_base64(value, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export async function encryptItemStatus(
  rootKey: CryptoKey,
  input: Binding & { status: LifecycleStatus },
): Promise<ItemStatusBlob> {
  await sodium.ready;
  if (!isLifecycleStatus(input.status)) throw new Error("invalid_status");
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = sodium.from_string(JSON.stringify({ status: input.status }));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: toArrayBufferView(aad(input)) },
      rootKey,
      toArrayBufferView(plaintext),
    ),
  );
  return { nonceBase64: toB64(iv), ciphertextBase64: toB64(ciphertext) };
}

export async function decryptItemStatus(
  rootKey: CryptoKey,
  input: Binding & ItemStatusBlob,
): Promise<LifecycleStatus> {
  await sodium.ready;
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBufferView(fromB64(input.nonceBase64)),
        additionalData: toArrayBufferView(aad(input)),
      },
      rootKey,
      toArrayBufferView(fromB64(input.ciphertextBase64)),
    ),
  );
  const parsed = JSON.parse(sodium.to_string(plaintext)) as { status?: string };
  if (!parsed.status || !isLifecycleStatus(parsed.status)) throw new Error("invalid_status");
  return parsed.status;
}
