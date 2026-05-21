import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildSmtpMail } from "@/server/mail/smtp";

describe("buildSmtpMail", () => {
  beforeEach(() => {
    process.env.NACHKLANG_VISIBLE_EMAIL = "visible@example.com";
  });

  afterEach(() => {
    delete process.env.NACHKLANG_VISIBLE_EMAIL;
  });

  it("uses the NachKlang Sicherheit identity with the visible address as From", () => {
    const mail = buildSmtpMail({ to: "user@example.org", subject: "Code", html: "<strong>123456</strong>" });
    expect(mail.from).toBe("NachKlang Sicherheit <visible@example.com>");
    expect(mail.to).toBe("user@example.org");
    expect(mail.subject).toBe("Code");
    expect(mail.html).toBe("<strong>123456</strong>");
  });

  it("throws when NACHKLANG_VISIBLE_EMAIL is not configured", () => {
    delete process.env.NACHKLANG_VISIBLE_EMAIL;
    expect(() => buildSmtpMail({ to: "user@example.org", subject: "x", html: "<p>x</p>" })).toThrow(
      /NACHKLANG_VISIBLE_EMAIL/,
    );
  });
});
