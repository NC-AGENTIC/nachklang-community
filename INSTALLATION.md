[English](INSTALLATION.md) · [Deutsch](INSTALLATION.de.md)

# Installation

How to run NachKlang locally and configure the settings that matter. Keep this short: the
**mandatory** settings get you a booting app; the **email** settings are required before any
user can actually sign in (identity is verified by email one-time code).

## Prerequisites

- **Docker** (Docker Desktop or Engine) — the stack runs via Docker Compose.
- **Node.js 24 LTS** — for installing dependencies and generating the Prisma client locally.
- A **working email transport** — a **Microsoft Graph** app registration (Azure AD) *or* any
  **SMTP** server — for sending the sign-up code. See [Email setup](#email-setup-microsoft-graph).
  Without it no user can complete sign-up.

## Quick start

```bash
git clone https://github.com/NC-AGENTIC/nachklang-community.git
cd nachklang-community

cp .env.example .env.local          # then edit .env.local (see settings below)
npm install
DATABASE_URL="postgresql://nachklang:nachklang-dev-password@localhost:5432/nachklang?schema=public" \
  npm run db:generate               # generate the Prisma client

docker compose --profile migrate run --rm migrate   # create/upgrade the DB schema
docker compose up --build                            # start postgres, valkey, web, caddy
```

The app runs behind Caddy at **http://localhost** (port 80 → `web:3000`).

## Settings

Edit `.env.local` for local development. Production uses a `.env` file on the host only.

### Mandatory (app boots)

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Server secret (64 random hex/base64 chars). |
| `DATABASE_URL` | Postgres connection string. |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Credentials for the bundled Postgres container. |
| `NACHKLANG_APP_URL` / `BETTER_AUTH_URL` | App base URL (e.g. `http://localhost:3000`). |
| `WEBAUTHN_RP_ID` | Passkey relying-party ID (`localhost` for local dev; your domain in prod). |

### Mandatory for login (email one-time codes)

NachKlang is passwordless: sign-up and sign-in verify identity via an **email OTP**, so the
app **cannot create or log in any user without working email**. See
[Email setup](#email-setup-microsoft-graph) for these.

### Optional

| Variable | Purpose |
| --- | --- |
| `NACHKLANG_GRAPH_AUTH_MODE` | `certificate` (recommended) or `client-secret`. Both work in production — see "Graph authentication modes" below. |
| `NACHKLANG_MAIL_CAPTURE_PATH` | Local/e2e convenience: write each outgoing OTP/email to this TSV file so you can read the code without opening the mailbox. Leave unset in production. |
| `CADDY_SITE_ADDRESS` | Production domain for Caddy (auto-provisions Let's Encrypt TLS). Defaults to `:80` (plain HTTP) for local dev. |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (bot protection). When set, the signup form shows the widget and the OTP-send endpoint requires a valid token. Leave unset to disable. See [Bot protection](#bot-protection-cloudflare-turnstile). |

## Bot protection (Cloudflare Turnstile)

To stop bots from mass-registering / bombing inboxes via the email-OTP signup, NachKlang
integrates **Cloudflare Turnstile** (free CAPTCHA). It is **optional and env-gated**: if
`TURNSTILE_SECRET_KEY` is unset, the captcha is skipped entirely (handy for local dev).

Enable it:
1. Create a free Cloudflare account and a Turnstile site at
   `https://dash.cloudflare.com/?to=/:account/turnstile` (your domain does **not** need to use
   Cloudflare DNS). You get a **Site Key** (public) and a **Secret Key** (private).
2. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in your `.env`.
3. Restart the app. The signup form now renders the widget; the server verifies the token
   before sending an OTP (returns an error if missing/invalid).

When enabled, the privacy policy must disclose Cloudflare as a processor (already noted on the
Datenschutz page).

## Email setup (Microsoft Graph)

NachKlang sends mail through the **Microsoft Graph** API. Mail is used for:

- the **sign-up / sign-in one-time code** (the primary identity check), and
- the **recovery login** code when a passkey is unavailable.

There are no other notification emails today.

### Variables

| Variable | Purpose |
| --- | --- |
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID. |
| `MICROSOFT_CLIENT_ID` | App registration (client) ID. |
| `GRAPH_MAILBOX_UPN` | The mailbox the app sends *from* (e.g. `nachklang@yourdomain.com`). |
| `NACHKLANG_VISIBLE_EMAIL` | The reply-to address shown to recipients. |
| `MICROSOFT_CLIENT_CERTIFICATE_PRIVATE_KEY_PATH` | Path to the RSA private-key PEM (certificate mode). |
| `MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT` | SHA-1 thumbprint of that certificate (certificate mode). |
| `MICROSOFT_CLIENT_SECRET` | Client secret (client-secret mode). |

### Graph authentication modes

`NACHKLANG_GRAPH_AUTH_MODE` selects how the app authenticates to Microsoft Graph. Both modes
work in production; pick one:

- **`certificate` (recommended)** — a signed JWT client assertion. Set
  `NACHKLANG_GRAPH_AUTH_MODE=certificate` and provide the certificate private-key path +
  thumbprint. Mount the PEM as a secret; never commit it. Preferred for production because
  there is no shared secret to leak or rotate on expiry.
- **`client-secret`** — set `NACHKLANG_GRAPH_AUTH_MODE=client-secret` and
  `MICROSOFT_CLIENT_SECRET`. Simpler to set up; the secret expires and must be rotated. This
  is the default mode and is what the reference deployment currently runs.

The Azure app registration needs the application permission **`Mail.Send`** (admin-consented)
for the sending mailbox.

### Alternative: any SMTP server

Microsoft Graph is the default, but you can send through any SMTP server instead — set
`NACHKLANG_MAIL_TRANSPORT=smtp` and provide:

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST` | SMTP server hostname (required in SMTP mode). |
| `SMTP_PORT` | Port (default `587`). |
| `SMTP_SECURE` | `true` for implicit TLS (port 465); `false` for STARTTLS (587). |
| `SMTP_USER` / `SMTP_PASS` | Credentials (omit both for an unauthenticated relay). |

The From/Reply-To identity reuses `NACHKLANG_VISIBLE_EMAIL`. No Microsoft Graph variables are
needed in SMTP mode.

## Adding a test user (local)

There is no database seed. Create a user through the real flow:

1. Configure Microsoft Graph in dev mode (`NACHKLANG_GRAPH_AUTH_MODE=client-secret` +
   `MICROSOFT_CLIENT_SECRET`, plus tenant/client IDs and `GRAPH_MAILBOX_UPN` /
   `NACHKLANG_VISIBLE_EMAIL`).
2. (Optional) set `NACHKLANG_MAIL_CAPTURE_PATH=/tmp/mail-capture.tsv` so the OTP is written
   to that file — handy for reading the code locally.
3. Start the stack and open http://localhost. Sign up with an email address.
4. Read the one-time code (from the mailbox, or from the capture file) and enter it.
5. Complete onboarding: create a **passkey** (your browser/OS prompts) and save the printed
   **recovery code**. You now have a working account.

> A passkey-capable browser/authenticator is required to finish onboarding.

## Trustee sharing invites (Vertrauensperson)

Read-only **trustee sharing** *is* part of this version: a vault owner can invite a trusted
relative/friend (their "digital legacy" contact) from `/vault/settings`. The invite is
delivered **by email**, so **testing the invite flow requires working email settings** — the
same Microsoft Graph *or* SMTP configuration described above. Without working mail the invitee
never receives the acceptance link.

To test it locally, end to end:

1. As a vault owner, open `/vault/settings` → "Vertrauenspersonen" and invite an email address.
2. With mail configured (or via `NACHKLANG_MAIL_CAPTURE_PATH`), open the acceptance link and
   register a passkey for the invitee — easiest in a second browser profile.
3. Back as the owner, compare the out-of-band fingerprint and seal access; the trustee can then
   read the vault read-only at `/shared`.

> Only *inactivity-triggered* ("dead man's switch") release is deferred to a later version. The
> manual invite → verify → seal → revoke flow above is fully implemented.

## Production backups (optional, prod only)

The stack ships an encrypted database-backup profile (an **age-encrypted `pg_dump`** on a daily
systemd timer, with GFS retention). It is **not needed for local development**. Configure it on
the host via `NACHKLANG_BACKUP_AGE_RECIPIENT` / `NACHKLANG_BACKUP_DIR` (see `.env.example`) and
follow **[docs/ops/backup-restore.md](docs/ops/backup-restore.md)**.

## Tests

```bash
npm test          # Vitest unit + component tests
npm run test:e2e  # Playwright end-to-end (starts the app internally)
```

Some tests touch the database and expect `DATABASE_URL` to point at a running Postgres
(start one with `docker compose up -d postgres` and run the `migrate` profile first). CI
provisions Postgres automatically.
