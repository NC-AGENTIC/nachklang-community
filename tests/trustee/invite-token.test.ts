import { describe, expect, it } from "vitest";

import {
  generateInviteToken,
  inviteExpiry,
  isInviteAcceptable,
  INVITE_TTL_DAYS,
} from "@/server/trustee/invite-token";

describe("invite token helpers", () => {
  it("generates URL-safe tokens with enough entropy", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it("computes an expiry INVITE_TTL_DAYS in the future", () => {
    const now = new Date("2026-05-21T10:00:00.000Z");
    const exp = inviteExpiry(now);
    const expectedMs = now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;
    expect(exp.getTime()).toBe(expectedMs);
  });

  it("accepts an invited, unexpired invite", () => {
    const now = new Date("2026-05-21T10:00:00.000Z");
    expect(
      isInviteAcceptable({ status: "invited", expiresAt: new Date(now.getTime() + 1000) }, now),
    ).toBe(true);
  });

  it("keeps an already-accepted invite acceptable within its 14-day window", () => {
    // The link stays usable for the member for the full TTL: re-opening after acceptance must
    // not error as "expired/used" — acceptInvite is idempotent and seal-preserving.
    const now = new Date("2026-05-21T10:00:00.000Z");
    expect(
      isInviteAcceptable({ status: "accepted", expiresAt: new Date(now.getTime() + 1000) }, now),
    ).toBe(true);
  });

  it("rejects an expired invite (invited or accepted)", () => {
    const now = new Date("2026-05-21T10:00:00.000Z");
    const past = new Date(now.getTime() - 1000);
    expect(isInviteAcceptable({ status: "invited", expiresAt: past }, now)).toBe(false);
    expect(isInviteAcceptable({ status: "accepted", expiresAt: past }, now)).toBe(false);
  });

  it("rejects a revoked invite", () => {
    const now = new Date("2026-05-21T10:00:00.000Z");
    const future = new Date(now.getTime() + 1000);
    expect(isInviteAcceptable({ status: "revoked", expiresAt: future }, now)).toBe(false);
  });
});
