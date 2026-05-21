// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

import { AcceptInvitePanel } from "../../src/features/trustee/ui/accept-invite-panel";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const base = {
  preview: null,
  loading: false,
  onAccept: vi.fn(),
  result: null,
  busy: false,
  error: null,
  phase: "ready" as const,
  returnTo: "/shares/accept/TOK",
};

describe("AcceptInvitePanel", () => {
  it("shows a loading state", () => {
    renderWithIntl(<AcceptInvitePanel {...base} loading />);
    expect(screen.getByText("Einladung wird geladen…")).toBeInTheDocument();
  });

  it("shows the invalid state when no preview was found", () => {
    renderWithIntl(<AcceptInvitePanel {...base} preview={null} loading={false} />);
    expect(screen.getByText(/ungültig oder wurde nicht gefunden/)).toBeInTheDocument();
  });

  it("shows the not-acceptable state for an expired invite", () => {
    renderWithIntl(
      <AcceptInvitePanel {...base} preview={{ ownerName: "Maria", acceptable: false }} />,
    );
    expect(screen.getByText(/abgelaufen oder wurde bereits verwendet/)).toBeInTheDocument();
  });

  it("offers acceptance with the owner name and triggers onAccept", async () => {
    const onAccept = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(
      <AcceptInvitePanel
        {...base}
        preview={{ ownerName: "Maria", acceptable: true }}
        onAccept={onAccept}
      />,
    );
    expect(screen.getByText(/Maria möchte Ihnen Lesezugriff/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Einladung annehmen/ }));
    expect(onAccept).toHaveBeenCalled();
  });

  it("prompts an anonymous visitor to create an account or sign in (no dead-end)", () => {
    renderWithIntl(
      <AcceptInvitePanel {...base} phase="anonymous" preview={{ ownerName: "Maria", acceptable: true }} />,
    );
    expect(screen.getByRole("link", { name: /Konto erstellen/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Anmelden/ })).toBeInTheDocument();
    // No accept button while unauthenticated.
    expect(screen.queryByRole("button", { name: /Einladung annehmen/ })).not.toBeInTheDocument();
  });

  it("lets a signed-in user without a passkey register one and accept in one step", async () => {
    const onAccept = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(
      <AcceptInvitePanel
        {...base}
        phase="register"
        onAccept={onAccept}
        preview={{ ownerName: "Maria", acceptable: true }}
      />,
    );
    const btn = screen.getByRole("button", { name: /Passkey erstellen & annehmen/ });
    await userEvent.click(btn);
    expect(onAccept).toHaveBeenCalled();
  });

  it("shows the confirmation code after a successful accept", () => {
    renderWithIntl(
      <AcceptInvitePanel
        {...base}
        preview={{ ownerName: "Maria", acceptable: true }}
        result={{ fingerprint: "0421-9837-1056" }}
      />,
    );
    expect(screen.getByText("Fast geschafft")).toBeInTheDocument();
    expect(screen.getByText("0421-9837-1056")).toBeInTheDocument();
  });
});
