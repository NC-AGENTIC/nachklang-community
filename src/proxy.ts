import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import {
  buildContentSecurityPolicy,
  securityHeaders,
  type RuntimeEnvironment,
} from "./server/security/headers";

const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const environment: RuntimeEnvironment =
    process.env.NODE_ENV === "production" ? "production" : "development";
  const contentSecurityPolicy = buildContentSecurityPolicy(environment, nonce);

  // Inject x-nonce + CSP into request headers BEFORE next-intl reads them.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", contentSecurityPolicy);

  const i18nRequest = new NextRequest(request.nextUrl, {
    headers: requestHeaders,
  });
  const i18nResponse = handleI18nRouting(i18nRequest);

  // If next-intl returns nothing (e.g. path excluded from its internal matcher),
  // fall back to a plain NextResponse.next() so headers can still be applied.
  const response: NextResponse =
    i18nResponse instanceof NextResponse
      ? i18nResponse
      : NextResponse.next({ request: { headers: requestHeaders } });

  // Re-apply forwarded request headers using Next's documented mechanism:
  // x-middleware-override-headers (comma-separated list) +
  // x-middleware-request-<header-name>: <value>
  const existingOverrides = response.headers.get("x-middleware-override-headers");
  const overrides = new Set(
    (existingOverrides ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  overrides.add("x-nonce");
  overrides.add("content-security-policy");
  response.headers.set("x-middleware-override-headers", [...overrides].join(","));
  response.headers.set("x-middleware-request-x-nonce", nonce);
  response.headers.set("x-middleware-request-content-security-policy", contentSecurityPolicy);

  // Apply the final response security headers.
  response.headers.set("content-security-policy", contentSecurityPolicy);
  for (const header of securityHeaders(environment, { includeContentSecurityPolicy: false })) {
    response.headers.set(header.key, header.value);
  }

  return response;
}

export default proxy;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand|logos|favicon.ico).*)"],
};
