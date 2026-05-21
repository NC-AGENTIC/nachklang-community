export const COOKIE_CONSENT_STORAGE_KEY = "nachklang.cookie-consent.v1";

export type CookieConsent = {
  version: 1;
  essential: true;
  analytics: boolean;
  decidedAt: string;
};

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.version !== 1 || parsed.essential !== true || typeof parsed.analytics !== "boolean") {
      return null;
    }
    return parsed as CookieConsent;
  } catch {
    return null;
  }
}

export function writeCookieConsent(input: { analytics: boolean }): CookieConsent {
  const consent: CookieConsent = {
    version: 1,
    essential: true,
    analytics: input.analytics,
    decidedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  }
  return consent;
}
