import { describe, expect, it } from "vitest";

import { generateKdfPolicy } from "@/features/vault/crypto/vault-crypto";
import { generateRecoveryCode } from "@/features/vault/crypto/recovery-code";
import {
  bootstrapUserKeypair,
  bootstrapUserKeypairPrfOnly,
} from "@/features/trustee/crypto/user-keypair-bootstrap";
import {
  unlockKeypairWithPrf,
  unlockKeypairWithRecovery,
} from "@/features/trustee/crypto/user-keypair-unlock";
import { openSealed, sealToPublicKey, publicKeyFromBase64 } from "@/features/trustee/crypto/trustee-keypair";

const reg = {
  credentialID: "cred-A",
  prfOutput: new TextEncoder().encode("prf-output-bytes-A").buffer,
};
const recoveryCode = generateRecoveryCode();
const wrongCode = generateRecoveryCode();

describe("user keypair bootstrap + unlock", () => {
  it("unlocks via PRF and recovers the same keypair that the public key belongs to", async () => {
    const kdfPolicy = generateKdfPolicy();
    const boot = await bootstrapUserKeypair(reg, recoveryCode, kdfPolicy);

    const unlocked = await unlockKeypairWithPrf(boot.payload.prfWrappedPrivateKeys, {
      credentialID: reg.credentialID,
      prfOutput: reg.prfOutput,
    });

    // A message sealed to the PUBLISHED public key must open with the PRF-unlocked private key.
    const sealed = await sealToPublicKey(
      new Uint8Array([1, 2, 3]),
      publicKeyFromBase64(boot.payload.publicKey),
    );
    expect(await openSealed(sealed, unlocked)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("unlocks via the recovery code to the same keypair", async () => {
    const kdfPolicy = generateKdfPolicy();
    const boot = await bootstrapUserKeypair(reg, recoveryCode, kdfPolicy);

    const unlocked = await unlockKeypairWithRecovery(
      boot.payload.recoveryWrappedPrivateKey!,
      recoveryCode,
      kdfPolicy,
    );

    const sealed = await sealToPublicKey(
      new Uint8Array([4, 5, 6]),
      publicKeyFromBase64(boot.payload.publicKey),
    );
    expect(await openSealed(sealed, unlocked)).toEqual(new Uint8Array([4, 5, 6]));
  });

  it("rejects the recovery unlock with a wrong code", async () => {
    const kdfPolicy = generateKdfPolicy();
    const boot = await bootstrapUserKeypair(reg, recoveryCode, kdfPolicy);
    await expect(
      unlockKeypairWithRecovery(boot.payload.recoveryWrappedPrivateKey!, wrongCode, kdfPolicy),
    ).rejects.toBeTruthy();
  });
});

describe("bootstrapUserKeypairPrfOnly (lazy provisioning for existing users)", () => {
  it("produces a PRF-unlockable keypair with no recovery wrap", async () => {
    const boot = await bootstrapUserKeypairPrfOnly(reg);

    expect(boot.payload.recoveryWrappedPrivateKey).toBeUndefined();
    expect(boot.payload.prfWrappedPrivateKeys).toHaveLength(1);

    const unlocked = await unlockKeypairWithPrf(boot.payload.prfWrappedPrivateKeys, {
      credentialID: reg.credentialID,
      prfOutput: reg.prfOutput,
    });
    const sealed = await sealToPublicKey(
      new Uint8Array([7, 8, 9]),
      publicKeyFromBase64(boot.payload.publicKey),
    );
    expect(await openSealed(sealed, unlocked)).toEqual(new Uint8Array([7, 8, 9]));
  });
});
