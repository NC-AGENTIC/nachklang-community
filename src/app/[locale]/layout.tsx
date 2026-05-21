import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { AppChrome } from "@/features/auth/ui/app-chrome";
import { CookieBanner } from "@/features/legal/ui/cookie-banner";
import { APP_EDITION } from "@/lib/app-edition";
import { routing } from "@/i18n/routing";
import { auth } from "@/server/auth/auth";
import { findVaultByUser } from "@/server/vault/vault-repo";

import "../globals.css";

export const dynamic = "force-dynamic";

const displaySerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const bodySans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NachKlang",
  description: "Zero-Knowledge Vault für Online-Zugänge ohne gespeicherte Passwörter.",
  generator: APP_EDITION,
  icons: {
    icon: "/brand/app-icon-dark.png",
    apple: "/brand/app-icon-light.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f6f1e8",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("chrome");
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? null;
  const initialFullyAuthed = Boolean(session?.user?.emailVerified);
  // Owners have a personal vault; trustee-only members do not. The rail's "Vault" link + the
  // "Ihr Vault" metadata badge are owner-only — they make no sense for a vault-less trustee.
  const hasVault = session?.user?.id ? (await findVaultByUser(session.user.id)) !== null : false;

  return (
    <html
      lang={locale}
      className={`${displaySerif.variable} ${bodySans.variable}`}
      data-e2e-prf-stub={process.env.NACHKLANG_E2E_PRF_STUB === "1" ? "1" : undefined}
    >
      <body>
        <a className="skip-link" href="#workspace">
          {t("skipToWorkspace")}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppChrome initialFullyAuthed={initialFullyAuthed} serverEmail={email} hasVault={hasVault}>
            {children}
          </AppChrome>
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
