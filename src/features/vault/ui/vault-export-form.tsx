"use client";

import { Download } from "lucide-react";
import type { FormEvent, ReactElement } from "react";

export type VaultExportFormProps = {
  exportPassphrase: string;
  notice: string;
  onExportPassphraseChange: (value: string) => void;
  onExportCsv: (event: FormEvent<HTMLFormElement>) => void;
};

export function VaultExportForm({
  exportPassphrase,
  notice,
  onExportPassphraseChange,
  onExportCsv,
}: VaultExportFormProps): ReactElement {
  return (
    <section className="surface-card export-panel" id="export" aria-labelledby="export-title">
      <div className="section-title">
        <div>
          <p className="eyebrow">Portabilitaet</p>
          <h2 id="export-title">Export</h2>
        </div>
        <span className="badge">Browser-only</span>
      </div>
      <p className="export-csv-lead">
        Exportieren Sie Ihre Einträge als passwortgeschützte ZIP-Datei. Die enthaltene CSV wird mit
        AES-256 verschlüsselt und lässt sich mit 7-Zip, Keka oder WinRAR öffnen.
      </p>
      <form className="export-form" onSubmit={onExportCsv}>
        <div className="field">
          <label htmlFor="exportPassphrase">Export-Passwort</label>
          <input
            id="exportPassphrase"
            name="exportPassphrase"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={exportPassphrase}
            onChange={(event) => onExportPassphraseChange(event.target.value)}
            required
          />
        </div>
        <button className="button full-width" type="submit">
          <Download aria-hidden="true" />
          Als verschlüsselte ZIP exportieren
        </button>
      </form>
      <p className="notice-line export-notice" aria-live="polite">
        {notice}
      </p>
      <p className="export-csv-warn">
        🔒 Die ZIP-Datei ist mit Ihrem Passwort <strong>verschlüsselt</strong> (AES-256). Ohne dieses
        Passwort kann die Datei <strong>nicht wiederhergestellt</strong> werden — bewahren Sie es
        sicher auf.
      </p>
    </section>
  );
}
