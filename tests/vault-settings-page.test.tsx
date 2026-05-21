// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../messages/de.json";

import { VaultSettings } from "@/features/vault/ui/vault-settings";

vi.mock("@/features/vault/state/use-root-key", () => ({
  useRootKey: vi.fn(),
}));
vi.mock("@/features/vault/state/use-vault-items", () => ({
  useVaultItems: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
  redirect: vi.fn(),
  usePathname: () => "/",
}));

import * as rootKeyMod from "@/features/vault/state/use-root-key";
import * as itemsMod from "@/features/vault/state/use-vault-items";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const admin = { userId: "u-1", email: "u@e.test", displayName: "U", role: "admin" as const, status: "active" as const };

describe("VaultSettings", () => {
  it("renders the export form and a back link to /vault when unlocked", () => {
    vi.mocked(rootKeyMod.useRootKey).mockReturnValue({ vaultId: "v-1", rootKey: {} as unknown as CryptoKey, unlockedVia: "passkey" });
    vi.mocked(itemsMod.useVaultItems).mockReturnValue({
      items: [], status: "ready", error: null,
      create: vi.fn(), update: vi.fn(), remove: vi.fn(), refresh: vi.fn(),
    });
    renderWithIntl(<VaultSettings vaultAdmin={admin} />);
    expect(screen.getByText(/Vault-Einstellungen/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Export-Passwort/)).toBeInTheDocument();
    const back = screen.getByRole("link", { name: /Zurück zum Tresor/ });
    expect(back).toHaveAttribute("href", "/vault");
  });

  it("renders the locked placeholder when useRootKey returns null", () => {
    vi.mocked(rootKeyMod.useRootKey).mockReturnValue(null);
    vi.mocked(itemsMod.useVaultItems).mockReturnValue({
      items: null, status: "loading", error: null,
      create: vi.fn(), update: vi.fn(), remove: vi.fn(), refresh: vi.fn(),
    });
    renderWithIntl(<VaultSettings vaultAdmin={admin} />);
    expect(screen.getByText(/Tresor gesperrt/)).toBeInTheDocument();
  });
});
