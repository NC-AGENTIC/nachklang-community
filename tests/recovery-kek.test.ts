// tests/recovery-kek.test.ts
import sodium from "libsodium-wrappers-sumo";
import { beforeAll, describe, expect, it } from "vitest";
import { generateKdfPolicy } from "../src/features/vault/crypto/vault-crypto";
import { kekFromRecoveryCode } from "../src/features/vault/crypto/recovery-kek";
import { generateRootKeyCryptoKey, wrapRootKey, unwrapRootKey } from "../src/features/vault/crypto/webcrypto-rootkey";

beforeAll(async () => { await sodium.ready; });

describe("recovery kek", () => {
  it("derives a KEK that round-trips the root key (normalising the code)", async () => {
    const policy = generateKdfPolicy();
    const aad = { type: "vault-root-key-recovery", vaultId: "v1", version: 2 } as const;
    const env = await wrapRootKey(await generateRootKeyCryptoKey(), await kekFromRecoveryCode("abcd efgh ijkl mnop qrst uvwx", policy), aad);
    // Same code with different formatting must still unwrap.
    const kek2 = await kekFromRecoveryCode("ABCD-EFGH-IJKL-MNOP-QRST-UVWX", policy);
    await expect(unwrapRootKey(env, kek2)).resolves.toBeTruthy();
  });

  it("rejects a wrong recovery code", async () => {
    const policy = generateKdfPolicy();
    const env = await wrapRootKey(await generateRootKeyCryptoKey(),
      await kekFromRecoveryCode("abcd efgh ijkl mnop qrst uvwx", policy),
      { type: "vault-root-key-recovery", vaultId: "v1", version: 2 });
    await expect(unwrapRootKey(env, await kekFromRecoveryCode("zzzz zzzz zzzz zzzz zzzz zzzz", policy))).rejects.toBeTruthy();
  });
});
