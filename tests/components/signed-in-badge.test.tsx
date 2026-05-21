// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

const signOutMock = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  signOut: signOutMock,
  authClient: {
    useSession: { get: () => null, listen: () => () => {} },
  },
}));

vi.mock("better-auth/react", () => ({
  useStore: () => null,
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SignedInBadge", () => {
  it("renders the email and a sign-out button", async () => {
    const { SignedInBadge } = await import("../../src/features/auth/ui/signed-in-badge");
    renderWithIntl(<SignedInBadge serverEmail="max@example.org" />);
    expect(screen.getByText("max@example.org")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abmelden/ })).toBeInTheDocument();
  });

  it("calls signOut on click", async () => {
    signOutMock.mockClear();
    const { SignedInBadge } = await import("../../src/features/auth/ui/signed-in-badge");
    const user = userEvent.setup();
    renderWithIntl(<SignedInBadge serverEmail="max@example.org" />);
    await user.click(screen.getByRole("button", { name: /Abmelden/ }));
    expect(signOutMock).toHaveBeenCalled();
  });
});
