import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { proxy, config } from "@/proxy";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(`http://localhost${path}`), { headers });
}

describe("proxy: i18n + CSP nonce composition", () => {
  it("redirects bare / to a locale-prefixed URL", async () => {
    const res = await proxy(req("/", { "accept-language": "de" }));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toMatch(/\/de(\/|$)/);
  });

  it("honors Accept-Language for /", async () => {
    const res = await proxy(req("/", { "accept-language": "en-US,en;q=0.9" }));
    expect(res.headers.get("location")).toMatch(/\/en(\/|$)/);
  });

  it("rewrites /de/vault and applies CSP + security headers", async () => {
    const res = await proxy(req("/de/vault"));
    const csp = res.headers.get("content-security-policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("nonce-");
    expect(res.headers.get("strict-transport-security")).toBeTruthy();
    expect(res.headers.get("x-frame-options")).toEqual("DENY");
  });

  it("forwards x-nonce to the request headers reaching the page", async () => {
    const res = await proxy(req("/de/vault"));
    const overrides = res.headers.get("x-middleware-override-headers");
    const forwardedNonce = res.headers.get("x-middleware-request-x-nonce");
    expect(overrides ?? "").toContain("x-nonce");
    expect(forwardedNonce).toBeTruthy();
  });

  it("config.matcher excludes /api/*", () => {
    expect(JSON.stringify(config.matcher)).toMatch(/!api/);
  });
});
