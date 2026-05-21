// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

import { SharedVaultPanel } from "../../src/features/trustee/ui/shared-vault-panel";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const base = {
  entries: null,
  ownerName: null,
  ownerUpdatedAt: null,
  statuses: {},
  locked: true,
  loading: false,
  onUnlock: vi.fn(),
  onChangeStatus: vi.fn(),
  savingItemId: null,
  error: null,
};

const entry = {
  itemId: "i1",
  ownerId: "owner1",
  vaultId: "v1",
  revision: 1,
  entry: {
    providerId: "google",
    displayName: "Google Konto",
    loginUrl: "https://accounts.google.com",
    tags: [],
    lifecycleStatus: "aktiv" as const,
  },
  createdAt: "2026-05-21T10:00:00.000Z",
  updatedAt: "2026-05-21T10:00:00.000Z",
};

describe("SharedVaultPanel", () => {
  it("offers an unlock button while locked and triggers onUnlock", async () => {
    const onUnlock = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(<SharedVaultPanel {...base} onUnlock={onUnlock} />);
    await userEvent.click(screen.getByRole("button", { name: /Mit Passkey entsperren/ }));
    expect(onUnlock).toHaveBeenCalled();
  });

  it("renders read-only entries once unlocked", () => {
    renderWithIntl(<SharedVaultPanel {...base} locked={false} entries={[entry]} />);
    expect(screen.getByText("Google Konto")).toBeInTheDocument();
    expect(screen.getByText("https://accounts.google.com")).toBeInTheDocument();
    expect(screen.getByText("Nur Lesezugriff")).toBeInTheDocument();
    // "Aktiv" appears both as the owner's read-only status and as a select option.
    expect(screen.getAllByText("Aktiv").length).toBeGreaterThan(0);
  });

  it("lets the trustee change their handling status, excluding the owner-only 'aktiv'", async () => {
    const onChangeStatus = vi.fn();
    renderWithIntl(
      <SharedVaultPanel {...base} locked={false} entries={[entry]} onChangeStatus={onChangeStatus} />,
    );
    const select = screen.getByLabelText("Ihr Bearbeitungsstatus") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    // 'aktiv' is the owner's baseline and must not be offered to the trustee.
    expect(optionValues).not.toContain("aktiv");
    expect(optionValues).toContain("anbieter-informiert");
    await userEvent.selectOptions(select, "anbieter-informiert");
    expect(onChangeStatus).toHaveBeenCalledWith("i1", "anbieter-informiert");
  });

  it("shows the owner badge + last-updated when unlocked", () => {
    renderWithIntl(
      <SharedVaultPanel
        {...base}
        locked={false}
        entries={[entry]}
        ownerName="Maria"
        ownerUpdatedAt="2026-05-21T10:00:00.000Z"
      />,
    );
    expect(screen.getByText("Tresor von Maria")).toBeInTheDocument();
    expect(screen.getByText(/Zuletzt vom Inhaber aktualisiert/)).toBeInTheDocument();
  });

  it("shows a forbidden message", () => {
    renderWithIntl(<SharedVaultPanel {...base} error="forbidden" />);
    expect(screen.getByText(/keinen aktiven Zugriff/)).toBeInTheDocument();
  });

  it("shows the empty state when unlocked with no entries", () => {
    renderWithIntl(<SharedVaultPanel {...base} locked={false} entries={[]} />);
    expect(screen.getByText("Dieser Tresor enthält keine Einträge.")).toBeInTheDocument();
  });
});
