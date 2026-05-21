// tests/vault-bootstrap.test.ts
import sodium from "libsodium-wrappers-sumo";
import { beforeAll, describe, expect, it } from "vitest";
import { bootstrapVault } from "../src/features/vault/crypto/vault-bootstrap";
import { kekFromPrfOutput } from "../src/features/vault/crypto/passkey-prf";
import { unwrapRootKey } from "../src/features/vault/crypto/webcrypto-rootkey";

beforeAll(async () => { await sodium.ready; });

describe("bootstrapVault", () => {
  it("produces a payload with a prf wrap + recovery wrap and a usable session key", async () => {
    const prf = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const result = await bootstrapVault({ credentialID: "c1", prfOutput: prf.slice(0) });
    expect(result.payload.prfWrappedRootKeys).toHaveLength(1);
    expect(result.payload.recoveryWrappedRootKey.associatedData.type).toBe("vault-root-key-recovery");
    expect(result.sessionRootKey.extractable).toBe(false);
    expect(result.recoveryCode).toMatch(/[0-9A-Z]/);
    // The recovery code must unwrap the recovery blob.
    const { kekFromRecoveryCode } = await import("../src/features/vault/crypto/recovery-kek");
    const kek = await kekFromRecoveryCode(result.recoveryCode, result.payload.kdfPolicy);
    await expect(unwrapRootKey(result.payload.recoveryWrappedRootKey, kek)).resolves.toBeTruthy();
    // The PRF output must unwrap the prf blob.
    await expect(unwrapRootKey(result.payload.prfWrappedRootKeys[0].wrapped, await kekFromPrfOutput(prf.slice(0)))).resolves.toBeTruthy();
  });
});
