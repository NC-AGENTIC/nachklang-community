// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../messages/de.json";

import { RecoveryStep } from "@/features/vault/ui/onboarding/recovery-step";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const CODE = "A3JK-LPQR-79XZ-2HMV-BNK4-9DTS";

describe("RecoveryStep", () => {
  it("renders the supplied recovery code as 6 monospace cells and supports copy + continue", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const { container } = renderWithIntl(
      <RecoveryStep
        recoveryCode={CODE}
        email="user@example.test"
        vaultId="v-1"
        onContinue={onContinue}
      />,
    );

    // Six groups rendered, one cell per group.
    const cells = container.querySelectorAll(".onboarding__recovery-cell");
    expect(cells).toHaveLength(6);
    expect(cells[0].textContent).toBe("A3JK");
    expect(cells[5].textContent).toBe("9DTS");

    // data-recovery-code attribute preserved on the grid container (e2e seed contract).
    expect(container.querySelector(`[data-recovery-code="${CODE}"]`)).not.toBeNull();

    // Copy.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    await user.click(screen.getByRole("button", { name: /Kopieren/ }));
    expect(writeText).toHaveBeenCalledWith(CODE);

    // Continue.
    await user.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("hides the code cells when the reveal toggle is clicked", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(
      <RecoveryStep
        recoveryCode={CODE}
        email="u@e.test"
        vaultId="v-1"
        onContinue={vi.fn()}
      />,
    );
    // Initially revealed.
    expect(container.querySelectorAll(".onboarding__recovery-cell.masked")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /Verbergen/ }));
    expect(container.querySelectorAll(".onboarding__recovery-cell.masked")).toHaveLength(6);
  });
});
