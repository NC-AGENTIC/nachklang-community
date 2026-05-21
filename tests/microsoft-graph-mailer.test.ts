import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildGraphTokenRequestBody,
  buildGraphSendMailRequest,
} from "../src/server/mail/microsoft-graph";

describe("Microsoft Graph mailer", () => {
  beforeEach(() => {
    process.env.GRAPH_MAILBOX_UPN = "mailbox@example.com";
    process.env.NACHKLANG_VISIBLE_EMAIL = "visible@example.com";
  });

  afterEach(() => {
    delete process.env.GRAPH_MAILBOX_UPN;
    delete process.env.NACHKLANG_VISIBLE_EMAIL;
  });

  it("uses the env-configured Graph mailbox UPN and visible NachKlang address", () => {
    const request = buildGraphSendMailRequest({
      to: "user@example.org",
      subject: "NachKlang Sicherheitscode",
      html: "<p>123456</p>",
    });

    expect(request.endpoint).toBe(
      "https://graph.microsoft.com/v1.0/users/mailbox%40example.com/sendMail",
    );
    expect(request.payload.message.replyTo?.[0]?.emailAddress.address).toBe("visible@example.com");
    expect(request.payload.message.internetMessageHeaders[0]?.value).toBe("mailbox@example.com");
    expect(request.payload.saveToSentItems).toBe(false);
  });

  it("throws when the Graph mailbox UPN is not configured", () => {
    delete process.env.GRAPH_MAILBOX_UPN;
    expect(() =>
      buildGraphSendMailRequest({ to: "user@example.org", subject: "x", html: "<p>x</p>" }),
    ).toThrow(/GRAPH_MAILBOX_UPN/);
  });

  it("refuses client-secret-only Graph auth when authMode is certificate", () => {
    expect(() =>
      buildGraphTokenRequestBody({
        clientId: "client-id",
        clientSecret: "secret",
        authMode: "certificate",
      }),
    ).toThrow(/client assertion/);
  });

  it("allows certificate-backed client assertions for Graph auth", () => {
    const body = buildGraphTokenRequestBody({
      clientId: "client-id",
      clientAssertion: "signed-jwt",
      authMode: "certificate",
    });

    expect(body.get("client_assertion")).toBe("signed-jwt");
    expect(body.get("client_secret")).toBeNull();
    expect(body.get("client_assertion_type")).toContain("jwt-bearer");
  });
});
