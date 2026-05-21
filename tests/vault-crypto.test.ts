import { describe, expect, it } from "vitest";

import {
  DEFAULT_KDF_POLICY,
  MIN_KDF_POLICY,
  decryptVaultEntry,
  decryptVaultEntryV2,
  deriveWrappingKey,
  encryptVaultEntry,
  encryptVaultEntryV2,
  generateKdfPolicy,
  generateRootKey,
  importRootKey,
  verifyKdfPolicy,
} from "../src/features/vault/crypto/vault-crypto";

const sampleEntry = {
  providerId: "bund-id",
  displayName: "BundID",
  loginUrl: "https://id.bund.de",
  emailUsed: "person@example.org",
  username: "person-123",
  passwordLocationHint: "Im lokalen Passwortmanager unter BundID",
  notes: "",
  tags: ["behoerde"],
  lastReviewedAt: "2026-05-18",
};

describe("vault crypto", () => {
  it("keeps default Argon2id work factors above the minimum policy", () => {
    expect(DEFAULT_KDF_POLICY.algorithm).toBe("argon2id");
    expect(DEFAULT_KDF_POLICY.memoryLimitBytes).toBeGreaterThanOrEqual(MIN_KDF_POLICY.memoryLimitBytes);
    expect(DEFAULT_KDF_POLICY.operationsLimit).toBeGreaterThanOrEqual(MIN_KDF_POLICY.operationsLimit);
    expect(() => verifyKdfPolicy({ ...DEFAULT_KDF_POLICY, memoryLimitBytes: 1024 })).toThrow(
      /memoryLimitBytes/,
    );
  });

  it("derives a 32-byte wrapping key from a passphrase via Argon2id", async () => {
    const policy = generateKdfPolicy();
    const key = await deriveWrappingKey("correct horse battery staple", policy);
    expect(key.length).toBe(32);
    const same = await deriveWrappingKey("correct horse battery staple", policy);
    expect([...same]).toEqual([...key]);
    const other = await deriveWrappingKey("wrong passphrase", policy);
    expect([...other]).not.toEqual([...key]);
  });

  it("encrypts account metadata with authenticated associated data", async () => {
    const rootKey = generateRootKey();

    const encrypted = await encryptVaultEntry(rootKey, {
      vaultId: "vault-1",
      itemId: "item-1",
      ownerId: "user-1",
      revision: 1,
      plaintext: {
        providerId: "bund-id",
        displayName: "BundID",
        loginUrl: "https://id.bund.de",
        emailUsed: "person@example.org",
        username: "person-123",
        passwordLocationHint: "Im lokalen Passwortmanager unter BundID",
        notes: "",
        tags: ["behoerde"],
        lastReviewedAt: "2026-05-18",
      },
    });

    const decrypted = await decryptVaultEntry(rootKey, encrypted);
    expect(decrypted.displayName).toBe("BundID");

    await expect(
      decryptVaultEntry(rootKey, {
        ...encrypted,
        associatedData: { ...encrypted.associatedData, revision: 0 },
      }),
    ).rejects.toThrow();
  });

  describe("v2 AES-256-GCM (non-extractable WebCrypto, SP6c)", () => {
    const aad = { vaultId: "v-1", itemId: "item-1", ownerId: "user-1", revision: 1 };

    it("imports the root key as a non-extractable CryptoKey", async () => {
      const key = await importRootKey(new Uint8Array(32));
      expect(key.extractable).toBe(false);
      expect(key.type).toBe("secret");
      expect(key.algorithm).toMatchObject({ name: "AES-GCM" });
    });

    it("round-trips an entry under AES-GCM with associated data", async () => {
      const rootKey = await importRootKey(crypto.getRandomValues(new Uint8Array(32)));
      const encrypted = await encryptVaultEntryV2(rootKey, { ...aad, plaintext: sampleEntry });
      expect(encrypted.version).toBe(2);
      expect(encrypted.algorithm).toBe("aes-256-gcm");
      const decrypted = await decryptVaultEntryV2(rootKey, encrypted);
      expect(decrypted.displayName).toBe("BundID");
      expect(decrypted.loginUrl).toBe("https://id.bund.de");
    });

    it("rejects tampered associated data", async () => {
      const rootKey = await importRootKey(crypto.getRandomValues(new Uint8Array(32)));
      const encrypted = await encryptVaultEntryV2(rootKey, { ...aad, plaintext: sampleEntry });
      await expect(
        decryptVaultEntryV2(rootKey, {
          ...encrypted,
          associatedData: { ...encrypted.associatedData, revision: 99 },
        }),
      ).rejects.toThrow();
    });

    it("rejects a wrong key", async () => {
      const rootKey = await importRootKey(crypto.getRandomValues(new Uint8Array(32)));
      const otherKey = await importRootKey(crypto.getRandomValues(new Uint8Array(32)));
      const encrypted = await encryptVaultEntryV2(rootKey, { ...aad, plaintext: sampleEntry });
      await expect(decryptVaultEntryV2(otherKey, encrypted)).rejects.toThrow();
    });

    it("uses a fresh 12-byte IV per encryption", async () => {
      const rootKey = await importRootKey(crypto.getRandomValues(new Uint8Array(32)));
      const a = await encryptVaultEntryV2(rootKey, { ...aad, plaintext: sampleEntry });
      const b = await encryptVaultEntryV2(rootKey, { ...aad, plaintext: sampleEntry });
      expect(a.nonceBase64).not.toBe(b.nonceBase64);
    });
  });
});
