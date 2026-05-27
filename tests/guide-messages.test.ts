// tests/guide-messages.test.ts
import { describe, expect, it } from "vitest";

import de from "../messages/de.json";
import en from "../messages/en.json";
import fr from "../messages/fr.json";
import es from "../messages/es.json";

const locales = { de, en, fr, es } as const;

describe("guide message keys", () => {
  it("every locale defines the guide chrome labels", () => {
    for (const [name, msg] of Object.entries(locales)) {
      const g = (msg as Record<string, any>).guide;
      expect(g, `${name}.guide missing`).toBeTruthy();
      expect(g.navLink).toBeTruthy();
      expect(g.inAppLink).toBeTruthy();
      expect(g.metaTitle).toBeTruthy();
      expect(g.metaDescription).toBeTruthy();
      expect(g.fallbackNotice).toBeTruthy();
      expect(g.backLabel).toBeTruthy();
      expect(g.securityRiskLabel).toBeTruthy();
      expect(g.securityMitigationLabel).toBeTruthy();
      expect(g.toc.ariaLabel).toBeTruthy();
      expect(g.toc.heading).toBeTruthy();
      expect(g.howtoButton, `${name}.guide.howtoButton missing`).toBeTruthy();
    }
  });
});
