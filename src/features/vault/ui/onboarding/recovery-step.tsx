"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { RecoveryCodeGrid } from "./recovery-code-grid";

type Props = {
  recoveryCode: string;
  email: string;
  vaultId: string;
  onContinue: () => void;
};

export function RecoveryStep({ recoveryCode, email, vaultId, onContinue }: Props) {
  const t = useTranslations("onboarding.recovery");
  const [masked, setMasked] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  async function handleCopy() {
    await navigator.clipboard.writeText(recoveryCode);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  function handlePrint() {
    // Note: do NOT pass "noopener" here — with noopener, window.open returns null,
    // so we could not populate the print document. We sever the opener manually instead.
    const w = window.open("", "_blank");
    if (!w) return;
    w.opener = null;
    const doc = w.document;
    doc.title = t("printTitle");

    const style = doc.createElement("style");
    style.textContent =
      "body{font-family:system-ui,sans-serif;padding:2rem;max-width:600px;margin:auto}" +
      "h1{font-size:1.5rem}dl{display:grid;grid-template-columns:auto 1fr;gap:.5rem 1rem}" +
      "dt{font-weight:600}" +
      ".recovery-print__code{font-family:ui-monospace,'JetBrains Mono','Söhne Mono',monospace;" +
      "font-size:1.4rem;letter-spacing:.05em;background:#f5f5f5;padding:.5rem 1rem;border-radius:6px;word-break:break-all}" +
      "@media print{button{display:none}}";
    doc.head.append(style);

    const article = doc.createElement("article");
    const h1 = doc.createElement("h1");
    h1.textContent = t("printTitle");
    article.append(h1);

    const dl = doc.createElement("dl");
    const rows: Array<[string, string, boolean]> = [
      [t("printLabelEmail"), email, false],
      [t("printLabelVaultId"), vaultId, false],
      [t("printLabelCreatedAt"), new Date().toLocaleString("de-DE"), false],
      [t("printLabelCode"), recoveryCode, true],
    ];
    for (const [label, value, isCode] of rows) {
      const dt = doc.createElement("dt");
      dt.textContent = label;
      const dd = doc.createElement("dd");
      dd.textContent = value;
      if (isCode) dd.className = "recovery-print__code";
      dl.append(dt, dd);
    }
    article.append(dl);

    const note = doc.createElement("p");
    note.textContent = t("printNote");
    article.append(note);

    const printBtn = doc.createElement("button");
    printBtn.type = "button";
    printBtn.textContent = t("printButton");
    printBtn.addEventListener("click", () => w.print());
    article.append(printBtn);

    doc.body.append(article);
  }

  return (
    <div className="onboarding-step">
      <RecoveryCodeGrid
        code={recoveryCode}
        masked={masked}
        copyState={copyState}
        onToggleMask={() => setMasked((v) => !v)}
        onCopy={handleCopy}
        onPrint={handlePrint}
      />
      <button type="button" className="button primary" onClick={onContinue}>
        {t("continueButton")}
      </button>
    </div>
  );
}
