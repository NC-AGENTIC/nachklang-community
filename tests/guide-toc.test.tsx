// tests/guide-toc.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import deMessages from "../messages/de.json";
import { GuideToc } from "@/features/guide/ui/guide-toc";

const items = [
  { id: "konto", navLabel: "Konto erstellen" },
  { id: "passkey", navLabel: "Passkey einrichten" },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("GuideToc", () => {
  it("renders a link per section pointing at its anchor", () => {
    renderWithIntl(<GuideToc items={items} activeId={null} />);
    expect(screen.getByRole("link", { name: "Konto erstellen" })).toHaveAttribute("href", "#konto");
    expect(screen.getByRole("link", { name: "Passkey einrichten" })).toHaveAttribute("href", "#passkey");
  });

  it("marks the active section with aria-current", () => {
    renderWithIntl(<GuideToc items={items} activeId="passkey" />);
    expect(screen.getByRole("link", { name: "Passkey einrichten" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Konto erstellen" })).not.toHaveAttribute("aria-current");
  });
});
