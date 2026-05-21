// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

import { VaultEntryForm } from "../../src/features/vault/ui/vault-entry-form";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const emptyDraft = {
  displayName: "",
  loginUrl: "",
  emailUsed: "",
  username: "",
  passwordLocationHint: "",
  notes: "",
  lifecycleStatus: "aktiv" as const,
};

describe("VaultEntryForm", () => {
  it("renders create-mode heading and a provider combobox for the name field", () => {
    renderWithIntl(
      <VaultEntryForm
        mode="create"
        draft={emptyDraft}
        notice="Notiz"
        onDraftChange={vi.fn()}
        onProviderSelect={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Zugang erfassen" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Anbietername" })).toBeInTheDocument();
    expect(screen.getByLabelText("Login-URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Genutzte E-Mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Benutzername")).toBeInTheDocument();
    expect(screen.getByLabelText("Hinweis zum Passwort-Fundort")).toBeInTheDocument();
    expect(screen.getByLabelText("Notizen")).toBeInTheDocument();
    // New entries are always "aktiv" — the status selector is edit-only.
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
  });

  it("renders a plain name input (no combobox) and the status selector in edit mode", () => {
    renderWithIntl(
      <VaultEntryForm
        mode="edit"
        draft={emptyDraft}
        notice=""
        onDraftChange={vi.fn()}
        onProviderSelect={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Zugang bearbeiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abbrechen/ })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Anbietername" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Anbietername")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });
});
