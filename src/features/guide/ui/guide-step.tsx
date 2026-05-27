// src/features/guide/ui/guide-step.tsx
"use client";

import { useTranslations } from "next-intl";

import type { GuideStep as GuideStepData } from "../content/types";

export function GuideStep({ step, index }: { step: GuideStepData; index: number }) {
  const t = useTranslations("guide");

  return (
    <li className="guide-step">
      <span className="guide-step__num" aria-hidden="true">
        {index}
      </span>
      <div className="guide-step__body">
        <h3 className="guide-step__title">{step.title}</h3>
        <p className="guide-step__text">{step.body}</p>
        {step.callout ? (
          <p className={`guide-callout guide-callout--${step.callout.kind}`}>{step.callout.text}</p>
        ) : null}
        {step.securityNote ? (
          <div className="guide-secnote">
            <p className="guide-secnote__line">
              <span className="guide-secnote__label guide-secnote__label--risk">{t("securityRiskLabel")}</span>{" "}
              {step.securityNote.risk}
            </p>
            <p className="guide-secnote__line">
              <span className="guide-secnote__label guide-secnote__label--mit">{t("securityMitigationLabel")}</span>{" "}
              {step.securityNote.mitigation}
            </p>
          </div>
        ) : null}
      </div>
    </li>
  );
}
