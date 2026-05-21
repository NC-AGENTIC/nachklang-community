import type { VaultWorklistEntry } from "./vault-worklist";

const HEADER = [
  "Anbieter",
  "Login-URL",
  "E-Mail",
  "Benutzername",
  "Passwort-Hinweis",
  "Notizen",
  "Status",
  "Schlagwörter",
];

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Human-readable, re-usable export (opens in Excel / Google Sheets). This is DECRYPTED plaintext —
// the caller must warn the user it is unencrypted. RFC-4180-style quoting, CRLF line endings.
export function entriesToCsv(entries: VaultWorklistEntry[]): string {
  const rows = entries.map((e) =>
    [
      e.displayName,
      e.loginUrl,
      e.emailUsed ?? "",
      e.username ?? "",
      e.passwordLocationHint ?? "",
      e.notes ?? "",
      e.status,
      (e.tags ?? []).join("; "),
    ]
      .map((v) => csvCell(String(v)))
      .join(","),
  );
  return [HEADER.join(","), ...rows].join("\r\n");
}
