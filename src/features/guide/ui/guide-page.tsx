// src/features/guide/ui/guide-page.tsx
"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";

import type { GuideContent } from "../content/types";
import { GuideSection } from "./guide-section";
import { GuideToc } from "./guide-toc";
import { useScrollSpy } from "./use-scroll-spy";

export function GuidePage({ content, isFallback }: { content: GuideContent; isFallback: boolean }) {
  const t = useTranslations("guide");
  const ids = content.sections.map((s) => s.id);
  const activeId = useScrollSpy(ids);

  return (
    <main className="guide" id="workspace">
      <Link href="/" className="guide__back">
        <span aria-hidden="true">←</span> {t("backLabel")}
      </Link>

      <Link href="/security" className="guide__security-spotlight">
        <span className="guide__security-spotlight-icon" aria-hidden="true">
          <ShieldCheck size={28} strokeWidth={1.6} />
        </span>
        <span className="guide__security-spotlight-body">
          <span className="guide__security-spotlight-eyebrow">
            <span aria-hidden="true" className="guide__security-spotlight-rule" />
            {t("securitySpotlight.eyebrow")}
          </span>
          <span className="guide__security-spotlight-title">
            {t("securitySpotlight.title")}
          </span>
          <span className="guide__security-spotlight-lede">
            {t("securitySpotlight.lede")}
          </span>
        </span>
        <span className="guide__security-spotlight-cta">
          {t("securitySpotlight.cta")}
          <ArrowRight size={18} strokeWidth={2} />
        </span>
      </Link>

      <header className="guide__header">
        <p className="guide__eyebrow">{content.eyebrow}</p>
        <h1 className="guide__title">{content.title}</h1>
        <p className="guide__lede">{content.lede}</p>
        {isFallback ? <p className="guide__fallback">{t("fallbackNotice")}</p> : null}
      </header>

      <div className="guide__layout">
        <GuideToc items={content.sections.map((s) => ({ id: s.id, navLabel: s.navLabel }))} activeId={activeId} />
        <div className="guide__sections">
          {content.sections.map((section) => (
            <GuideSection key={section.id} section={section} />
          ))}
        </div>
      </div>
    </main>
  );
}
