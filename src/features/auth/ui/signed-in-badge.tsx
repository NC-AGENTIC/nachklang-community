"use client";

import { useEffect } from "react";
import { useStore } from "better-auth/react";
import { useTranslations } from "next-intl";

import { clearRootKey } from "@/features/vault/state/root-key-store";
import { useRootKey } from "@/features/vault/state/use-root-key";
import { authClient, signOut } from "@/lib/auth-client";

type Props = {
  serverEmail?: string | null;
  variant?: "rail" | "compact";
};

/**
 * Renders the signed-in user email and a sign-out button.
 *
 * Two visual variants:
 *   - `rail` (default): stacked email + button for the desktop rail
 *   - `compact`: inline single-line treatment used in the auth-shell top bar
 *
 * Uses the client-side session atom (via useStore) so it re-renders after a
 * soft navigation without requiring a full server-side layout refresh.
 */
export function SignedInBadge({ serverEmail, variant = "rail" }: Props) {
  const t = useTranslations("auth.signedInBadge");
  const sessionStore = useStore(authClient.useSession);
  const email = sessionStore?.data?.user?.email ?? serverEmail ?? null;
  const isUnlocked = useRootKey() !== null;

  useEffect(() => {
    const onHide = () => clearRootKey();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  function handleLock() {
    clearRootKey();
    if (typeof window !== "undefined") {
      window.location.href = "/unlock";
    }
  }

  async function handleSignOut() {
    clearRootKey();
    await signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/signin";
    }
  }

  if (!email) return null;

  if (variant === "compact") {
    return (
      <div className="signed-in-badge signed-in-badge--compact">
        <small>{email}</small>
        {isUnlocked ? (
          <button className="signed-in-badge__signout" type="button" onClick={handleLock}>
            {t("lock")}
          </button>
        ) : null}
        <button
          className="signed-in-badge__signout"
          type="button"
          onClick={handleSignOut}
        >
          {t("signOut")}
        </button>
      </div>
    );
  }

  return (
    <div className="signed-in-badge">
      <small>{email}</small>
      {isUnlocked ? (
        <button className="button secondary" type="button" onClick={handleLock}>
          {t("lock")}
        </button>
      ) : null}
      <button className="button secondary" type="button" onClick={handleSignOut}>
        {t("signOut")}
      </button>
    </div>
  );
}
