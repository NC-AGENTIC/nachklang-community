import sodium from "libsodium-wrappers-sumo";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_KDF_POLICY,
  generateKdfPolicy,
  generateRootKey,
  verifyKdfPolicy,
} from "@/features/vault/crypto/vault-crypto";

describe("generateRootKey", () => {
  it("returns 32 bytes of randomness", async () => {
    await sodium.ready;
    const a = generateRootKey();
    const b = generateRootKey();
    expect(a).toHaveLength(32);
    expect(b).toHaveLength(32);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});

describe("generateKdfPolicy", () => {
  it("produces a policy that satisfies the security floor", async () => {
    await sodium.ready;
    const policy = generateKdfPolicy();
    expect(policy.algorithm).toBe("argon2id");
    expect(policy.version).toBe(1);
    expect(policy.operationsLimit).toBe(DEFAULT_KDF_POLICY.operationsLimit);
    expect(policy.memoryLimitBytes).toBe(DEFAULT_KDF_POLICY.memoryLimitBytes);
    expect(typeof policy.saltBase64).toBe("string");
    expect(policy.saltBase64.length).toBeGreaterThan(0);
    expect(() => verifyKdfPolicy(policy)).not.toThrow();
  });

  it("produces a fresh salt on every call", async () => {
    await sodium.ready;
    const a = generateKdfPolicy();
    const b = generateKdfPolicy();
    expect(a.saltBase64).not.toBe(b.saltBase64);
  });
});
