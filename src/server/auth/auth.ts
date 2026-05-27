import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { captcha, emailOTP } from "better-auth/plugins";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/server/db/prisma";
import { getMailTransport } from "@/server/mail/transport";
import { buildOtpEmailHtml } from "@/server/mail/otp-email-template";
import { pickLocaleFromRequest } from "@/server/i18n/pick-locale";

import { assertRecipientWithinSendQuota, assertSendableRecipient } from "./email-policy";

const APP_URL =
  process.env.NACHKLANG_APP_URL || process.env.NACHKLANG_BUILD_ORIGIN || "http://localhost:3000";

export const auth = betterAuth({
  appName: "NachKlang",
  secret: process.env.BETTER_AUTH_SECRET || process.env.NACHKLANG_BUILD_VALUE,
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NACHKLANG_APP_URL ||
    process.env.NACHKLANG_BUILD_ORIGIN ||
    "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    // Bot/abuse protection on the OTP-send endpoint. Active only when a Turnstile
    // secret is configured (env-gated), so local dev without keys is unaffected.
    ...(process.env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            provider: "cloudflare-turnstile" as const,
            secretKey: process.env.TURNSTILE_SECRET_KEY,
            endpoints: ["/email-otp/send-verification-otp"],
          }),
        ]
      : []),
    emailOTP({
      expiresIn: 600,
      async sendVerificationOTP({ email, otp }, request) {
        // Defense-in-depth behind Turnstile + per-IP rate limit: refuse RFC 2606 reserved
        // domains and obviously malformed addresses, and cap per-recipient send volume.
        // See email-policy.ts for the May 2026 incident that motivates this guard.
        assertSendableRecipient(email);
        assertRecipientWithinSendQuota(email);
        const locale = pickLocaleFromRequest(request as Request | undefined);
        const t = await getTranslations({ locale, namespace: "email.otp" });
        await getMailTransport().send({
          to: email,
          subject: t("subject"),
          html: buildOtpEmailHtml({
            otp,
            // Inline text wordmark instead of a remote image: email clients block remote
            // images by default, leaving a broken-image icon. The styled wordmark always renders.
            logoUrl: "",
            logoAlt: t("logoAlt"),
            intro: t("intro"),
            expiry: t("expiry"),
            footer: t("footer"),
          }),
        });
      },
    }),
    passkey({
      rpID: process.env.WEBAUTHN_RP_ID || "localhost",
      rpName: "NachKlang",
    }),
  ],
  trustedOrigins: [
    process.env.NACHKLANG_APP_URL || process.env.NACHKLANG_BUILD_ORIGIN || "http://localhost:3000",
  ],
  rateLimit: {
    // Allow disabling rate limiting via env var (e.g., for e2e tests running against the
    // production Docker stack where all requests share the same IP). Better Auth still applies
    // customRules even when `enabled` is false, so the rules must ALSO be dropped when disabled —
    // otherwise the per-endpoint OTP cap (3/5min) trips during e2e suites that send many codes.
    ...(process.env.NACHKLANG_DISABLE_RATE_LIMIT === "1"
      ? { enabled: false, customRules: {} }
      : {
          enabled: true,
          window: 60,
          max: 100,
          customRules: {
            // Inbox-bombing / mass-registration guard: at most 3 OTP sends per 5 min per IP
            // (layered behind Cloudflare Turnstile, which already blocks bots up front).
            "/email-otp/send-verification-otp": { window: 300, max: 3 },
            // Throttle OTP verification attempts to blunt code brute-forcing.
            "/sign-in/email-otp": { window: 300, max: 10 },
            "/email-otp/verify-email": { window: 300, max: 10 },
          },
        }),
  },
});
