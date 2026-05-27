// tests/guide-step.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import deMessages from "../messages/de.json";
import { GuideStep } from "@/features/guide/ui/guide-step";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("GuideStep", () => {
  it("renders the number, title and body", () => {
    renderWithIntl(<GuideStep index={2} step={{ title: "Code notieren", body: "Bewahren Sie ihn sicher auf." }} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Code notieren" })).toBeInTheDocument();
    expect(screen.getByText("Bewahren Sie ihn sicher auf.")).toBeInTheDocument();
  });

  it("renders a security note with both labels and texts", () => {
    const { container } = renderWithIntl(
      <GuideStep index={1} step={{ title: "T", body: "B", securityNote: { risk: "RISK-TEXT", mitigation: "MIT-TEXT" } }} />,
    );
    expect(container.textContent).toContain("RISK-TEXT");
    expect(container.textContent).toContain("MIT-TEXT");
    expect(container.textContent).toContain("Risiko");
    expect(container.textContent).toContain("So schützen wir Sie");
  });
});
