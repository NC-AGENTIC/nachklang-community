// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import deMessages from "../../messages/de.json";

import { VaultSummary } from "../../src/features/vault/ui/vault-summary";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("VaultSummary", () => {
  it("renders the entry count and active count tiles", () => {
    renderWithIntl(
      <VaultSummary
        entryCount={6}
        activeCount={3}
        breakdown={{ aktiv: 3, stillgelegt: 2, "anbieter-informiert": 1, geloescht: 0 }}
      />,
    );
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Vault-Einträge")).toBeInTheDocument();
    expect(screen.getByText("Noch aktiv")).toBeInTheDocument();
  });

  it("summarises the non-active breakdown, omitting zero counts", () => {
    renderWithIntl(
      <VaultSummary
        entryCount={6}
        activeCount={3}
        breakdown={{ aktiv: 3, stillgelegt: 2, "anbieter-informiert": 1, geloescht: 0 }}
      />,
    );
    const sub = screen.getByText(/stillgelegt/);
    expect(sub.textContent).toContain("2 stillgelegt");
    expect(sub.textContent).toContain("1 anbieter informiert");
    expect(sub.textContent).not.toContain("gelöscht");
  });

  it("shows an all-active hint when nothing else applies", () => {
    renderWithIntl(
      <VaultSummary
        entryCount={3}
        activeCount={3}
        breakdown={{ aktiv: 3, stillgelegt: 0, "anbieter-informiert": 0, geloescht: 0 }}
      />,
    );
    expect(screen.getByText("Alle Zugänge aktiv")).toBeInTheDocument();
  });

  it("no longer renders a Review tile", () => {
    renderWithIntl(
      <VaultSummary
        entryCount={0}
        activeCount={0}
        breakdown={{ aktiv: 0, stillgelegt: 0, "anbieter-informiert": 0, geloescht: 0 }}
      />,
    );
    expect(screen.queryByText(/Review/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Passwortspeicher/)).not.toBeInTheDocument();
  });
});
