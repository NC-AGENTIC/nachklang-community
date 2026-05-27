"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useStore } from "better-auth/react";
import type { ReactNode } from "react";

import { SignedInBadge } from "@/features/auth/ui/signed-in-badge";
import { IdleAutoLock } from "@/features/vault/ui/idle-auto-lock";
import { VaultMetadataBadges } from "@/features/vault/ui/vault-metadata-badges";
import { useRootKey } from "@/features/vault/state/use-root-key";
import { authClient } from "@/lib/auth-client";

type Props = {
  initialFullyAuthed: boolean;
  serverEmail: string | null;
  hasVault: boolean;
  children: ReactNode;
};

export function AppChrome({ initialFullyAuthed, serverEmail, hasVault, children }: Props) {
  const t = useTranslations("chrome.app");
  const tGuide = useTranslations("guide");
  const sessionStore = useStore(authClient.useSession);
  const sessionUser = sessionStore?.data?.user ?? null;
  const clientFullyAuthed = sessionUser ? Boolean(sessionUser.emailVerified) : null;
  const showRail = clientFullyAuthed ?? initialFullyAuthed;
  // The server `hasVault` is computed once per layout render and goes stale after a client-side
  // passkey login (router.push without a full reload). An unlocked root key is a live proof the
  // owner has a vault, so OR it in to surface the "Tresor" link without forcing a refresh.
  const ownsVault = hasVault || useRootKey() !== null;

  return (
    <div className="app-shell" data-authed={showRail ? "true" : "false"}>
      <IdleAutoLock />
      {showRail ? (
        <aside className="desktop-rail" aria-label={t("desktopRailAriaLabel")}>
          <Image
            src="/brand/wordmark-dark.png"
            alt="NachKlang"
            width={220}
            height={154}
            priority
            className="rail-logo"
          />
          <SignedInBadge serverEmail={serverEmail} />
          <nav>
            {ownsVault ? <Link href="/vault">{t("navVault")}</Link> : null}
            <Link href={ownsVault ? "/vault/settings" : "/account"}>{t("navSettings")}</Link>
            <Link href="/shared">{t("navShared")}</Link>
            <Link href="/audit">{t("navAudit")}</Link>
            <Link href="/howto" target="_blank" rel="noopener" className="rail-help">
              {tGuide("inAppLink")}
            </Link>
          </nav>
          {ownsVault ? <VaultMetadataBadges /> : null}
        </aside>
      ) : null}
      {children}
      {showRail ? (
        <nav className="mobile-nav" aria-label={t("mobileNavAriaLabel")}>
          {ownsVault ? <Link href="/vault">{t("navVault")}</Link> : null}
          <Link href={ownsVault ? "/vault/settings" : "/account"}>{t("navSettings")}</Link>
          <Link href="/shared">{t("navShared")}</Link>
          <Link href="/audit">{t("navAudit")}</Link>
          <Link href="/howto" target="_blank" rel="noopener" className="rail-help">
            {tGuide("inAppLink")}
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
