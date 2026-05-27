// src/features/guide/ui/guide-section.tsx
"use client";

import { useTranslations } from "next-intl";

import type { GuideSection as GuideSectionData } from "../content/types";
import { GuideStep } from "./guide-step";
import { ILLUSTRATIONS } from "./illustrations";
import { Reveal } from "./reveal";

export function GuideSection({ section }: { section: GuideSectionData }) {
  const t = useTranslations("guide");
  const Illustration = ILLUSTRATIONS[section.illustration];

  return (
    <section id={section.id} className="guide-section" aria-labelledby={`${section.id}-title`}>
      <Reveal>
        <div className="guide-section__head">
          <div className="guide-section__illustration" data-illustration={section.illustration} aria-hidden="true">
            <Illustration />
          </div>
          <div className="guide-section__heading">
            <h2 id={`${section.id}-title`} className="guide-section__title">
              {section.title}
            </h2>
            {section.intro ? <p className="guide-section__intro">{section.intro}</p> : null}
          </div>
        </div>

        {section.steps.length > 0 ? (
          <ol className="guide-steps">
            {section.steps.map((step, i) => (
              <GuideStep key={i} step={step} index={i + 1} />
            ))}
          </ol>
        ) : null}

        {section.securityNotes && section.securityNotes.length > 0 ? (
          <div className="guide-secnotes">
            {section.securityNotes.map((note, i) => (
              <div key={i} className="guide-secnote">
                <p className="guide-secnote__line">
                  <span className="guide-secnote__label guide-secnote__label--risk">{t("securityRiskLabel")}</span>{" "}
                  {note.risk}
                </p>
                <p className="guide-secnote__line">
                  <span className="guide-secnote__label guide-secnote__label--mit">{t("securityMitigationLabel")}</span>{" "}
                  {note.mitigation}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Reveal>
    </section>
  );
}
