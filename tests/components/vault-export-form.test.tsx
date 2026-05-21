// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VaultExportForm } from "@/features/vault/ui/vault-export-form";

describe("VaultExportForm", () => {
  it("calls onExportPassphraseChange when the passphrase field changes", () => {
    const onExportPassphraseChange = vi.fn();
    render(
      <VaultExportForm
        exportPassphrase=""
        notice=""
        onExportPassphraseChange={onExportPassphraseChange}
        onExportCsv={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Export-Passwort/), { target: { value: "abc" } });
    expect(onExportPassphraseChange).toHaveBeenCalledWith("abc");
  });

  it("invokes onExportCsv on submit", () => {
    const onExportCsv = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <VaultExportForm
        exportPassphrase="abc"
        notice=""
        onExportPassphraseChange={vi.fn()}
        onExportCsv={onExportCsv}
      />,
    );
    fireEvent.submit(
      screen.getByRole("button", { name: /Als verschlüsselte ZIP exportieren/ }).closest("form")!,
    );
    expect(onExportCsv).toHaveBeenCalledTimes(1);
  });

  it("no longer offers the encrypted JSON export controls", () => {
    render(
      <VaultExportForm
        exportPassphrase=""
        notice=""
        onExportPassphraseChange={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Export vorbereiten/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /NachKlang Export herunterladen/ }),
    ).not.toBeInTheDocument();
  });

  it("renders the notice text in the aria-live region", () => {
    render(
      <VaultExportForm
        exportPassphrase=""
        notice="Bitte Passphrase eingeben."
        onExportPassphraseChange={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );
    expect(screen.getByText(/Bitte Passphrase eingeben/)).toBeInTheDocument();
  });
});
