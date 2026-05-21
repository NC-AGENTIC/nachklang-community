// tests/passkey-port.test.ts
import { describe, expect, it } from "vitest";
import { kekFromPrfOutput } from "../src/features/vault/crypto/passkey-prf";
import { generateRootKeyCryptoKey, wrapRootKey, unwrapRootKey } from "../src/features/vault/crypto/webcrypto-rootkey";
import { buildPrfWrappedRootKey } from "../src/features/vault/crypto/passkey-port";

describe("buildPrfWrappedRootKey", () => {
  it("wraps a root key for a credential's PRF output and unwraps with the same output", async () => {
    const prf = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const rootKey = await generateRootKeyCryptoKey();
    const env = await buildPrfWrappedRootKey(rootKey, { credentialID: "c1", prfOutput: prf.slice(0) }, "v1");
    expect(env.associatedData.credentialID).toBe("c1");
    const kek = await kekFromPrfOutput(prf.slice(0));
    await expect(unwrapRootKey(env, kek)).resolves.toBeTruthy();
  });
});
