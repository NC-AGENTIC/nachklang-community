[English](README.md) · [Deutsch](README.de.md)

# NachKlang

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE)
[![CI](https://github.com/NC-AGENTIC/nachklang-community/actions/workflows/ci.yml/badge.svg)](https://github.com/NC-AGENTIC/nachklang-community/actions/workflows/ci.yml)
[![Security Policy](https://img.shields.io/badge/security-policy-brightgreen)](SECURITY.md)

**NachKlang** is a zero-knowledge web app for managing the *metadata* of your online accounts —
so loved ones can find and wind them down (digitaler Nachlass / digital legacy) without ever
handing over your passwords. It stores only encrypted management data: the login URL, the
email/username you used, and a hint about *where* the real password is kept — **never the
external passwords themselves**, not even encrypted.

## Key features

- **Zero-knowledge by design.** All vault data is encrypted and decrypted in your browser. The
  server only ever sees ciphertext and opaque wrapped keys.
- **Passwordless login.** Sign in with a **passkey** (WebAuthn); email one-time codes verify
  identity at sign-up and serve as the fallback login.
- **Strong client-side crypto.** Argon2id key derivation, AES-256-GCM encryption, and
  non-extractable WebCrypto keys. The Root Key never leaves browser memory.
- **Account lifecycle.** Each entry tracks a status — *aktiv*, *stillgelegt*,
  *anbieter-informiert*, *gelöscht* — to support winding accounts down over time.
- **Read-only trustee sharing.** Grant a trusted relative/friend end-to-end-encrypted, read-only
  access to your vault (libsodium sealed boxes to their X25519 key). You compare a short
  out-of-band fingerprint before granting, see an access audit log, and can revoke anytime.
- **Idle auto-lock.** The vault locks itself after inactivity and on tab close.
- **Portable export & full deletion.** Export your vault to a password-protected **AES-256 ZIP**
  — a plain CSV that opens in any spreadsheet, usable without NachKlang — and irreversibly delete
  your entire account at any time (GDPR data portability & erasure).
- **Multilingual UI** (German default, plus English, French, and Spanish) with locale-prefixed
  routes via next-intl, built on Next.js 16, React 19, Prisma 7, PostgreSQL, libsodium, and
  Better Auth.

## Documentation

- **[INSTALLATION.md](INSTALLATION.md)** — run it locally, configure email (Microsoft Graph or
  SMTP), and create a test user. *(Also in [Deutsch](INSTALLATION.de.md).)*
- **[SECURITY.md](SECURITY.md)** — the security model, threat model, and how to report a
  vulnerability.
- **[docs/arc42/](docs/arc42/)** — the architecture documentation (arc42).

## Quick start

```bash
cp .env.example .env.local      # configure (see INSTALLATION.md)
npm install
DATABASE_URL="postgresql://nachklang:nachklang-dev-password@localhost:5432/nachklang?schema=public" \
  npm run db:generate
docker compose --profile migrate run --rm migrate
docker compose up --build
```

The app runs behind Caddy at **http://localhost**. Full setup — including the **required**
email configuration — is in **[INSTALLATION.md](INSTALLATION.md)**.

## Routes

All app routes are locale-prefixed (`/de`, `/en`, `/fr`, `/es`); bare paths redirect to the
visitor's detected locale (cookie → `Accept-Language` → German default). The paths below are
shown without their prefix.

- `/` — landing page (verified users are redirected to `/vault`); a language picker sits in the
  top bar next to the sign-in link.
- `/signup` — create an account, verified by an email one-time code.
- `/signin` — passkey sign-in, with an email-code fallback if a passkey is unavailable.
- `/verify-email` — confirm the sign-up one-time code.
- `/onboarding` — passkey setup + recovery-code kit for new accounts.
- `/unlock` — unlock the vault (passkey, or recovery code as fallback).
- `/vault` — the vault workspace.
- `/vault/settings` — passkeys, trustees (Vertrauenspersonen), encrypted export, and account
  deletion.
- `/account` — settings for trustee-only members who have no vault of their own.
- `/shared` and `/shared/[vaultId]` — read-only access to vaults shared with you.
- `/shares/accept/[token]` — accept a trustee invitation.
- `/audit` — your transparency/access log.
- `/impressum`, `/datenschutz`, `/copyright` — legal pages.
- `/api/auth/*` — Better Auth handlers.

## Tests

```bash
npm test          # Vitest unit + component tests
npm run test:e2e  # Playwright end-to-end
```

## License

NachKlang is licensed under the **PolyForm Noncommercial License 1.0.0** (see
**[LICENSE](LICENSE)**). **Noncommercial use is free.** **Any commercial use** — including any
part of the code, or the NachKlang name/logos/brand assets — requires prior written approval
from **NC AGENTIC GmbH**. See **[NOTICE](NOTICE)** for trademark/logo terms.

Commercial licensing inquiries: **info@nc-agentic.de**
