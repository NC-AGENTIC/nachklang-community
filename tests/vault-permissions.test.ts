import { describe, expect, it } from "vitest";

import {
  assertVaultWriteAllowed,
  type VaultMember,
} from "../src/features/vault/domain/vault-permissions";

const activeAdmin: VaultMember = {
  userId: "owner-1",
  email: "owner@example.org",
  displayName: "Vault Admin",
  role: "admin",
  status: "active",
};

describe("assertVaultWriteAllowed", () => {
  it("accepts an active admin", () => {
    expect(() => assertVaultWriteAllowed(activeAdmin)).not.toThrow();
  });

  it("rejects an admin that is not active", () => {
    expect(() =>
      assertVaultWriteAllowed({ ...activeAdmin, status: "pending" }),
    ).toThrow(/active vault admin/i);
  });

  it("rejects a non-admin actor", () => {
    expect(() =>
      assertVaultWriteAllowed({ ...activeAdmin, role: "reader" as never }),
    ).toThrow(/active vault admin/i);
  });
});
