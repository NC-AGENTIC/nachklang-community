// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

import { VaultEntriesList } from "../../src/features/vault/ui/vault-entries-list";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("VaultEntriesList", () => {
  it("renders the section heading, the search box, and the entries list", () => {
    renderWithIntl(
      <VaultEntriesList
        entries={[]}
        query=""
        onQueryChange={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Vault-Einträge" })).toBeInTheDocument();
    expect(screen.getByLabelText("Vault-Einträge durchsuchen")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Vault-Einträge" })).toBeInTheDocument();
  });
});
