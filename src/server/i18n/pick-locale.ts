import { routing, type Locale } from "@/i18n/routing";

/**
 * Resolve the best locale from an incoming server Request.
 *
 * Resolution order:
 *  1. Referer header   — contains /<locale>/ path segment
 *  2. NEXT_LOCALE cookie
 *  3. routing.defaultLocale fallback
 */
export function pickLocaleFromRequest(req: Request | undefined): Locale {
  if (!req) return routing.defaultLocale;

  const referer = req.headers.get("referer") ?? "";
  for (const locale of routing.locales) {
    if (referer.includes(`/${locale}/`) || referer.endsWith(`/${locale}`)) {
      return locale;
    }
  }

  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/NEXT_LOCALE=([a-z]{2})/);
  if (match && (routing.locales as readonly string[]).includes(match[1])) {
    return match[1] as Locale;
  }

  return routing.defaultLocale;
}
