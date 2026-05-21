import sodium from "libsodium-wrappers-sumo";
import { describe, expect, it } from "vitest";

import {
  CROCKFORD_ALPHABET,
  formatRecoveryCode,
  generateRecoveryCode,
  normalizeRecoveryCode,
} from "@/features/vault/crypto/recovery-code";

describe("CROCKFORD_ALPHABET", () => {
  it("excludes I, L, O and U", () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32);
    for (const ch of "ILOU") expect(CROCKFORD_ALPHABET).not.toContain(ch);
  });
});

describe("generateRecoveryCode", () => {
  it("returns 24 chars formatted as 6 groups of 4", async () => {
    await sodium.ready;
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}$/);
    expect(normalizeRecoveryCode(code)).toHaveLength(24);
  });

  it("does not repeat across calls", async () => {
    await sodium.ready;
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) seen.add(generateRecoveryCode());
    expect(seen.size).toBe(20);
  });
});

describe("normalizeRecoveryCode", () => {
  it("strips hyphens, whitespace, and uppercases", () => {
    // lowercase l → L → maps to 1 (Crockford L/I → 1); 24 chars after strip
    expect(normalizeRecoveryCode("  a3jk-lpqr-79xz-2hmv-bnk4-9dts ")).toBe("A3JK1PQR79XZ2HMVBNK49DTS");
  });

  it("throws on too-long inputs (does not silently truncate)", () => {
    expect(() => normalizeRecoveryCode("A3JKLPQR79XZ2HMVBNK49DTSY")).toThrow("RECOVERY_CODE_LENGTH");
  });

  it("maps Crockford ambiguous chars (I/L -> 1, O -> 0, U -> V)", () => {
    expect(normalizeRecoveryCode("ABCDEFGHIJKMNPQRSTUVWXYZ")).toBe("ABCDEFGH1JKMNPQRST" + "VVWXYZ");
  });

  it("throws on wrong length", () => {
    expect(() => normalizeRecoveryCode("ABC123")).toThrow("RECOVERY_CODE_LENGTH");
  });

  it("throws on out-of-alphabet chars", () => {
    expect(() => normalizeRecoveryCode("A3JKLPQR79XZ2HMVBNK49DTSYEQ?")).toThrow("RECOVERY_CODE_INVALID_CHAR");
  });
});

describe("formatRecoveryCode", () => {
  it("groups a 24-char normalized string into 6x4 with hyphens", () => {
    expect(formatRecoveryCode("A3JKLPQR79XZ2HMVBNK49DTS")).toBe("A3JK-LPQR-79XZ-2HMV-BNK4-9DTS");
  });
});
