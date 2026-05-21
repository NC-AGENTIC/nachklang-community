// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
  redirect: vi.fn(),
  usePathname: () => "/",
}));

import { OnboardingWizard } from "../../src/features/vault/ui/onboarding-wizard";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const fakePort = { registerWithPrf: vi.fn().mockResolvedValue({ credentialID: "c1", prfOutput: new ArrayBuffer(32) }) };

describe("OnboardingWizard", () => {
  it("registers a passkey then shows the recovery code", async () => {
    const createVault = vi.fn().mockResolvedValue(undefined);
    const onUnlocked = vi.fn();
    renderWithIntl(<OnboardingWizard port={fakePort as never} createVault={createVault} onUnlocked={onUnlocked} />);
    await userEvent.click(screen.getByRole("button", { name: /Passkey erstellen/ }));
    expect(await screen.findByText(/Recovery-Code/)).toBeInTheDocument();
    expect(createVault).toHaveBeenCalled();
  });
});
