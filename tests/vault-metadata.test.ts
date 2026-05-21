import { describe, expect, it } from "vitest";

import { formatVaultUpdatedLabel } from "../src/features/vault/domain/vault-metadata";

describe("vault metadata", () => {
  it("formats vault update timestamps for the navigation badge", () => {
    expect(formatVaultUpdatedLabel("2026-05-18T15:26:00.000Z")).toBe("18.05.2026, 17:26");
    expect(formatVaultUpdatedLabel("not-a-date")).toBe("Unbekannt");
  });
});
