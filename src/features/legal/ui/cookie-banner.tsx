"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

import { readCookieConsent, writeCookieConsent } from "../state/cookie-consent";

export function CookieBanner() {
  const t = useTranslations("legal.cookieBanner");
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (readCookieConsent() === null) {
      setVisible(true);
    }
  }, []);

  function decide(analytics: boolean) {
    writeCookieConsent({ analytics });
    setVisible(false);
  }

  if (!mounted || !visible) {
    return null;
  }

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
    >
      <div className="cookie-banner__inner">
        <div className="cookie-banner__copy">
          <p id="cookie-banner-title" className="cookie-banner__eyebrow">
            {t("title")}
          </p>
          <p id="cookie-banner-body" className="cookie-banner__text">
            {t.rich("text", {
              privacyLink: (chunks) => (
                <Link href="/datenschutz" className="cookie-banner__link">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <div className="cookie-banner__actions">
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--ghost"
            onClick={() => decide(false)}
          >
            {t("btnEssential")}
          </button>
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--primary"
            onClick={() => decide(true)}
          >
            {t("btnAcceptAll")}
            <span aria-hidden="true" className="cookie-banner__arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
