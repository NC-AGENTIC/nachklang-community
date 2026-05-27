import { beforeEach, describe, expect, it } from "vitest";

import {
  RecipientPolicyError,
  __resetSendQuotaForTests,
  assertRecipientWithinSendQuota,
  assertSendableRecipient,
} from "@/server/auth/email-policy";

describe("assertSendableRecipient", () => {
  it.each([
    "user@example.com",
    "user@example.net",
    "user@example.org",
    "anything@foo.test",
    "anything@foo.example",
    "anything@foo.invalid",
    "anything@foo.localhost",
    "PK-1779270454746-V0i5@EXAMPLE.TEST",
    "x@bar.something.example.com",
  ])("rejects reserved-domain address %s", (addr) => {
    expect(() => assertSendableRecipient(addr)).toThrow(RecipientPolicyError);
    try {
      assertSendableRecipient(addr);
    } catch (err) {
      expect((err as RecipientPolicyError).code).toBe("RESERVED_DOMAIN");
    }
  });

  it.each([
    "",
    "   ",
    "no-at-sign",
    "user@",
    "@host.com",
    "user@host",
    "user @host.com",
    "user@host..com",
    "user@-host.com",
    `${"a".repeat(250)}@host.com`,
  ])("rejects malformed address %s", (addr) => {
    expect(() => assertSendableRecipient(addr)).toThrow(RecipientPolicyError);
    try {
      assertSendableRecipient(addr);
    } catch (err) {
      expect((err as RecipientPolicyError).code).toBe("INVALID_EMAIL");
    }
  });

  it.each([
    "user@gmail.com",
    "user.name+tag@protonmail.com",
    "gf@startvisor.ai",
    "x@a.co",
    "user@sub.domain.example-co.de",
  ])("accepts legitimate address %s", (addr) => {
    expect(() => assertSendableRecipient(addr)).not.toThrow();
  });
});

describe("assertRecipientWithinSendQuota", () => {
  beforeEach(() => {
    __resetSendQuotaForTests();
  });

  it("allows up to 3 sends per address inside the 10-minute window", () => {
    const t0 = 1_700_000_000_000;
    assertRecipientWithinSendQuota("user@gmail.com", t0);
    assertRecipientWithinSendQuota("user@gmail.com", t0 + 1_000);
    assertRecipientWithinSendQuota("user@gmail.com", t0 + 2_000);
  });

  it("rejects a 4th send inside the window with QUOTA_EXCEEDED", () => {
    const t0 = 1_700_000_000_000;
    assertRecipientWithinSendQuota("user@gmail.com", t0);
    assertRecipientWithinSendQuota("user@gmail.com", t0 + 1_000);
    assertRecipientWithinSendQuota("user@gmail.com", t0 + 2_000);
    try {
      assertRecipientWithinSendQuota("user@gmail.com", t0 + 3_000);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RecipientPolicyError);
      expect((err as RecipientPolicyError).code).toBe("QUOTA_EXCEEDED");
    }
  });

  it("releases the slot once the window has elapsed", () => {
    const t0 = 1_700_000_000_000;
    const tenMin = 10 * 60 * 1000;
    assertRecipientWithinSendQuota("user@gmail.com", t0);
    assertRecipientWithinSendQuota("user@gmail.com", t0 + 1);
    assertRecipientWithinSendQuota("user@gmail.com", t0 + 2);
    expect(() => assertRecipientWithinSendQuota("user@gmail.com", t0 + tenMin + 1)).not.toThrow();
  });

  it("keys by normalized address (case- and whitespace-insensitive)", () => {
    const t0 = 1_700_000_000_000;
    assertRecipientWithinSendQuota("user@gmail.com", t0);
    assertRecipientWithinSendQuota(" USER@Gmail.COM ", t0 + 1);
    assertRecipientWithinSendQuota("User@gmail.com", t0 + 2);
    expect(() => assertRecipientWithinSendQuota("user@gmail.com", t0 + 3)).toThrow(
      RecipientPolicyError,
    );
  });

  it("tracks distinct addresses independently", () => {
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 3; i += 1) assertRecipientWithinSendQuota("a@gmail.com", t0 + i);
    for (let i = 0; i < 3; i += 1) {
      expect(() => assertRecipientWithinSendQuota("b@gmail.com", t0 + i)).not.toThrow();
    }
  });
});
