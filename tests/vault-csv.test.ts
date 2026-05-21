import { describe, expect, it } from "vitest";

import { entriesToCsv } from "@/features/vault/domain/vault-csv";
import type { VaultWorklistEntry } from "@/features/vault/domain/vault-worklist";

function entry(overrides: Partial<VaultWorklistEntry> = {}): VaultWorklistEntry {
  return {
    itemId: "i1",
    revision: 1,
    providerId: "google",
    displayName: "Google",
    loginUrl: "https://accounts.google.com",
    emailUsed: "a@b.test",
    username: "user1",
    passwordLocationHint: "1Password",
    notes: "",
    tags: ["mail", "wichtig"],
    lifecycleStatus: "aktiv",
    status: "aktiv",
    createdAt: "2026-05-21T10:00:00.000Z",
    updatedAt: "2026-05-21T10:00:00.000Z",
    ...overrides,
  };
}

describe("entriesToCsv", () => {
  it("writes a header row and one row per entry", () => {
    const csv = entriesToCsv([entry()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("Anbieter");
    expect(lines[1]).toContain("Google");
    expect(lines[1]).toContain("https://accounts.google.com");
    expect(lines).toHaveLength(2);
  });

  it("escapes cells containing commas, quotes and newlines", () => {
    const csv = entriesToCsv([entry({ notes: 'hat, "Anführungs"\nzeichen' })]);
    // the whole cell is quoted and inner quotes are doubled
    expect(csv).toContain('"hat, ""Anführungs""');
  });

  it("joins tags with a separator and tolerates empty optional fields", () => {
    const csv = entriesToCsv([entry({ emailUsed: "", username: "", notes: "", tags: ["a", "b"] })]);
    const row = csv.split("\r\n")[1];
    expect(row).toContain("a; b");
  });
});
