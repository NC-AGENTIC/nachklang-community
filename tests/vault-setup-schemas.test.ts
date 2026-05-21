import { describe, expect, it } from "vitest";
import { createVaultPayloadSchema, webCryptoWrappedRootKeySchema } from "../src/features/vault/domain/vault-setup-schemas";

const wrap = (type: string, credentialID?: string) => ({
  version: 2, algorithm: "aes-256-gcm", ivBase64: "AAAA", ciphertextBase64: "BBBB",
  associatedData: { type, vaultId: "v1", version: 2, ...(credentialID ? { credentialID } : {}) },
});

describe("vault setup schemas", () => {
  it("accepts a create-vault payload with a prf wrap + recovery wrap", () => {
    const parsed = createVaultPayloadSchema.parse({
      vaultId: "v1",
      kdfPolicy: { algorithm: "argon2id", version: 1, operationsLimit: 3, memoryLimitBytes: 67108864, saltBase64: "salt" },
      prfWrappedRootKeys: [{ credentialID: "c1", wrapped: wrap("vault-root-key-prf", "c1") }],
      recoveryWrappedRootKey: wrap("vault-root-key-recovery"),
    });
    expect(parsed.prfWrappedRootKeys[0].credentialID).toBe("c1");
  });

  it("rejects a wrap that smuggles a plaintext root key field", () => {
    expect(() => webCryptoWrappedRootKeySchema.parse({ ...wrap("vault-root-key-prf", "c1"), rootKey: "leak" })).toThrow();
  });

  it("requires at least one prf wrap", () => {
    expect(() => createVaultPayloadSchema.parse({
      vaultId: "v1",
      kdfPolicy: { algorithm: "argon2id", version: 1, operationsLimit: 3, memoryLimitBytes: 67108864, saltBase64: "s" },
      prfWrappedRootKeys: [],
      recoveryWrappedRootKey: wrap("vault-root-key-recovery"),
    })).toThrow();
  });
});
