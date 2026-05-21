// tests/webcrypto-rootkey.test.ts
import { describe, expect, it } from "vitest";
import {
  generateRootKeyCryptoKey,
  wrapRootKey,
  unwrapRootKey,
  type WebCryptoWrappedRootKey,
} from "../src/features/vault/crypto/webcrypto-rootkey";

async function aesKekFrom(bytes: Uint8Array): Promise<CryptoKey> {
  const raw = new Uint8Array(bytes.byteLength);
  raw.set(bytes);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["wrapKey", "unwrapKey"]);
}

describe("webcrypto root key", () => {
  it("wraps then unwraps to a usable non-extractable AES-GCM key", async () => {
    const kek = await aesKekFrom(crypto.getRandomValues(new Uint8Array(32)));
    const rootKey = await generateRootKeyCryptoKey();
    const aad = { type: "vault-root-key-prf", vaultId: "v1", credentialID: "c1", version: 2 } as const;

    const env = await wrapRootKey(rootKey, kek, aad);
    expect(env.algorithm).toBe("aes-256-gcm");
    expect(env.version).toBe(2);

    const unwrapped = await unwrapRootKey(env, kek);
    expect(unwrapped.extractable).toBe(false);
    // The unwrapped key must actually work for AES-GCM.
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, unwrapped, new TextEncoder().encode("hi"));
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, unwrapped, ct);
    expect(new TextDecoder().decode(pt)).toBe("hi");
  });

  it("fails to unwrap if the associated data is tampered", async () => {
    const kek = await aesKekFrom(crypto.getRandomValues(new Uint8Array(32)));
    const env = await wrapRootKey(await generateRootKeyCryptoKey(), kek, {
      type: "vault-root-key-prf", vaultId: "v1", credentialID: "c1", version: 2,
    });
    const tampered: WebCryptoWrappedRootKey = { ...env, associatedData: { ...env.associatedData, vaultId: "evil" } };
    await expect(unwrapRootKey(tampered, kek)).rejects.toBeTruthy();
  });

  it("fails to unwrap with the wrong KEK", async () => {
    const kek = await aesKekFrom(crypto.getRandomValues(new Uint8Array(32)));
    const other = await aesKekFrom(crypto.getRandomValues(new Uint8Array(32)));
    const env = await wrapRootKey(await generateRootKeyCryptoKey(), kek, {
      type: "vault-root-key-recovery", vaultId: "v1", version: 2,
    });
    await expect(unwrapRootKey(env, other)).rejects.toBeTruthy();
  });
});
