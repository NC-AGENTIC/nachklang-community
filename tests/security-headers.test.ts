import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, securityHeaders } from "../src/server/security/headers";

describe("security headers", () => {
  it("allows only Cloudflare Turnstile as a third party, blocks others and framing", () => {
    const csp = buildContentSecurityPolicy("production", "test-nonce");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    // Turnstile (bot protection) is the single deliberate external origin.
    expect(csp).toContain("https://challenges.cloudflare.com");
    // No bare https: scheme wildcard and no other external host is allowed.
    expect(csp).not.toMatch(/https:(?!\/\/challenges\.cloudflare\.com)/);
    expect(csp).not.toContain("*");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  // Trusted Types enforcement is deferred (a transitive dep uses the
  // Function("return this") globalThis shim, which TT blocks). First-party code
  // is sink-free; assert we don't ship a broken enforcing directive.
  it("does not enforce Trusted Types yet (dependency blocker, see SP6a)", () => {
    const csp = buildContentSecurityPolicy("production", "test-nonce");
    expect(csp).not.toContain("require-trusted-types-for");
  });

  it("enforces transport and browser isolation headers", () => {
    const headers = securityHeaders("production");

    expect(headers).toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
    expect(headers).toContainEqual({ key: "Cross-Origin-Opener-Policy", value: "same-origin" });
    expect(headers).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
  });
});
