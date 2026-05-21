import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LEGAL_INFO } from "@/features/legal/data/legal-info";
import { LegalPageShell } from "@/features/legal/ui/legal-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Copyright · NachKlang",
  description: "Urheberrecht und Marken — NachKlang & NC AGENTIC GmbH.",
};

export default async function CopyrightPage() {
  const { company, product } = LEGAL_INFO;
  const year = new Date().getFullYear();
  const t = await getTranslations("legal.copyright");

  return (
    <main className="legal">
      <LegalPageShell
        eyebrow={t("eyebrow")}
        title={t("title")}
        intro={t("introTemplate", { year, company: company.name })}
      >
        <section>
          <h2>{t("s1Title")}</h2>
          <p>{t("s1Body", { product: product.name, company: company.name })}</p>
        </section>

        <section>
          <h2>{t("s2Title")}</h2>
          <p>{t("s2Body", { company: company.name })}</p>
        </section>

        <section>
          <h2>{t("s3Title")}</h2>
          <p>{t("s3Body", { product: product.name })}</p>
        </section>

        <section>
          <h2>{t("s4Title")}</h2>
          <p>{t("s4Body", { company: company.name, product: product.name })}</p>
        </section>

        <section>
          <h2>{t("s5Title")}</h2>
          <p>
            {t.rich("s5Body", {
              email: () => (
                <a href={`mailto:${company.email}`}>{company.email}</a>
              ),
            })}
          </p>
        </section>
      </LegalPageShell>
    </main>
  );
}
