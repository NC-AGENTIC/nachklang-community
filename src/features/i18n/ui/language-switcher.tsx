"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LOCALE_LABELS: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
};

export function LanguageSwitcher({ ariaLabel }: { ariaLabel: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale;
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <span className="lang-switcher" data-pending={isPending ? "" : undefined}>
      <Globe aria-hidden="true" className="lang-switcher__icon" size={15} strokeWidth={1.75} />
      <select
        className="lang-switcher__select"
        value={locale}
        onChange={handleChange}
        disabled={isPending}
        aria-label={ariaLabel}
      >
        {routing.locales.map((value) => (
          <option key={value} value={value}>
            {LOCALE_LABELS[value]}
          </option>
        ))}
      </select>
    </span>
  );
}
