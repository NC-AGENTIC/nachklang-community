// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RecoveryCodeGrid } from "@/features/vault/ui/onboarding/recovery-code-grid";

const CODE = "A3JK-LPQR-79XZ-2HMV-BNK4-9DTS";

describe("RecoveryCodeGrid", () => {
  it("renders six cells, one per group, when revealed", () => {
    const { container } = render(
      <RecoveryCodeGrid
        code={CODE}
        masked={false}
        onToggleMask={vi.fn()}
        onCopy={vi.fn()}
        onPrint={vi.fn()}
        copyState="idle"
      />,
    );
    const cells = container.querySelectorAll(".onboarding__recovery-cell");
    expect(cells).toHaveLength(6);
    expect(cells[0].textContent).toBe("A3JK");
    expect(cells[5].textContent).toBe("9DTS");
  });

  it("masks every cell when masked is true", () => {
    const { container } = render(
      <RecoveryCodeGrid
        code={CODE}
        masked
        onToggleMask={vi.fn()}
        onCopy={vi.fn()}
        onPrint={vi.fn()}
        copyState="idle"
      />,
    );
    const cells = container.querySelectorAll(".onboarding__recovery-cell");
    expect(cells).toHaveLength(6);
    cells.forEach((cell) => {
      expect(cell.textContent).toBe("••••");
      expect(cell.classList.contains("masked")).toBe(true);
    });
  });

  it("preserves the data-recovery-code attribute on the grid container", () => {
    const { container } = render(
      <RecoveryCodeGrid
        code={CODE}
        masked={false}
        onToggleMask={vi.fn()}
        onCopy={vi.fn()}
        onPrint={vi.fn()}
        copyState="idle"
      />,
    );
    const grid = container.querySelector("[data-recovery-code]");
    expect(grid).not.toBeNull();
    expect(grid?.getAttribute("data-recovery-code")).toBe(CODE);
  });

  it("invokes onToggleMask, onCopy, onPrint and flips the copy label", async () => {
    const user = userEvent.setup();
    const onToggleMask = vi.fn();
    const onCopy = vi.fn();
    const onPrint = vi.fn();

    const { rerender } = render(
      <RecoveryCodeGrid
        code={CODE}
        masked={false}
        onToggleMask={onToggleMask}
        onCopy={onCopy}
        onPrint={onPrint}
        copyState="idle"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Verbergen/ }));
    expect(onToggleMask).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Kopieren/ }));
    expect(onCopy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Drucken/ }));
    expect(onPrint).toHaveBeenCalledTimes(1);

    rerender(
      <RecoveryCodeGrid
        code={CODE}
        masked={false}
        onToggleMask={onToggleMask}
        onCopy={onCopy}
        onPrint={onPrint}
        copyState="copied"
      />,
    );
    expect(screen.getByRole("button", { name: /Kopiert/ })).toBeInTheDocument();
  });
});
