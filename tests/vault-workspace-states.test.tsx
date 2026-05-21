/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../messages/de.json";

import { VaultWorkspace } from "@/features/vault/ui/vault-workspace";

vi.mock("@/features/vault/state/use-root-key", () => ({
  useRootKey: () => ({ vaultId: "v-1", rootKey: new Uint8Array(32), unlockedVia: "passphrase" }),
}));

vi.mock("@/features/vault/state/use-vault-items", () => ({
  useVaultItems: () => ({ items: [], status: "ready", error: null, create: vi.fn(), update: vi.fn(), remove: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
  redirect: vi.fn(),
  usePathname: () => "/",
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const admin = { userId: "u-1", email: "u@example.test", displayName: "U", role: "admin" as const, status: "active" as const };

describe("VaultWorkspace render states", () => {
  it("shows the empty-state CTA when there are no items", () => {
    renderWithIntl(<VaultWorkspace vaultAdmin={admin} />);
    expect(screen.getByTestId("vault-empty")).toBeInTheDocument();
  });
});
