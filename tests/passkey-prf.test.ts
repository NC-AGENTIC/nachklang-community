// tests/passkey-prf.test.ts
import { describe, expect, it } from "vitest";
import { kekFromPrfOutput, prfEvalSalt } from "../src/features/vault/crypto/passkey-prf";
import { generateRootKeyCryptoKey, wrapRootKey, unwrapRootKey } from "../src/features/vault/crypto/webcrypto-rootkey";

describe("passkey prf", () => {
  it("derives a stable KEK from the same PRF output and round-trips a root key", async () => {
    const prf = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const kekA = await kekFromPrfOutput(prf.slice(0));
    const kekB = await kekFromPrfOutput(prf.slice(0));
    const aad = { type: "vault-root-key-prf", vaultId: "v1", credentialID: "c1", version: 2 } as const;
    const env = await wrapRootKey(await generateRootKeyCryptoKey(), kekA, aad);
    // A KEK derived again from the same PRF output must unwrap it.
    await expect(unwrapRootKey(env, kekB)).resolves.toBeTruthy();
  });

  it("derives a different KEK from a different PRF output", async () => {
    const aad = { type: "vault-root-key-prf", vaultId: "v1", credentialID: "c1", version: 2 } as const;
    const env = await wrapRootKey(await generateRootKeyCryptoKey(),
      await kekFromPrfOutput(crypto.getRandomValues(new Uint8Array(32)).buffer), aad);
    const wrong = await kekFromPrfOutput(crypto.getRandomValues(new Uint8Array(32)).buffer);
    await expect(unwrapRootKey(env, wrong)).rejects.toBeTruthy();
  });

  it("exposes a deterministic 32-byte PRF eval salt", async () => {
    const a = new Uint8Array(await prfEvalSalt());
    const b = new Uint8Array(await prfEvalSalt());
    expect(a.length).toBe(32);
    expect([...a]).toEqual([...b]);
  });
});
