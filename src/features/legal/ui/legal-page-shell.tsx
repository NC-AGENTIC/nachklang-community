import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
};

export async function LegalPageShell({ eyebrow, title, intro, children }: LegalPageShellProps) {
  const t = await getTranslations("legal.shell");

  return (
    <article className="legal__article">
      <Link href="/" className="legal__back" aria-label={t("backAriaLabel")}>
        <span aria-hidden="true">←</span>
        {t("backLabel")}
      </Link>

      <header className="legal__header">
        <p className="legal__eyebrow">{eyebrow}</p>
        <h1 className="legal__title">{title}</h1>
        {intro ? <p className="legal__intro">{intro}</p> : null}
      </header>

      <div className="legal__body">{children}</div>
    </article>
  );
}
