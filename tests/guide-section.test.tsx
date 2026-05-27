// tests/guide-section.test.tsx
// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import deMessages from "../messages/de.json";
import { GuideSection } from "@/features/guide/ui/guide-section";
import type { GuideSection as GuideSectionData } from "@/features/guide/content/types";

const section: GuideSectionData = {
  id: "konto",
  navLabel: "Konto",
  title: "Konto erstellen",
  intro: "Intro-Text",
  illustration: "account-create",
  steps: [
    { title: "S1", body: "B1" },
    { title: "S2", body: "B2" },
  ],
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("GuideSection", () => {
  it("renders an anchor id and an h2 title", () => {
    const { container } = renderWithIntl(<GuideSection section={section} />);
    expect(container.querySelector("#konto")).not.toBeNull();
    expect(container.querySelector("h2")?.textContent).toBe("Konto erstellen");
  });

  it("renders the mapped illustration and all steps", () => {
    const { container } = renderWithIntl(<GuideSection section={section} />);
    expect(container.querySelector('[data-illustration="account-create"] svg')).not.toBeNull();
    expect(container.querySelectorAll(".guide-step")).toHaveLength(2);
  });

  it("renders securityNotes when the section has no steps", () => {
    const secSection: GuideSectionData = {
      id: "sicherheit",
      navLabel: "Sicherheit",
      title: "Sicherheit & Risiken",
      illustration: "zero-knowledge-lock",
      steps: [],
      securityNotes: [{ risk: "R1", mitigation: "M1" }],
    };
    const { container } = renderWithIntl(<GuideSection section={secSection} />);
    expect(container.querySelectorAll(".guide-step")).toHaveLength(0);
    expect(container.textContent).toContain("R1");
    expect(container.textContent).toContain("M1");
  });
});
