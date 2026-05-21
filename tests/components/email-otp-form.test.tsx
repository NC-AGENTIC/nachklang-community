// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";
import { EmailOtpForm } from "../../src/features/auth/ui/email-otp-form";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("EmailOtpForm", () => {
  it("requests an OTP for a valid email + name", async () => {
    const onRequest = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(<EmailOtpForm onRequest={onRequest} />);
    await userEvent.type(screen.getByLabelText(/Name/), "Erika M");
    await userEvent.type(screen.getByLabelText(/E-Mail/), "erika@example.org");
    await userEvent.click(screen.getByRole("button", { name: /Code anfordern/ }));
    expect(onRequest).toHaveBeenCalledWith({ name: "Erika M", email: "erika@example.org" });
  });
});
