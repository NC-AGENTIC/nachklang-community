// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

import { OnboardingShell } from "@/features/vault/ui/onboarding/onboarding-shell";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const LABELS = ["Passphrase", "Recovery", "Bestätigung"] as const;

describe("OnboardingShell", () => {
  it("renders eyebrow, title, subtitle, and children", () => {
    renderWithIntl(
      <OnboardingShell
        eyebrow="SCHRITT 1 VON 3 · PASSPHRASE"
        title="Vault einrichten"
        subtitle="Diese Passphrase entschlüsselt Ihren Tresor."
        step={1}
        totalSteps={3}
        stepLabels={LABELS}
      >
        <p>FORM_BODY</p>
      </OnboardingShell>,
    );
    expect(screen.getByText("SCHRITT 1 VON 3 · PASSPHRASE")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vault einrichten" })).toBeInTheDocument();
    expect(screen.getByText(/Diese Passphrase/)).toBeInTheDocument();
    expect(screen.getByText("FORM_BODY")).toBeInTheDocument();
  });

  it("step indicator marks the current step and labels past/future", () => {
    const { container } = renderWithIntl(
      <OnboardingShell
        eyebrow="SCHRITT 2 VON 3 · RECOVERY-CODE"
        title="Notieren Sie diesen Code"
        subtitle="Ihre einzige Rückfallebene."
        step={2}
        totalSteps={3}
        stepLabels={LABELS}
      >
        <p>FORM</p>
      </OnboardingShell>,
    );
    const cells = container.querySelectorAll(".onboarding__step");
    expect(cells).toHaveLength(3);
    expect(cells[0].classList.contains("past")).toBe(true);
    expect(cells[1].classList.contains("current")).toBe(true);
    expect(cells[2].classList.contains("future")).toBe(true);
  });

  it("does not render the back link by default", () => {
    renderWithIntl(
      <OnboardingShell
        eyebrow="X"
        title="Y"
        subtitle="Z"
        step={1}
        totalSteps={3}
        stepLabels={LABELS}
      >
        <p>F</p>
      </OnboardingShell>,
    );
    expect(screen.queryByRole("button", { name: /Zurück/ })).not.toBeInTheDocument();
  });

  it("renders the back link when onBack is provided and invokes it", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithIntl(
      <OnboardingShell
        eyebrow="X"
        title="Y"
        subtitle="Z"
        step={3}
        totalSteps={3}
        stepLabels={LABELS}
        onBack={onBack}
        backLabel="← Zurück zum Code"
      >
        <p>F</p>
      </OnboardingShell>,
    );
    const back = screen.getByRole("button", { name: /Zurück zum Code/ });
    expect(back).toBeInTheDocument();
    await user.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
