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

import { UnlockForm } from "../../src/features/vault/ui/unlock-form";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const vault = { prfWrappedRootKeys: [{ credentialID: "c1", wrapped: {} }], recoveryWrappedRootKey: {}, kdfPolicy: {} };

describe("UnlockForm", () => {
  it("unlocks with a passkey via the injected port", async () => {
    const onUnlocked = vi.fn();
    const port = { assertPrf: vi.fn().mockResolvedValue({ credentialID: "c1", prfOutput: new ArrayBuffer(32) }) };
    const unlock = vi.fn().mockResolvedValue({ extractable: false });
    renderWithIntl(<UnlockForm vault={vault as never} port={port as never} unlockWithPrf={unlock} onUnlocked={onUnlocked} />);
    await userEvent.click(screen.getByRole("button", { name: /Mit Passkey entsperren/ }));
    expect(onUnlocked).toHaveBeenCalled();
  });
});
