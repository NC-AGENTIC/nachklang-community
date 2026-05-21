"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useRootKey } from "@/features/vault/state/use-root-key";
import { clearRootKey } from "@/features/vault/state/root-key-store";

export type IdleAutoLockProps = {
  idleMs?: number;
  warnMs?: number;
};

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "visibilitychange"] as const;

export function IdleAutoLock({ idleMs = 5 * 60 * 1000, warnMs = 60 * 1000 }: IdleAutoLockProps) {
  const t = useTranslations("vault.idleLock");
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const rootKey = useRootKey();
  const hasRootKey = rootKey !== null;
  const lastActivityRef = useRef(Date.now());
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (!hasRootKey) {
      setRemainingSec(null);
      return;
    }

    lastActivityRef.current = Date.now();
    setRemainingSec(null);

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, markActive, { passive: true });
    }

    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= idleMs) {
        window.clearInterval(interval);
        clearRootKey();
        routerRef.current.replace("/unlock");
        return;
      }
      if (idleFor >= idleMs - warnMs) {
        setRemainingSec(Math.max(0, Math.ceil((idleMs - idleFor) / 1000)));
      } else {
        setRemainingSec(null);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, markActive);
      }
    };
  }, [hasRootKey, idleMs, warnMs]);

  function stayUnlocked() {
    lastActivityRef.current = Date.now();
    setRemainingSec(null);
  }

  if (!hasRootKey || remainingSec === null) {
    return null;
  }

  return (
    <div className="idle-lock-warning" role="alertdialog" aria-live="assertive" aria-label={t("ariaLabel")}>
      <p>{t("message", { seconds: remainingSec })}</p>
      <button type="button" className="button secondary" onClick={stayUnlocked}>
        {t("stayButton")}
      </button>
    </div>
  );
}
