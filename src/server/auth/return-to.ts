// Only allow internal, locale-relative redirect targets (e.g. "/shares/accept/TOKEN") to prevent
// open-redirect abuse. Rejects absolute URLs, protocol-relative ("//evil"), and non-strings.
export function safeReturnTo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  return value;
}
