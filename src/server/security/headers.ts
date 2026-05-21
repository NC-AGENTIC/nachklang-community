export type SecurityHeader = {
  key: string;
  value: string;
};

export type RuntimeEnvironment = "development" | "test" | "production";

// NOTE on Trusted Types (SP6a): our own DOM sinks were removed (TOTP QR is now an
// <img>, the recovery print window is built with DOM APIs), so first-party code is
// Trusted-Types-clean. We do NOT yet enforce `require-trusted-types-for 'script'`
// because a transitive dependency uses the `Function("return this")()` globalThis
// shim, which Trusted Types blocks at the Function constructor (no policy can
// cleanly allow it). Enforcement is one dependency upgrade/replacement away — see
// docs/superpowers/specs/2026-05-20-sp6a-trusted-types-design.md.
// Cloudflare Turnstile (bot/abuse protection) loads a script + iframe from this origin.
// Allowlisted unconditionally so the captcha works whenever it is enabled via env; it
// only permits loading Turnstile from Cloudflare and is inert when the widget is absent.
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export function buildContentSecurityPolicy(environment: RuntimeEnvironment, nonce?: string): string {
  const scriptSource = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${environment === "development" ? " 'unsafe-eval'" : ""} 'wasm-unsafe-eval' ${TURNSTILE_ORIGIN}`
    : environment === "development"
      ? `script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' ${TURNSTILE_ORIGIN}`
      : `script-src 'self' 'wasm-unsafe-eval' ${TURNSTILE_ORIGIN}`;
  const directives = [
    "default-src 'self'",
    scriptSource,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${TURNSTILE_ORIGIN}`,
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `frame-src ${TURNSTILE_ORIGIN}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (environment === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function securityHeaders(
  environment: RuntimeEnvironment,
  options: { includeContentSecurityPolicy?: boolean; nonce?: string } = {},
): SecurityHeader[] {
  const includeContentSecurityPolicy = options.includeContentSecurityPolicy ?? true;
  const headers: SecurityHeader[] = [
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];

  if (!includeContentSecurityPolicy) {
    return headers;
  }

  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(environment, options.nonce),
    },
    ...headers,
  ];
}
