import { appendFileSync } from "node:fs";

import type { MailMessage } from "./types";

// Dev/e2e convenience: when NACHKLANG_MAIL_CAPTURE_PATH is set, append one TSV line
// per outgoing message so tests can read the OTP/verification link without a real
// inbox. Empty in production (see compose.yaml) so codes are never persisted.
// The OTP is matched inside <strong> with optional attributes (the branded email
// styles it: <strong style="...">123456</strong>).
export function captureMailIfEnabled(message: MailMessage): void {
  const path = process.env.NACHKLANG_MAIL_CAPTURE_PATH;
  if (!path) return;
  const linkMatch = /<a [^>]*href="([^"]+)"/i.exec(message.html);
  const otpMatch = /<strong[^>]*>([^<]+)<\/strong>/i.exec(message.html);
  const urlOrOtp = linkMatch ? linkMatch[1] : otpMatch ? otpMatch[1].trim() : "";
  const line = [Date.now(), message.to, message.subject, urlOrOtp].join("\t") + "\n";
  try {
    appendFileSync(path, line, { encoding: "utf8" });
  } catch {
    // best-effort; never break the real send
  }
}
