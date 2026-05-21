import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LEGAL_INFO } from "@/features/legal/data/legal-info";
import { LegalPageShell } from "@/features/legal/ui/legal-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Impressum · NachKlang",
  description: "Angaben gemäß § 5 DDG / § 18 MStV.",
};

export default async function ImpressumPage() {
  const { company } = LEGAL_INFO;
  const t = await getTranslations("legal.impressum");
  const ti = await getTranslations("legal.info");

  return (
    <main className="legal">
      <LegalPageShell
        eyebrow={t("eyebrow")}
        title={t("title")}
        intro={t("intro")}
      >
        <section>
          <h2>{t("sectionProviderTitle")}</h2>
          <address className="legal__address">
            <strong>{company.name}</strong>
            <span>{company.street}</span>
            <span>
              D&#8209;{company.postalCode} {company.city}
            </span>
            <span>{company.country}</span>
          </address>
        </section>

        <section>
          <h2>{t("sectionContactTitle")}</h2>
          <dl className="legal__definitions">
            <div>
              <dt>{ti("labelEmail")}</dt>
              <dd>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>{t("sectionManagingDirectorTitle")}</h2>
          <p>{company.managingDirector}</p>
        </section>

        <section>
          <h2>{t("sectionRegisterTitle")}</h2>
          <dl className="legal__definitions">
            <div>
              <dt>{ti("labelRegisterCourt")}</dt>
              <dd>{company.registerCourt}</dd>
            </div>
            <div>
              <dt>{ti("labelCommercialRegisterNumber")}</dt>
              <dd>{company.commercialRegisterNumber}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>{t("sectionResponsibleTitle")}</h2>
          <p>
            {company.managingDirector}, {company.name}, {company.street}, D&#8209;{company.postalCode}{" "}
            {company.city}
          </p>
        </section>

        <section>
          <h2>{t("sectionDisputeTitle")}</h2>
          <p>
            {t.rich("sectionDisputeBody", {
              odrLink: (chunks) => (
                <a href="https://ec.europa.eu/consumers/odr" rel="noreferrer noopener">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        <section>
          <h2>{t("sectionLiabilityContentTitle")}</h2>
          <p>{t("sectionLiabilityContentBody")}</p>
        </section>

        <section>
          <h2>{t("sectionLiabilityLinksTitle")}</h2>
          <p>{t("sectionLiabilityLinksBody")}</p>
        </section>
      </LegalPageShell>
    </main>
  );
}
