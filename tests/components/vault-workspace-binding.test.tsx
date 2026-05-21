// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { createEmptyDraft, createEntryInput } from "../../src/features/vault/ui/vault-workspace";

describe("createEntryInput binding", () => {
  it("uses the catalog provider id + category tag when a provider is bound", () => {
    const draft = { ...createEmptyDraft(), displayName: "Google Konto", loginUrl: "https://accounts.google.com" };
    const input = createEntryInput(draft, { providerId: "google", tags: ["cloud"] });
    expect(input.providerId).toBe("google");
    expect(input.tags).toEqual(["cloud"]);
    expect(input.displayName).toBe("Google Konto");
  });

  it("produces a clean custom entry with no inherited tags when unbound", () => {
    const draft = { ...createEmptyDraft(), displayName: "Mein Verein", loginUrl: "https://verein.example" };
    const input = createEntryInput(draft, { providerId: "custom-provider", tags: [] });
    expect(input.providerId).toBe("custom-provider");
    expect(input.tags).toEqual([]);
    expect(input.displayName).toBe("Mein Verein");
  });

  it("trims whitespace on text fields", () => {
    const draft = { ...createEmptyDraft(), displayName: "  Spaced  ", loginUrl: "  https://x.example  " };
    const input = createEntryInput(draft, { providerId: "custom-provider", tags: [] });
    expect(input.displayName).toBe("Spaced");
    expect(input.loginUrl).toBe("https://x.example");
  });

  it("createEmptyDraft returns all-empty strings", () => {
    expect(createEmptyDraft()).toEqual({
      displayName: "",
      loginUrl: "",
      emailUsed: "",
      username: "",
      passwordLocationHint: "",
      notes: "",
      lifecycleStatus: "aktiv",
    });
  });
});
