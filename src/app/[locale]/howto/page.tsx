// src/app/[locale]/howto/page.tsx
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { getGuideContent } from "@/features/guide/content";
import { GuidePage } from "@/features/guide/ui/guide-page";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guide" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function HowToPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const { content, isFallback } = getGuideContent(locale as Locale);
  return <GuidePage content={content} isFallback={isFallback} />;
}
