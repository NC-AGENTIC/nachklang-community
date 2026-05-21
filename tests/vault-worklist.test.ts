import { describe, expect, it } from "vitest";

import type { VaultMember } from "../src/features/vault/domain/vault-permissions";
import {
  createVaultWorklistEntry,
  deleteVaultWorklistEntry,
  toVaultWorklistEntry,
  updateVaultWorklistEntry,
} from "../src/features/vault/domain/vault-worklist";

const admin: VaultMember = {
  userId: "owner-1",
  email: "owner@example.org",
  displayName: "Owner",
  role: "admin",
  status: "active",
};

const reader = {
  userId: "reader-1",
  email: "reader@example.org",
  displayName: "Reader",
  role: "reader",
  status: "active",
} as unknown as VaultMember;

const baseInput = {
  providerId: "bund-id",
  displayName: "BundID",
  loginUrl: "https://id.bund.de",
  emailUsed: "person@example.org",
  username: "person-123",
  passwordLocationHint: "Im lokalen Passwortmanager unter BundID",
  notes: "Notiz.",
  tags: ["identity"],
};

describe("vault worklist", () => {
  it("creates validated entries that default to lifecycle status aktiv", () => {
    const entry = createVaultWorklistEntry(admin, baseInput, {
      idFactory: () => "entry-1",
      now: new Date("2026-05-18T12:00:00.000Z"),
    });

    expect(entry).toMatchObject({
      itemId: "entry-1",
      revision: 1,
      displayName: "BundID",
      status: "aktiv",
      lifecycleStatus: "aktiv",
      updatedAt: "2026-05-18T12:00:00.000Z",
    });

    expect(() =>
      createVaultWorklistEntry(admin, { ...baseInput, password: "must-not-exist" } as never, {
        idFactory: () => "entry-2",
        now: new Date("2026-05-18T12:00:00.000Z"),
      }),
    ).toThrow(/password/);
  });

  it("lets only the active vault admin edit entries and increments revisions", () => {
    const entry = createVaultWorklistEntry(admin, baseInput, {
      idFactory: () => "entry-1",
      now: new Date("2026-05-18T12:00:00.000Z"),
    });

    const updated = updateVaultWorklistEntry(admin, entry, { username: "person-456" }, new Date("2026-05-18T13:00:00.000Z"));

    expect(updated.itemId).toBe("entry-1");
    expect(updated.username).toBe("person-456");
    expect(updated.revision).toBe(2);
    expect(updated.updatedAt).toBe("2026-05-18T13:00:00.000Z");
    expect(() => updateVaultWorklistEntry(reader, entry, { username: "blocked" }, new Date())).toThrow(/admin/i);
  });

  it("changes lifecycle status through an admin update", () => {
    const entry = createVaultWorklistEntry(admin, baseInput, {
      idFactory: () => "entry-1",
      now: new Date("2026-05-18T12:00:00.000Z"),
    });

    const informed = updateVaultWorklistEntry(
      admin,
      entry,
      { lifecycleStatus: "anbieter-informiert" },
      new Date("2026-05-18T15:00:00.000Z"),
    );
    expect(informed.status).toBe("anbieter-informiert");
    expect(informed.lifecycleStatus).toBe("anbieter-informiert");
    expect(informed.revision).toBe(2);

    expect(deleteVaultWorklistEntry(admin, [informed], informed.itemId)).toEqual([]);
    expect(() => deleteVaultWorklistEntry(reader, [informed], informed.itemId)).toThrow(/admin/i);
  });
});

describe("toVaultWorklistEntry", () => {
  it("projects a DecryptedVaultItem and carries its lifecycle status", () => {
    const item = {
      itemId: "abc",
      ownerId: "u1",
      vaultId: "v1",
      revision: 2,
      entry: {
        providerId: "bund-id",
        displayName: "BundID",
        loginUrl: "https://id.bund.de",
        emailUsed: "",
        username: "",
        passwordLocationHint: "",
        notes: "",
        tags: ["behoerde"],
        lifecycleStatus: "stillgelegt" as const,
      },
      createdAt: "2026-05-18T10:00:00.000Z",
      updatedAt: "2026-05-19T10:00:00.000Z",
    };
    const projected = toVaultWorklistEntry(item);
    expect(projected.itemId).toBe("abc");
    expect(projected.status).toBe("stillgelegt");
    expect(projected.displayName).toBe("BundID");
  });

  it("defaults legacy items (no lifecycleStatus) to aktiv", () => {
    const item = {
      itemId: "abc",
      ownerId: "u1",
      vaultId: "v1",
      revision: 1,
      entry: {
        providerId: "bund-id",
        displayName: "BundID",
        loginUrl: "https://id.bund.de",
        emailUsed: "",
        username: "",
        passwordLocationHint: "",
        notes: "",
        tags: [],
        lastReviewedAt: "2025-01-01",
      },
      createdAt: "2025-01-01T10:00:00.000Z",
      updatedAt: "2025-01-01T10:00:00.000Z",
    };
    const projected = toVaultWorklistEntry(item);
    expect(projected.status).toBe("aktiv");
  });
});
