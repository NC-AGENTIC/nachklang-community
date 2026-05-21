export const NACHKLANG_RELEASE_VERSION = "v0.2.0";
export const INITIAL_LAST_VAULT_UPDATED_ISO = "2026-05-18T15:26:00.000Z";
export const LAST_VAULT_UPDATED_STORAGE_KEY = "nachklang:last-vault-update";
export const VAULT_UPDATED_EVENT = "nachklang:vault-updated";
export const LAST_VAULT_UPDATED_LABEL = formatVaultUpdatedLabel(INITIAL_LAST_VAULT_UPDATED_ISO);

export function formatVaultUpdatedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unbekannt";
  }

  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";

  return `${part("day")}.${part("month")}.${part("year")}, ${part("hour")}:${part("minute")}`;
}
