import { describe, it, expect } from "vitest";

import { routing } from "@/i18n/routing";

describe("i18n routing", () => {
  it("declares the four supported locales", () => {
    expect(routing.locales).toEqual(["de", "en", "fr", "es"]);
  });

  it("uses German as the default", () => {
    expect(routing.defaultLocale).toEqual("de");
  });

  it("always prefixes URLs with the locale", () => {
    expect(routing.localePrefix).toEqual("always");
  });
});
