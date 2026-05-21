import { captureMailIfEnabled } from "./capture";
import { graphMailTransport } from "./microsoft-graph";
import { smtpMailTransport } from "./smtp";
import type { MailTransport } from "./types";

// Explicit env selection; defaults to Graph so existing deployments are unchanged.
export function selectTransport(): MailTransport {
  return process.env.NACHKLANG_MAIL_TRANSPORT === "smtp" ? smtpMailTransport : graphMailTransport;
}

// Returns the configured transport wrapped with dev/e2e capture, so capture works
// regardless of which transport is active.
export function getMailTransport(): MailTransport {
  const base = selectTransport();
  return {
    async send(message) {
      captureMailIfEnabled(message);
      if (process.env.NACHKLANG_MAIL_CAPTURE_PATH) {
        // Dev/e2e: the OTP/link is already recorded in the capture file, which is the source of
        // truth for tests. Fire the real send in the background so a slow or throttled transport
        // never blocks or fails the request under test. Production (capture off) awaits + throws.
        void base.send(message).catch(() => {});
        return;
      }
      await base.send(message);
    },
  };
}
