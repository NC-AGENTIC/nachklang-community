// src/features/guide/ui/guide-toc.tsx
"use client";

import { useTranslations } from "next-intl";

type TocItem = { id: string; navLabel: string };

export function GuideToc({ items, activeId }: { items: TocItem[]; activeId: string | null }) {
  const t = useTranslations("guide.toc");

  return (
    <nav className="guide-toc" aria-label={t("ariaLabel")}>
      <p className="guide-toc__heading">{t("heading")}</p>
      <ul className="guide-toc__list">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="guide-toc__link"
              aria-current={activeId === item.id ? "true" : undefined}
            >
              {item.navLabel}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
