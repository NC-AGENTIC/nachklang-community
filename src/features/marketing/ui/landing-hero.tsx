import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { LanguageSwitcher } from "@/features/i18n/ui/language-switcher";

import { LandingLinks } from "./landing-links";
import { LandingTrustStrip } from "./landing-trust-strip";

export function LandingHero() {
  const t = useTranslations("marketing.hero");
  const tCommon = useTranslations("common");

  return (
    <>
      <div className="landing__watermark" aria-hidden="true">
        <Image
          src="/brand/logo-dark.png"
          alt=""
          width={1400}
          height={1400}
          priority={false}
        />
      </div>

      <header className="landing__top">
        <Link href="/" className="landing__wordmark" aria-label="NachKlang">
          <span aria-hidden="true" className="landing__wordmark-mark" />
          <span className="landing__wordmark-text">
            Nach<em>Klang</em>
          </span>
        </Link>
        <div className="landing__top-actions">
          <LanguageSwitcher ariaLabel={tCommon("languageSwitcherAria")} />
          <Link href="/signin" className="landing__topcta">
            {t("signinLink")}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <section className="landing__hero" id="hero">
        <p className="landing__eyebrow">
          <span aria-hidden="true" className="landing__eyebrow-rule" />
          {t("eyebrow")}
        </p>

        <h1 className="landing__headline">
          <span style={{ animationDelay: "120ms" }}>{t("headline1")}</span>
          <span style={{ animationDelay: "260ms" }}>{t("headline2")}</span>
          <span style={{ animationDelay: "400ms" }}>{t("headline3")}</span>
        </h1>

        <p className="landing__lede">{t("lede")}</p>

        <div className="landing__ctas">
          <Link href="/signup" className="landing__cta landing__cta--primary">
            <span>{t("ctaCreate")}</span>
            <span aria-hidden="true" className="landing__arrow">→</span>
          </Link>
          <Link href="/signin" className="landing__cta landing__cta--ghost">
            {t("ctaSignin")}
          </Link>
        </div>

        <LandingTrustStrip />
        <LandingLinks />
      </section>

      <footer className="landing__foot" aria-label={t("footerAriaLabel")}>
        <span className="landing__foot-dot" aria-hidden="true" />
        <span className="landing__foot-copy">
          {t("footerCopy")} {new Date().getFullYear()}
        </span>
        <span aria-hidden="true" className="landing__foot-sep">·</span>
        <Link href="/impressum" className="landing__foot-link">
          {t("footerImpressum")}
        </Link>
        <span aria-hidden="true" className="landing__foot-sep">·</span>
        <Link href="/datenschutz" className="landing__foot-link">
          {t("footerDatenschutz")}
        </Link>
        <span aria-hidden="true" className="landing__foot-sep">·</span>
        <Link href="/copyright" className="landing__foot-link">
          {t("footerCopyright")}
        </Link>
      </footer>
    </>
  );
}
