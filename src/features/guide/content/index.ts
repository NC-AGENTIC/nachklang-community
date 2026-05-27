// src/features/guide/content/index.ts
import type { Locale } from "@/i18n/routing";

import type { GuideContent } from "./types";
import { guideDe } from "./de";
import { guideEn } from "./en";

export type ResolvedGuide = {
  content: GuideContent;
  /** true when the requested locale has no native body yet (fr/es → English). */
  isFallback: boolean;
};

export function getGuideContent(locale: Locale): ResolvedGuide {
  switch (locale) {
    case "de":
      return { content: guideDe, isFallback: false };
    case "en":
      return { content: guideEn, isFallback: false };
    default:
      // fr, es: UI chrome is localized, but the long-form body falls back to English for now.
      return { content: guideEn, isFallback: true };
  }
}
