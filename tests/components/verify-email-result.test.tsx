// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    verifyEmail: vi.fn(),
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
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

describe("VerifyEmailResult", () => {
  it("calls authClient.verifyEmail with the token on mount and shows success", async () => {
    const { authClient } = await import("@/lib/auth-client");
    (authClient.verifyEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { ok: true } });

    const { VerifyEmailResult } = await import("../../src/features/auth/ui/verify-email-result");
    renderWithIntl(<VerifyEmailResult token="abc123" />);
    await new Promise((r) => setTimeout(r, 0));

    expect(authClient.verifyEmail).toHaveBeenCalledWith({ query: { token: "abc123" } });
    expect(await screen.findByRole("button", { name: /Weiter zur Einrichtung/ })).toBeInTheDocument();
  });

  it("shows expired-link message on error", async () => {
    const { authClient } = await import("@/lib/auth-client");
    (authClient.verifyEmail as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("nope"));

    const { VerifyEmailResult } = await import("../../src/features/auth/ui/verify-email-result");
    renderWithIntl(<VerifyEmailResult token="expired" />);
    expect(await screen.findByText(/Link abgelaufen/)).toBeInTheDocument();
  });
});
