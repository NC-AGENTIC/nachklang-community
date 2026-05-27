/**
 * Server-side guard for outbound transactional email triggered by anonymous input
 * (currently: email-OTP send). Rejects recipient addresses that no legitimate user
 * would supply, before we hand them to the mail transport.
 *
 * Why: in May 2026 the OTP send endpoint was abused with addresses like
 * `pk-<epoch>-<rand>@example.test` and our outbound relay (Microsoft Graph) bounced
 * each one back, flooding the shared inbox with NDRs. Cloudflare Turnstile shut the
 * wave down; this filter is defense-in-depth so a captcha mis-config can never
 * silently re-open the hole.
 */

// RFC 2606 §2 reserved top-level domains: must never resolve on the public DNS.
const RESERVED_TLDS = new Set(["test", "example", "invalid", "localhost"]);

// RFC 2606 §3 reserved second-level domains under .com/.net/.org.
const RESERVED_SLDS = new Set(["example.com", "example.net", "example.org"]);

// Pragmatic shape check — does not aim for full RFC 5321 compliance. The goal is
// to reject obvious garbage (no `@`, no TLD, whitespace, etc.) that a typing user
// would never produce.
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export type RecipientPolicyCode = "INVALID_EMAIL" | "RESERVED_DOMAIN" | "QUOTA_EXCEEDED";

export class RecipientPolicyError extends Error {
  readonly code: RecipientPolicyCode;
  constructor(code: RecipientPolicyCode, message: string) {
    super(message);
    this.code = code;
    this.name = "RecipientPolicyError";
  }
}

export function assertSendableRecipient(email: string): void {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 254 || !EMAIL_RE.test(normalized)) {
    throw new RecipientPolicyError("INVALID_EMAIL", "Invalid email address");
  }
  const domain = normalized.split("@")[1]!;
  const labels = domain.split(".");
  const tld = labels[labels.length - 1]!;
  if (RESERVED_TLDS.has(tld)) {
    throw new RecipientPolicyError("RESERVED_DOMAIN", `Reserved TLD: .${tld}`);
  }
  if (labels.length >= 2 && RESERVED_SLDS.has(labels.slice(-2).join("."))) {
    throw new RecipientPolicyError("RESERVED_DOMAIN", `Reserved domain: ${labels.slice(-2).join(".")}`);
  }
}

// In-process per-address send quota. Caps OTP sends to the same recipient at 3 per
// 10 minutes — blunts cross-IP bombing of a single address that the per-IP rule
// cannot catch (the per-IP limit is keyed by IP, not by destination).
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const sendTimestamps = new Map<string, number[]>();

export function assertRecipientWithinSendQuota(email: string, now: number = Date.now()): void {
  const key = email.trim().toLowerCase();
  const recent = (sendTimestamps.get(key) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  if (recent.length >= MAX_SENDS_PER_WINDOW) {
    throw new RecipientPolicyError("QUOTA_EXCEEDED", "Too many recent sends to this address");
  }
  recent.push(now);
  sendTimestamps.set(key, recent);
  // Opportunistic eviction so the map cannot grow unbounded under sustained abuse.
  if (sendTimestamps.size > 10_000) {
    for (const [k, v] of sendTimestamps) {
      const trimmed = v.filter((t) => now - t < SEND_WINDOW_MS);
      if (trimmed.length === 0) sendTimestamps.delete(k);
      else sendTimestamps.set(k, trimmed);
    }
  }
}

// Test-only reset for the in-memory quota map.
export function __resetSendQuotaForTests(): void {
  sendTimestamps.clear();
}
