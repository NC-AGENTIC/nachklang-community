// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../messages/de.json";

vi.mock("@/i18n/navigation", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
  redirect: vi.fn(),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import { LandingHero } from "@/features/marketing/ui/landing-hero";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("LandingHero", () => {
  it("renders the editorial wordmark linking home", () => {
    renderWithIntl(<LandingHero />);
    const wordmark = screen.getByRole("link", { name: "NachKlang" });
    expect(wordmark).toHaveAttribute("href", "/");
  });

  it("links Konto erstellen to /signup and Anmelden to /signin", () => {
    renderWithIntl(<LandingHero />);
    const signupLink = screen.getByRole("link", { name: /Konto erstellen/i });
    const signinLink = screen.getByRole("link", { name: /Anmelden/i });
    expect(signupLink).toHaveAttribute("href", "/signup");
    expect(signinLink).toHaveAttribute("href", "/signin");
  });

  it("renders the zero-knowledge eyebrow", () => {
    renderWithIntl(<LandingHero />);
    expect(screen.getByText(/Zero-Knowledge · Digitaler Nachlass/i)).toBeInTheDocument();
  });

  it("renders the EU trust strip and the legal footer links", () => {
    renderWithIntl(<LandingHero />);
    expect(screen.getByText(/EU-Datenschutz/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impressum" })).toHaveAttribute("href", "/impressum");
    expect(screen.getByRole("link", { name: "Datenschutz" })).toHaveAttribute("href", "/datenschutz");
    expect(screen.getByRole("link", { name: "Copyright" })).toHaveAttribute("href", "/copyright");
  });

  it("links the top HowTo entry to /howto", () => {
    renderWithIntl(<LandingHero />);
    expect(screen.getByRole("link", { name: "HowTo" })).toHaveAttribute("href", "/howto");
  });

  it("renders the 'So funktioniert's' button linking to the guide", () => {
    renderWithIntl(<LandingHero />);
    expect(screen.getByRole("link", { name: /So funktioniert's/ })).toHaveAttribute("href", "/howto");
  });
});
