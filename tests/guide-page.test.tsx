// tests/guide-page.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import deMessages from "../messages/de.json";

vi.mock("@/i18n/navigation", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { GuidePage } from "@/features/guide/ui/guide-page";
import { guideDe } from "@/features/guide/content/de";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("GuidePage", () => {
  it("renders the page title and every section heading", () => {
    renderWithIntl(<GuidePage content={guideDe} isFallback={false} />);
    expect(screen.getByRole("heading", { level: 1, name: guideDe.title })).toBeInTheDocument();
    for (const s of guideDe.sections) {
      expect(screen.getByRole("heading", { level: 2, name: s.title })).toBeInTheDocument();
    }
  });

  it("shows the fallback notice only when isFallback is true", () => {
    const { container, rerender } = renderWithIntl(<GuidePage content={guideDe} isFallback={false} />);
    expect(container.querySelector(".guide__fallback")).toBeNull();
    rerender(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <GuidePage content={guideDe} isFallback />
      </NextIntlClientProvider>,
    );
    expect(container.querySelector(".guide__fallback")).not.toBeNull();
  });
});
