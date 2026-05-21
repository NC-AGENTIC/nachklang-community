import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

export type OnboardingShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  step: 1 | 2 | 3;
  totalSteps: 3;
  stepLabels: readonly [string, string, string];
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
};

export function OnboardingShell({
  eyebrow,
  title,
  subtitle,
  step,
  totalSteps,
  stepLabels,
  onBack,
  backLabel,
  children,
}: OnboardingShellProps) {
  const t = useTranslations("onboarding.shell");
  const resolvedBackLabel = backLabel ?? t("defaultBackLabel");
  return (
    <main className="auth onboarding" id="workspace">
      <div className="auth__watermark" aria-hidden="true">
        <Image
          src="/brand/logo-dark.png"
          alt=""
          width={1100}
          height={1100}
          priority={false}
        />
      </div>

      <header className="auth__top">
        <Link href="/" className="auth__wordmark" aria-label={t("logoAriaLabel")}>
          <span aria-hidden="true" className="auth__wordmark-mark" />
          <span className="auth__wordmark-text">
            Nach<em>Klang</em>
          </span>
        </Link>
      </header>

      <section className="auth__container">
        <article className="auth__card onboarding__card">
          <p className="auth__eyebrow">
            <span aria-hidden="true" className="auth__eyebrow-rule" />
            {eyebrow}
          </p>
          <h1 className="auth__title">{title}</h1>
          {subtitle ? <p className="auth__subtitle">{subtitle}</p> : null}

          <ol className="onboarding__step-indicator" aria-label={t("stepIndicatorAriaLabel", { step, total: totalSteps })}>
            {stepLabels.map((label, idx) => {
              const position = idx + 1;
              const stateClass =
                position < step ? "past" : position === step ? "current" : "future";
              return (
                <li key={label} className={`onboarding__step ${stateClass}`} aria-current={position === step ? "step" : undefined}>
                  <span aria-hidden="true" className="onboarding__step-dot" />
                  <span className="onboarding__step-label">{label}</span>
                </li>
              );
            })}
          </ol>

          <div className="auth__form onboarding__body">{children}</div>

          {onBack ? (
            <button type="button" className="onboarding__back" onClick={onBack}>
              {resolvedBackLabel}
            </button>
          ) : null}
        </article>
      </section>

      <footer className="auth__foot">
        <Link href="/impressum">{t("footerImpressum")}</Link>
        <span aria-hidden="true">·</span>
        <Link href="/datenschutz">{t("footerDatenschutz")}</Link>
        <span aria-hidden="true">·</span>
        <Link href="/copyright">{t("footerCopyright")}</Link>
      </footer>
    </main>
  );
}
