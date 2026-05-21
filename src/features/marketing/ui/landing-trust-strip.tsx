import Image from "next/image";
import { useTranslations } from "next-intl";

export function LandingTrustStrip() {
  const t = useTranslations("marketing.trustStrip");

  return (
    <ul className="landing__trust" aria-label={t("ariaLabel")}>
      <li className="landing__trust-item">
        <Image
          src="/logos/eu-logo.png"
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          className="landing__trust-flag"
        />
        {t("euDataProtection")}
      </li>
      <li className="landing__trust-item">
        <span className="landing__trust-dot" aria-hidden="true" />
        {t("hostedInGermany")}
      </li>
      <li className="landing__trust-item">
        <span className="landing__trust-dot" aria-hidden="true" />
        <a
          href="https://github.com/NC-AGENTIC/nachklang-community/blob/main/SECURITY.md"
          target="_blank"
          rel="noreferrer noopener"
          className="landing__trust-doclink"
        >
          {t("zeroKnowledge")}
        </a>
      </li>
    </ul>
  );
}
