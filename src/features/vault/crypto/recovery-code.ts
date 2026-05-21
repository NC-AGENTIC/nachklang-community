import sodium from "libsodium-wrappers-sumo";

// Crockford base32 alphabet (no I, L, O, U). 32 chars.
export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RECOVERY_CODE_CHARS = 24;
const RECOVERY_GROUP_SIZE = 4;

// Map Crockford ambiguous input chars to their canonical form.
const CROCKFORD_NORMALIZE_MAP: Record<string, string> = {
  I: "1",
  L: "1",
  O: "0",
  U: "V",
};

export function generateRecoveryCode(): string {
  const out: string[] = [];
  while (out.length < RECOVERY_CODE_CHARS) {
    const byte = sodium.randombytes_buf(1)[0];
    if (byte >= CROCKFORD_ALPHABET.length * Math.floor(256 / CROCKFORD_ALPHABET.length)) continue;
    out.push(CROCKFORD_ALPHABET[byte % CROCKFORD_ALPHABET.length]);
  }
  return formatRecoveryCode(out.join(""));
}

export function formatRecoveryCode(normalized: string): string {
  if (normalized.length !== RECOVERY_CODE_CHARS) {
    throw new Error(`formatRecoveryCode expects ${RECOVERY_CODE_CHARS} chars, got ${normalized.length}`);
  }
  const groups: string[] = [];
  for (let i = 0; i < normalized.length; i += RECOVERY_GROUP_SIZE) {
    groups.push(normalized.slice(i, i + RECOVERY_GROUP_SIZE));
  }
  return groups.join("-");
}

export function normalizeRecoveryCode(input: string): string {
  const stripped = input.replace(/[\s-]+/g, "").toUpperCase();
  const mapped = Array.from(stripped, (ch) => CROCKFORD_NORMALIZE_MAP[ch] ?? ch).join("");
  // Validate all chars before checking length so invalid-char errors take priority.
  for (const ch of mapped) {
    if (!CROCKFORD_ALPHABET.includes(ch)) {
      throw new Error("RECOVERY_CODE_INVALID_CHAR");
    }
  }
  const len = mapped.length;
  if (len !== RECOVERY_CODE_CHARS) {
    throw new Error("RECOVERY_CODE_LENGTH");
  }
  return mapped;
}
