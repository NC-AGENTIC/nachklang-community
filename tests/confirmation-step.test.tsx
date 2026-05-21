// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../messages/de.json";

import { ConfirmationStep } from "@/features/vault/ui/onboarding/confirmation-step";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const EXAMPLE_CODE = "A3JK-LPQR-79XZ-2HMV-BNK4-9DTS";

describe("ConfirmationStep", () => {
  it("accepts the spaced/hyphenated form after normalization", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithIntl(<ConfirmationStep recoveryCode={EXAMPLE_CODE} onConfirm={onConfirm} />);

    const submit = screen.getByRole("button", { name: /Vault erstellen/i });
    expect(submit).toBeDisabled();

    // Type the same code in lowercase (normalization should uppercase + handle hyphens).
    await user.type(screen.getByLabelText(/Recovery-Code/), "a3jk-lpqr-79xz-2hmv-bnk4-9dts");
    await user.click(screen.getByLabelText(/sicher abgelegt/i));
    expect(submit).not.toBeDisabled();
    await user.click(submit);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("rejects a wrong recovery code", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ConfirmationStep recoveryCode={EXAMPLE_CODE} onConfirm={vi.fn()} />);
    await user.type(screen.getByLabelText(/Recovery-Code/), "AAAA-BBBB-CCCC-DDDD-EEEE-FFFF");
    await user.click(screen.getByLabelText(/sicher abgelegt/i));
    expect(screen.getByRole("button", { name: /Vault erstellen/i })).toBeDisabled();
  });

  it("requires the consent checkbox", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ConfirmationStep recoveryCode={EXAMPLE_CODE} onConfirm={vi.fn()} />);
    await user.type(screen.getByLabelText(/Recovery-Code/), EXAMPLE_CODE);
    expect(screen.getByRole("button", { name: /Vault erstellen/i })).toBeDisabled();
  });

  it("renders a back button when onBack is provided and invokes it", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithIntl(
      <ConfirmationStep
        recoveryCode={EXAMPLE_CODE}
        onConfirm={vi.fn()}
        onBack={onBack}
      />,
    );
    const back = screen.getByRole("button", { name: /Zurück/ });
    await user.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("does not render a back button when onBack is omitted", () => {
    renderWithIntl(<ConfirmationStep recoveryCode={EXAMPLE_CODE} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Zurück/ })).not.toBeInTheDocument();
  });
});
