import { describe, expect, it } from "vitest";

import { createInviteSchema } from "@/features/trustee/domain/share-schemas";

describe("createInviteSchema", () => {
  it("accepts a valid email + label", () => {
    const parsed = createInviteSchema.safeParse({ inviteeEmail: "trustee@example.test", label: "Meine Schwester" });
    expect(parsed.success).toBe(true);
  });

  it("lowercases and trims the email", () => {
    const parsed = createInviteSchema.parse({ inviteeEmail: "  Trustee@Example.Test ", label: "X" });
    expect(parsed.inviteeEmail).toBe("trustee@example.test");
  });

  it("rejects a malformed email", () => {
    expect(createInviteSchema.safeParse({ inviteeEmail: "nope", label: "X" }).success).toBe(false);
  });

  it("rejects an empty or overlong label", () => {
    expect(createInviteSchema.safeParse({ inviteeEmail: "a@b.test", label: "" }).success).toBe(false);
    expect(
      createInviteSchema.safeParse({ inviteeEmail: "a@b.test", label: "x".repeat(81) }).success,
    ).toBe(false);
  });
});
