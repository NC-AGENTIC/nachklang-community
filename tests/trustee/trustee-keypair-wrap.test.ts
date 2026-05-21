import { describe, expect, it } from "vitest";

import { generateTrusteeKeypair } from "@/features/trustee/crypto/trustee-keypair";
import {
  unwrapTrusteePrivateKey,
  wrapTrusteePrivateKey,
} from "@/features/trustee/crypto/trustee-keypair-wrap";

// A KEK with wrapKey/unwrapKey usages, standing in for a PRF- or recovery-derived KEK.
async function testKek(): Promise<CryptoKey> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["wrapKey", "unwrapKey"]);
}

describe("trustee private-key wrapping", () => {
  it("round-trips the private key through wrap/unwrap", async () => {
    const kp = await generateTrusteeKeypair();
    const kek = await testKek();
    const env = await wrapTrusteePrivateKey(kp.privateKey, kek, {
      type: "trustee-private-key-prf",
      keypairId: "kp-1",
      credentialID: "cred-1",
      version: 2,
    });
    const recovered = await unwrapTrusteePrivateKey(env, kek);
    expect(recovered).toEqual(kp.privateKey);
  });

  it("fails to unwrap with a different KEK", async () => {
    const kp = await generateTrusteeKeypair();
    const env = await wrapTrusteePrivateKey(kp.privateKey, await testKek(), {
      type: "trustee-private-key-recovery",
      keypairId: "kp-1",
      version: 2,
    });
    await expect(unwrapTrusteePrivateKey(env, await testKek())).rejects.toBeTruthy();
  });

  it("fails to unwrap when the AAD is tampered with", async () => {
    const kp = await generateTrusteeKeypair();
    const kek = await testKek();
    const env = await wrapTrusteePrivateKey(kp.privateKey, kek, {
      type: "trustee-private-key-prf",
      keypairId: "kp-1",
      credentialID: "cred-1",
      version: 2,
    });
    const tampered = { ...env, associatedData: { ...env.associatedData, keypairId: "kp-2" } };
    await expect(unwrapTrusteePrivateKey(tampered, kek)).rejects.toBeTruthy();
  });

  it("fails to unwrap when the ciphertext is tampered with", async () => {
    const kp = await generateTrusteeKeypair();
    const kek = await testKek();
    const env = await wrapTrusteePrivateKey(kp.privateKey, kek, {
      type: "trustee-private-key-prf",
      keypairId: "kp-1",
      version: 2,
    });
    const bytes = atob(env.ciphertextBase64).split("").map((c) => c.charCodeAt(0));
    bytes[0] ^= 0xff;
    const tampered = { ...env, ciphertextBase64: btoa(String.fromCharCode(...bytes)) };
    await expect(unwrapTrusteePrivateKey(tampered, kek)).rejects.toBeTruthy();
  });
});
