// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

vi.mock("better-auth/react", () => ({
  useStore: () => ({ data: { user: { email: "u@e.test", emailVerified: true } } }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
  redirect: vi.fn(),
  usePathname: () => "/",
}));

vi.mock("@/features/vault/state/use-root-key", () => ({
  useRootKey: vi.fn(() => null),
}));

import { AppChrome } from "@/features/auth/ui/app-chrome";
import { useRootKey } from "@/features/vault/state/use-root-key";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AppChrome navigation", () => {
  beforeEach(() => {
    vi.mocked(useRootKey).mockReturnValue(null);
  });

  it("gives an owner Vault + Einstellungen + Shared links and the vault badge", () => {
    renderWithIntl(
      <AppChrome initialFullyAuthed serverEmail="u@e.test" hasVault>
        <div>child</div>
      </AppChrome>,
    );

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    // The owner needs a way back to the vault from Settings / Shared (was missing before).
    expect(hrefs).toContain("/vault");
    expect(hrefs).toContain("/vault/settings");
    expect(hrefs).toContain("/shared");
    // The "Ihr Vault · zuletzt gespeichert" badge belongs to vault owners.
    expect(screen.getAllByText(/zuletzt gespeichert/).length).toBeGreaterThan(0);
  });

  it("gives a trustee-only member Einstellungen→/account + Shared, no vault links or badge", () => {
    renderWithIntl(
      <AppChrome initialFullyAuthed serverEmail="u@e.test" hasVault={false}>
        <div>child</div>
      </AppChrome>,
    );

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/shared");
    // Settings for a vault-less member points to the account page (its delete lives there).
    expect(hrefs).toContain("/account");
    expect(hrefs).not.toContain("/vault");
    expect(hrefs).not.toContain("/vault/settings");
    // No "Ihr Vault" metadata for someone who has no personal vault.
    expect(screen.queryByText(/zuletzt gespeichert/)).toBeNull();
  });

  it("shows the vault link right after passkey unlock even when the server prop is still stale", () => {
    // After a client-side passkey login the layout's server `hasVault` is stale (false), but the
    // unlocked root key proves the owner has a vault — the rail must show Vault without a refresh.
    vi.mocked(useRootKey).mockReturnValue({
      vaultId: "v-1",
      rootKey: {} as unknown as CryptoKey,
      unlockedVia: "passkey",
    });
    renderWithIntl(
      <AppChrome initialFullyAuthed serverEmail="u@e.test" hasVault={false}>
        <div>child</div>
      </AppChrome>,
    );

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/vault");
    expect(hrefs).toContain("/vault/settings");
    expect(hrefs).not.toContain("/account");
    expect(screen.getAllByText(/zuletzt gespeichert/).length).toBeGreaterThan(0);
  });
});
