import { afterEach, describe, expect, it } from "vitest";

import { selectTransport } from "@/server/mail/transport";
import { graphMailTransport } from "@/server/mail/microsoft-graph";
import { smtpMailTransport } from "@/server/mail/smtp";

const original = process.env.NACHKLANG_MAIL_TRANSPORT;

describe("mail transport selection", () => {
  afterEach(() => {
    if (original === undefined) {
      delete process.env.NACHKLANG_MAIL_TRANSPORT;
    } else {
      process.env.NACHKLANG_MAIL_TRANSPORT = original;
    }
  });

  it("defaults to the Graph transport when unset", () => {
    delete process.env.NACHKLANG_MAIL_TRANSPORT;
    expect(selectTransport()).toBe(graphMailTransport);
  });

  it("selects the SMTP transport when NACHKLANG_MAIL_TRANSPORT=smtp", () => {
    process.env.NACHKLANG_MAIL_TRANSPORT = "smtp";
    expect(selectTransport()).toBe(smtpMailTransport);
  });

  it("falls back to Graph for any unrecognized value", () => {
    process.env.NACHKLANG_MAIL_TRANSPORT = "carrier-pigeon";
    expect(selectTransport()).toBe(graphMailTransport);
  });
});
