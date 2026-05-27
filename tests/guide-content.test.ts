// tests/guide-content.test.ts
import { describe, expect, it } from "vitest";

import { getGuideContent } from "@/features/guide/content";
import { guideDe } from "@/features/guide/content/de";
import { guideEn } from "@/features/guide/content/en";
import { ILLUSTRATION_KEYS } from "@/features/guide/content/types";

describe("guide content", () => {
  it("de and en expose the same section ids in the same order", () => {
    expect(guideEn.sections.map((s) => s.id)).toEqual(guideDe.sections.map((s) => s.id));
  });

  it("section ids are unique", () => {
    const ids = guideDe.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every section uses a known illustration key", () => {
    for (const s of [...guideDe.sections, ...guideEn.sections]) {
      expect(ILLUSTRATION_KEYS).toContain(s.illustration);
    }
  });

  it("contains the four strip anchor sections", () => {
    const ids = guideDe.sections.map((s) => s.id);
    for (const id of ["konto", "passkey", "eintraege", "teilen"]) {
      expect(ids).toContain(id);
    }
  });

  it("returns native content for de and en", () => {
    expect(getGuideContent("de")).toEqual({ content: guideDe, isFallback: false });
    expect(getGuideContent("en")).toEqual({ content: guideEn, isFallback: false });
  });

  it("falls back to english for fr and es", () => {
    expect(getGuideContent("fr")).toEqual({ content: guideEn, isFallback: true });
    expect(getGuideContent("es")).toEqual({ content: guideEn, isFallback: true });
  });
});
