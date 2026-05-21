import { describe, expect, it } from "vitest";

import {
  PROVIDER_CATALOG,
  assertNoSecretFields,
  vaultEntrySchema,
} from "../src/features/vault/domain/vault-entry";

describe("vault entry domain model", () => {
  it("accepts administrative account metadata without password material", () => {
    const entry = vaultEntrySchema.parse({
      providerId: "bund-id",
      displayName: "BundID",
      loginUrl: "https://id.bund.de",
      emailUsed: "person@example.org",
      username: "person-123",
      passwordLocationHint: "Im lokalen Passwortmanager unter BundID",
      notes: "Jährliche Prüfung im Januar.",
      tags: ["behoerde", "wichtig"],
      lastReviewedAt: "2026-05-18",
    });

    expect(entry.displayName).toBe("BundID");
    expect(entry).not.toHaveProperty("password");
  });

  it("defaults lifecycleStatus to aktiv for legacy entries without it", () => {
    const entry = vaultEntrySchema.parse({
      providerId: "bund-id",
      displayName: "BundID",
      loginUrl: "https://id.bund.de",
      lastReviewedAt: "2026-05-18", // deprecated field still tolerated
    });
    expect(entry.lifecycleStatus).toBe("aktiv");
  });

  it("accepts the four lifecycle statuses and rejects unknown ones", () => {
    for (const status of ["aktiv", "stillgelegt", "anbieter-informiert", "geloescht"] as const) {
      const entry = vaultEntrySchema.parse({
        providerId: "p",
        displayName: "P",
        loginUrl: "https://p.example",
        lifecycleStatus: status,
      });
      expect(entry.lifecycleStatus).toBe(status);
    }
    expect(() =>
      vaultEntrySchema.parse({
        providerId: "p",
        displayName: "P",
        loginUrl: "https://p.example",
        lifecycleStatus: "geschlossen",
      }),
    ).toThrow();
  });

  it("rejects direct secret fields even before encryption", () => {
    expect(() =>
      vaultEntrySchema.parse({
        providerId: "bank",
        displayName: "Bank",
        loginUrl: "https://bank.example",
        emailUsed: "person@example.org",
        password: "must-never-be-stored",
      }),
    ).toThrow();

    expect(() =>
      assertNoSecretFields({
        providerId: "bank",
        secretAnswer: "blue",
      }),
    ).toThrow(/secretAnswer/);
  });

  it("ships with a curated HTTPS provider catalog", () => {
    expect(PROVIDER_CATALOG.length).toBeGreaterThanOrEqual(8);
    expect(PROVIDER_CATALOG.every((provider) => provider.loginUrl.startsWith("https://"))).toBe(true);
  });
});
