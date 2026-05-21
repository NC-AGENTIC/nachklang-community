// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

const replaceMock = vi.fn();
const clearRootKeyMock = vi.fn();
let rootKeyValue: unknown = { vaultId: "v-1", rootKey: new Uint8Array(32), unlockedVia: "passphrase" };

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), prefetch: vi.fn() }),
  redirect: vi.fn(),
  usePathname: () => "/",
}));

vi.mock("@/features/vault/state/use-root-key", () => ({
  useRootKey: () => rootKeyValue,
}));

vi.mock("@/features/vault/state/root-key-store", () => ({
  clearRootKey: () => clearRootKeyMock(),
}));

import { IdleAutoLock } from "@/features/vault/ui/idle-auto-lock";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const IDLE = 5 * 60 * 1000;
const WARN = 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  replaceMock.mockReset();
  clearRootKeyMock.mockReset();
  rootKeyValue = { vaultId: "v-1", rootKey: new Uint8Array(32), unlockedVia: "passphrase" };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("IdleAutoLock", () => {
  it("does nothing when there is no root key", () => {
    rootKeyValue = null;
    renderWithIntl(<IdleAutoLock />);
    act(() => {
      vi.advanceTimersByTime(IDLE + 2000);
    });
    expect(clearRootKeyMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows the warning banner inside the final minute", () => {
    renderWithIntl(<IdleAutoLock />);
    act(() => {
      vi.advanceTimersByTime(IDLE - WARN + 1000);
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Angemeldet bleiben/ })).toBeInTheDocument();
  });

  it("locks the vault after the idle period", () => {
    renderWithIntl(<IdleAutoLock />);
    act(() => {
      vi.advanceTimersByTime(IDLE + 1000);
    });
    expect(clearRootKeyMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/unlock");
  });

  it("resets the timer on activity (no lock)", () => {
    renderWithIntl(<IdleAutoLock />);
    act(() => {
      vi.advanceTimersByTime(IDLE - 5000);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      vi.advanceTimersByTime(10_000);
    });
    expect(clearRootKeyMock).not.toHaveBeenCalled();
  });

  it("'Angemeldet bleiben' dismisses the warning and prevents the lock", () => {
    renderWithIntl(<IdleAutoLock />);
    act(() => {
      vi.advanceTimersByTime(IDLE - WARN + 1000);
    });
    act(() => {
      screen.getByRole("button", { name: /Angemeldet bleiben/ }).click();
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(WARN - 2000);
    });
    expect(clearRootKeyMock).not.toHaveBeenCalled();
  });
});
