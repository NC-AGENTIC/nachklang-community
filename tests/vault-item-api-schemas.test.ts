import { describe, expect, it } from "vitest";

import {
  assertItemAadConsistency,
  putVaultItemBodySchema,
  vaultItemBodySchema,
  type VaultItemBody,
} from "@/features/vault/domain/vault-item-api-schemas";

const VAULT_ID = "11111111-1111-4111-a111-111111111111";
const ITEM_ID = "22222222-2222-4222-a222-222222222222";
const OWNER_ID = "user-abc";

function validBody(overrides: Partial<VaultItemBody> = {}): VaultItemBody {
  return {
    itemId: ITEM_ID,
    revision: 1,
    algorithm: "xchacha20poly1305-ietf",
    nonceBase64: "n".repeat(32),
    ciphertextBase64: "c".repeat(64),
    associatedData: {
      type: "vault-entry",
      version: 1,
      vaultId: VAULT_ID,
      itemId: ITEM_ID,
      ownerId: OWNER_ID,
      revision: 1,
    },
    ...overrides,
  };
}

describe("vault-item-api-schemas", () => {
  it("accepts a valid POST body with revision 1", () => {
    expect(vaultItemBodySchema.safeParse(validBody()).success).toBe(true);
  });

  it("accepts the v2 aes-256-gcm algorithm", () => {
    expect(vaultItemBodySchema.safeParse(validBody({ algorithm: "aes-256-gcm" })).success).toBe(true);
  });

  it("rejects an unknown algorithm", () => {
    expect(
      vaultItemBodySchema.safeParse(validBody({ algorithm: "rot13" as VaultItemBody["algorithm"] })).success,
    ).toBe(false);
  });

  it("rejects a POST body with revision !== 1", () => {
    expect(
      vaultItemBodySchema.safeParse(
        validBody({
          revision: 2,
          associatedData: { ...validBody().associatedData, revision: 2 },
        })
      ).success
    ).toBe(false);
  });

  it("accepts a PUT body with revision >= 2", () => {
    expect(
      putVaultItemBodySchema.safeParse(
        validBody({
          revision: 2,
          associatedData: { ...validBody().associatedData, revision: 2 },
        })
      ).success
    ).toBe(true);
  });

  it("rejects a PUT body with revision 1", () => {
    expect(putVaultItemBodySchema.safeParse(validBody()).success).toBe(false);
  });

  it("rejects when associatedData.itemId does not match top-level itemId", () => {
    const bad = validBody({
      associatedData: { ...validBody().associatedData, itemId: "different" },
    });
    expect(vaultItemBodySchema.safeParse(bad).success).toBe(false);
  });

  it("rejects when associatedData.revision does not match top-level revision", () => {
    const bad = validBody({
      revision: 1,
      associatedData: { ...validBody().associatedData, revision: 7 },
    });
    expect(vaultItemBodySchema.safeParse(bad).success).toBe(false);
  });

  it("assertItemAadConsistency throws on vaultId mismatch", () => {
    const body = validBody();
    expect(() =>
      assertItemAadConsistency(body, {
        ownerVaultId: "other-vault",
        urlItemId: ITEM_ID,
        ownerUserId: OWNER_ID,
      })
    ).toThrowError(/vaultId/);
  });

  it("assertItemAadConsistency throws on urlItemId mismatch", () => {
    const body = validBody();
    expect(() =>
      assertItemAadConsistency(body, {
        ownerVaultId: VAULT_ID,
        urlItemId: "other-item",
        ownerUserId: OWNER_ID,
      })
    ).toThrowError(/itemId/);
  });

  it("assertItemAadConsistency throws on ownerId mismatch", () => {
    const body = validBody();
    expect(() =>
      assertItemAadConsistency(body, {
        ownerVaultId: VAULT_ID,
        urlItemId: ITEM_ID,
        ownerUserId: "user-other",
      })
    ).toThrowError(/ownerId/);
  });

  it("assertItemAadConsistency passes when everything matches", () => {
    const body = validBody();
    expect(() =>
      assertItemAadConsistency(body, {
        ownerVaultId: VAULT_ID,
        urlItemId: ITEM_ID,
        ownerUserId: OWNER_ID,
      })
    ).not.toThrow();
  });
});
