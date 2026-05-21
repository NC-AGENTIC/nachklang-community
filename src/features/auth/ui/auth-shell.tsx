"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

export type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  secondaryAction?: { label: string; href: string };
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, subtitle, secondaryAction, children }: AuthShellProps) {
  const t = useTranslations("auth.shell");

  return (
    <main className="auth" id="workspace">
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
        <article className="auth__card">
          <p className="auth__eyebrow">
            <span aria-hidden="true" className="auth__eyebrow-rule" />
            {eyebrow}
          </p>
          <h1 className="auth__title">{title}</h1>
          {subtitle ? <p className="auth__subtitle">{subtitle}</p> : null}
          <div className="auth__form">{children}</div>
        </article>

        {secondaryAction ? (
          <p className="auth__secondary">
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </p>
        ) : null}
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
