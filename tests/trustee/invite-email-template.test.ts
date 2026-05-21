import { describe, expect, it } from "vitest";

import { buildInviteEmailHtml } from "@/server/mail/invite-email-template";

const content = {
  acceptUrl: "https://nachklang.example/de/shares/accept/TOK123",
  logoUrl: "https://nachklang.example/brand/email-logo.png",
  logoAlt: "NachKlang",
  heading: "Sie wurden als Vertrauensperson eingeladen",
  intro: "Maria hat Sie eingeladen, im Notfall auf ihren digitalen Nachlass zuzugreifen.",
  cta: "Einladung annehmen",
  expiry: "Dieser Link ist 14 Tage gültig.",
  footer: "Automatisch gesendet.",
};

describe("buildInviteEmailHtml", () => {
  it("renders the accept link as the first anchor so mail-capture can extract it", () => {
    const html = buildInviteEmailHtml(content);
    const linkMatch = /<a [^>]*href="([^"]+)"/i.exec(html);
    expect(linkMatch?.[1]).toBe(content.acceptUrl);
  });

  it("includes the heading, intro, and CTA copy", () => {
    const html = buildInviteEmailHtml(content);
    expect(html).toContain(content.heading);
    expect(html).toContain(content.intro);
    expect(html).toContain(content.cta);
  });
});
