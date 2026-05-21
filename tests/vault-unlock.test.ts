// tests/vault-unlock.test.ts
import sodium from "libsodium-wrappers-sumo";
import { beforeAll, describe, expect, it } from "vitest";
import { bootstrapVault } from "../src/features/vault/crypto/vault-bootstrap";
import { unlockWithPrf, unlockWithRecoveryCode } from "../src/features/vault/crypto/vault-unlock";

beforeAll(async () => { await sodium.ready; });

describe("vault unlock", () => {
  it("unlocks with a matching PRF assertion", async () => {
    const prf = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const boot = await bootstrapVault({ credentialID: "c1", prfOutput: prf.slice(0) });
    const key = await unlockWithPrf(boot.payload.prfWrappedRootKeys, { credentialID: "c1", prfOutput: prf.slice(0) });
    expect(key.extractable).toBe(false);
  });

  it("yields an extractable key when extractable:true is requested", async () => {
    const prf = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const boot = await bootstrapVault({ credentialID: "c1", prfOutput: prf.slice(0) });
    const key = await unlockWithPrf(
      boot.payload.prfWrappedRootKeys,
      { credentialID: "c1", prfOutput: prf.slice(0) },
      true,
    );
    expect(key.extractable).toBe(true);
  });

  it("throws when no blob matches the credential", async () => {
    const boot = await bootstrapVault({ credentialID: "c1", prfOutput: crypto.getRandomValues(new Uint8Array(32)).buffer });
    await expect(unlockWithPrf(boot.payload.prfWrappedRootKeys, { credentialID: "zzz", prfOutput: new ArrayBuffer(32) })).rejects.toBeTruthy();
  });

  it("unlocks with the recovery code", async () => {
    const boot = await bootstrapVault({ credentialID: "c1", prfOutput: crypto.getRandomValues(new Uint8Array(32)).buffer });
    const key = await unlockWithRecoveryCode(boot.payload.recoveryWrappedRootKey, boot.recoveryCode, boot.payload.kdfPolicy);
    expect(key.extractable).toBe(false);
  });
});
