// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

import { TrusteesPanel, type TrusteeShareView } from "../../src/features/trustee/ui/trustees-panel";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const baseProps = {
  shares: [],
  onInvite: vi.fn(),
  onSeal: vi.fn(),
  onRevoke: vi.fn(),
  onPurge: vi.fn(),
  onLoadAccessLog: vi.fn(),
  inviteNotice: null,
  inviteLink: null,
  busy: false,
  error: null,
};

function share(overrides: Partial<TrusteeShareView> = {}): TrusteeShareView {
  return {
    id: "s1",
    label: "Meine Schwester",
    status: "pending_verify",
    fingerprint: "0421-9837-1056",
    trusteePublicKey: "pub-b64",
    createdAt: "2026-05-21T10:00:00.000Z",
    lastAccessedAt: null,
    accessCount: 0,
    ...overrides,
  };
}

describe("TrusteesPanel", () => {
  it("submits the invite form with email + label", async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(<TrusteesPanel {...baseProps} onInvite={onInvite} />);

    await userEvent.type(screen.getByLabelText(/E-Mail der Vertrauensperson/), "sis@example.test");
    await userEvent.type(screen.getByLabelText(/Bezeichnung/), "Meine Schwester");
    await userEvent.click(screen.getByRole("button", { name: /^Einladen$/ }));

    expect(onInvite).toHaveBeenCalledWith("sis@example.test", "Meine Schwester");
  });

  it("renders each trustee with its status and confirmation code", () => {
    renderWithIntl(<TrusteesPanel {...baseProps} shares={[share()]} />);
    expect(screen.getByText("Meine Schwester")).toBeInTheDocument();
    expect(screen.getByText("0421-9837-1056")).toBeInTheDocument();
    expect(screen.getByText("Wartet auf Bestätigung")).toBeInTheDocument();
  });

  it("shows the empty state when there are no trustees", () => {
    renderWithIntl(<TrusteesPanel {...baseProps} />);
    expect(screen.getByText("Noch keine Vertrauenspersonen eingeladen.")).toBeInTheDocument();
  });

  it("seals a pending trustee via the confirm & grant button", async () => {
    const onSeal = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(<TrusteesPanel {...baseProps} onSeal={onSeal} shares={[share()]} />);
    await userEvent.click(screen.getByRole("button", { name: /Bestätigen & freigeben/ }));
    expect(onSeal).toHaveBeenCalledWith(expect.objectContaining({ id: "s1", trusteePublicKey: "pub-b64" }));
  });

  it("revokes a trustee and shows access summary for an active share", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(
      <TrusteesPanel
        {...baseProps}
        onRevoke={onRevoke}
        shares={[share({ status: "active", accessCount: 2, lastAccessedAt: "2026-05-22T08:00:00.000Z" })]}
      />,
    );
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.getByText(/2× abgerufen/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Zugriff widerrufen/ }));
    expect(onRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
  });

  it("permanently deletes a revoked trustee via the delete button", async () => {
    const onPurge = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(
      <TrusteesPanel {...baseProps} onPurge={onPurge} shares={[share({ status: "revoked" })]} />,
    );
    // No revoke button on an already-revoked share; the permanent-delete action takes its place.
    expect(screen.queryByRole("button", { name: /Zugriff widerrufen/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Endgültig löschen/ }));
    expect(onPurge).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
  });

  it("loads and shows the access history on demand", async () => {
    const onLoadAccessLog = vi
      .fn()
      .mockResolvedValue([
        { accessedAt: "2026-05-22T08:00:00.000Z", ipAddress: "1.2.3.4", userAgent: "UA" },
      ]);
    renderWithIntl(
      <TrusteesPanel {...baseProps} onLoadAccessLog={onLoadAccessLog} shares={[share({ status: "active", accessCount: 1 })]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Zugriffsverlauf anzeigen/ }));
    expect(onLoadAccessLog).toHaveBeenCalledWith("s1");
    expect(await screen.findByText(/1\.2\.3\.4/)).toBeInTheDocument();
  });
});
