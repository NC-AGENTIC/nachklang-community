// @vitest-environment jsdom
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

const ITEMS = [
  {
    itemId: "i-1",
    ownerId: "u-1",
    vaultId: "v-1",
    revision: 1,
    entry: {
      providerId: "bund-id",
      displayName: "BundID",
      loginUrl: "https://id.bund.de",
      emailUsed: "",
      username: "",
      passwordLocationHint: "",
      notes: "",
      tags: ["behoerde"],
      lastReviewedAt: "2026-05-18",
    },
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
  },
];

const removeMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/features/vault/state/use-root-key", () => ({
  useRootKey: () => ({ vaultId: "v-1", rootKey: new Uint8Array(32), unlockedVia: "passphrase" }),
}));

vi.mock("@/features/vault/state/use-vault-items", () => ({
  useVaultItems: () => ({
    items: ITEMS,
    status: "ready",
    error: null,
    create: vi.fn(),
    update: updateMock,
    remove: removeMock,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
  redirect: vi.fn(),
  usePathname: () => "/",
}));

import { VaultWorkspace } from "@/features/vault/ui/vault-workspace";

const admin = { userId: "u-1", email: "u@e.test", displayName: "U", role: "admin" as const, status: "active" as const };

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  removeMock.mockReset();
  updateMock.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("VaultWorkspace delayed mutations", () => {
  it("delete: card disappears, toast renders; undo cancels server remove()", async () => {
    const user = userEvent.setup();
    renderWithIntl(<VaultWorkspace vaultAdmin={admin} />);
    await user.click(screen.getByRole("button", { name: /BundID löschen/ }));
    // Card is gone from the visible list
    expect(screen.queryByRole("article", { name: /BundID/ })).not.toBeInTheDocument();
    // Toast appears with undo
    const undo = screen.getByRole("button", { name: /Rückgängig/ });
    await user.click(undo);
    // Card reappears
    expect(screen.getByRole("article", { name: /BundID/ })).toBeInTheDocument();
    // Hook's remove was NOT called
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("delete: timer expiry commits remove() exactly once", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    renderWithIntl(<VaultWorkspace vaultAdmin={admin} />);
    await user.click(screen.getByRole("button", { name: /BundID löschen/ }));
    await new Promise((r) => setTimeout(r, 5100));
    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledWith(expect.objectContaining({ itemId: "i-1" }));
  }, 10_000);

  it("status change: persists the new lifecycleStatus via update()", async () => {
    const user = userEvent.setup();
    renderWithIntl(<VaultWorkspace vaultAdmin={admin} />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: /BundID Status ändern/ }),
      "stillgelegt",
    );
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: "i-1" }),
      expect.objectContaining({ lifecycleStatus: "stillgelegt" }),
    );
  });

  it("does not render the provider catalog aside", () => {
    renderWithIntl(<VaultWorkspace vaultAdmin={admin} />);
    expect(screen.queryByRole("heading", { name: "Anbieter" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Anbieter-Katalog durchsuchen")).not.toBeInTheDocument();
  });
});
