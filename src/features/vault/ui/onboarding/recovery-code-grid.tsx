"use client";

import type { ReactElement } from "react";

export type RecoveryCodeGridProps = {
  code: string;
  masked: boolean;
  copyState: "idle" | "copied";
  onToggleMask: () => void;
  onCopy: () => void;
  onPrint: () => void;
};

export function RecoveryCodeGrid({
  code,
  masked,
  copyState,
  onToggleMask,
  onCopy,
  onPrint,
}: RecoveryCodeGridProps): ReactElement {
  const groups = code.split("-");
  return (
    <div className="onboarding__recovery">
      <div
        className="onboarding__recovery-grid"
        data-recovery-code={code}
        role="group"
        aria-label="Recovery-Code"
      >
        {groups.map((group, idx) => (
          <span
            key={idx}
            className={`onboarding__recovery-cell${masked ? " masked" : ""}`}
            aria-hidden={masked ? "true" : undefined}
          >
            {masked ? "••••" : group}
          </span>
        ))}
      </div>
      <div className="onboarding__recovery-actions">
        <button type="button" className="button secondary" onClick={onToggleMask}>
          {masked ? "Anzeigen" : "Verbergen"}
        </button>
        <button type="button" className="button secondary" onClick={onCopy}>
          {copyState === "copied" ? "Kopiert" : "Kopieren"}
        </button>
        <button type="button" className="button secondary" onClick={onPrint}>
          Drucken
        </button>
      </div>
    </div>
  );
}
