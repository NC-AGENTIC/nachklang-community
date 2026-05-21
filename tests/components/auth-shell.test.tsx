// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

vi.mock("@/i18n/navigation", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
  redirect: vi.fn(),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import { AuthShell } from "../../src/features/auth/ui/auth-shell";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AuthShell", () => {
  it("renders eyebrow, title, subtitle, and the children slot", () => {
    renderWithIntl(
      <AuthShell eyebrow="Anmeldung" title="Anmelden" subtitle="Mit E-Mail und Passwort.">
        <p>FORM-MARKER</p>
      </AuthShell>,
    );
    expect(screen.getByText("Anmeldung")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Anmelden" })).toBeInTheDocument();
    expect(screen.getByText("Mit E-Mail und Passwort.")).toBeInTheDocument();
    expect(screen.getByText("FORM-MARKER")).toBeInTheDocument();
  });

  it("renders a secondary action link when provided", () => {
    renderWithIntl(
      <AuthShell
        eyebrow="Registrierung"
        title="Konto erstellen"
        subtitle=""
        secondaryAction={{ label: "Schon ein Konto? Anmelden", href: "/signin" }}
      >
        <p>x</p>
      </AuthShell>,
    );
    expect(screen.getByRole("link", { name: "Schon ein Konto? Anmelden" })).toHaveAttribute("href", "/signin");
  });
});
