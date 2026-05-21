// Phase 1 fills de.json only; en/fr/es remain {} until Phase 2.
// This test guards against drift once Phase 2 lands.
import { describe, it, expect } from "vitest";

import de from "../../messages/de.json";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import es from "../../messages/es.json";

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix.slice(0, -1)];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    keyPaths(v, `${prefix}${k}.`),
  );
}

describe("message catalogs", () => {
  it("en/fr/es mirror the key set of de", () => {
    const deKeys = new Set(keyPaths(de));
    for (const [name, cat] of [["en", en], ["fr", fr], ["es", es]] as const) {
      const cKeys = new Set(keyPaths(cat));
      const missing = [...deKeys].filter((k) => !cKeys.has(k));
      const extra = [...cKeys].filter((k) => !deKeys.has(k));
      expect({ name, missing, extra }).toEqual({ name, missing: [], extra: [] });
    }
  });
});
