import { describe, expect, it } from "vitest";

import { safeReturnTo } from "@/server/auth/return-to";

describe("safeReturnTo", () => {
  it("accepts internal locale-relative paths", () => {
    expect(safeReturnTo("/shares/accept/TOK")).toBe("/shares/accept/TOK");
    expect(safeReturnTo("/de/vault")).toBe("/de/vault");
  });

  it("rejects open-redirect attempts", () => {
    expect(safeReturnTo("//evil.example")).toBeNull();
    expect(safeReturnTo("https://evil.example")).toBeNull();
    expect(safeReturnTo("http://evil.example")).toBeNull();
    expect(safeReturnTo("/\\evil")).toBeNull();
    expect(safeReturnTo("evil")).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(safeReturnTo(undefined)).toBeNull();
    expect(safeReturnTo(123)).toBeNull();
    expect(safeReturnTo(["/x"])).toBeNull();
  });
});
