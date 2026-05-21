import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LEGAL_INFO } from "@/features/legal/data/legal-info";
import { LegalPageShell } from "@/features/legal/ui/legal-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Datenschutz · NachKlang",
  description: "Datenschutzerklärung gemäß DSGVO für den NachKlang Zero-Knowledge Vault.",
};

export default async function DatenschutzPage() {
  const { company, product, effectiveDate } = LEGAL_INFO;
  const t = await getTranslations("legal.datenschutz");

  return (
    <main className="legal">
      <LegalPageShell
        eyebrow={t("eyebrow")}
        title={t("title")}
        intro={t("introTemplate", { date: effectiveDate, product: product.name })}
      >
        <section>
          <h2>{t("s1Title")}</h2>
          <p>{t("s1Body")}</p>
          <address className="legal__address">
            <strong>{company.name}</strong>
            <span>{company.street}</span>
            <span>
              D&#8209;{company.postalCode} {company.city}
            </span>
            <span>{company.country}</span>
            <span>
              E&#8209;Mail: <a href={`mailto:${company.email}`}>{company.email}</a>
            </span>
          </address>
        </section>

        <section>
          <h2>{t("s2Title")}</h2>
          <p>{t("s2Body", { product: product.name })}</p>
        </section>

        <section>
          <h2>{t("s3Title")}</h2>
          <h3>{t("s31Title")}</h3>
          <p>{t("s31Body")}</p>
          <h3>{t("s32Title")}</h3>
          <p>{t("s32Body")}</p>
          <h3>{t("s33Title")}</h3>
          <p>{t("s33Body")}</p>
          <h3>{t("s34Title")}</h3>
          <p>{t("s34Body")}</p>
          <h3>{t("s35Title")}</h3>
          <p>{t("s35Body")}</p>
        </section>

        <section>
          <h2>{t("s4Title")}</h2>
          <p>{t("s4Body", { product: product.name })}</p>
        </section>

        <section>
          <h2>{t("s5Title")}</h2>
          <p>{t("s5Body", { product: product.name, provider: product.hostingProvider })}</p>
        </section>

        <section>
          <h2>{t("s6Title")}</h2>
          <p>{t("s6Body", { mailService: product.mailService })}</p>
        </section>

        <section>
          <h2>{t("s7Title")}</h2>
          <p>{t("s7Intro")}</p>
          <ul>
            <li>{t("s7Right1")}</li>
            <li>{t("s7Right2")}</li>
            <li>{t("s7Right3")}</li>
            <li>{t("s7Right4")}</li>
            <li>{t("s7Right5")}</li>
            <li>{t("s7Right6")}</li>
          </ul>
          <p>
            {t("s7ContactPrefix")}{" "}
            <a href={`mailto:${company.dataProtectionEmail}`}>{company.dataProtectionEmail}</a>.
          </p>
        </section>

        <section>
          <h2>{t("s8Title")}</h2>
          <p>{t("s8Body")}</p>
        </section>

        <section>
          <h2>{t("s9Title")}</h2>
          <p>{t("s9Body")}</p>
        </section>

        <section>
          <h2>{t("s10Title")}</h2>
          <p>{t("s10Body")}</p>
        </section>
      </LegalPageShell>
    </main>
  );
}
