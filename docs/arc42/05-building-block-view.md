# 5. Building Block View

## Frontend

- `src/app`: Next.js App Router, layout, security headers, and the routes for landing, sign-up / sign-in, email verification, onboarding, unlock, vault + vault settings, the trustee-only account page, "shared with me" and shared-vault read views, invite acceptance, the access/audit log, and the legal pages.
- `src/features/vault/ui`: mobile-first vault UI with onboarding wizard, provider catalogue, entry form, encrypted-export form, and the account-deletion section.
- `src/features/vault/domain`: vault entry models, the lifecycle states, the no-secrets field rule, and the export pipeline (`vault-csv` → `vault-csv-zip`, an AES-256 password-protected ZIP).
- `src/features/vault/crypto`: client-side vault cryptography (Root Key handling, key wrapping, entry encryption).
- `src/features/account`: trustee-only account settings and the irreversible account-deletion flow (client).
- `src/features/trustee`: trustee sharing — `crypto` (X25519 keypair, sealed boxes, private-key wrap, SAS fingerprint, Root-Key seal/open), `domain` (keypair + share schemas), `data` (keypair/share clients incl. seal, ensure-keypair, read), `ui` (owner Trustees panel, invite-accept flow, read-only "Shared with me" view).

## Backend

- `src/server/auth`: Better Auth wiring with the email-OTP and passkey plugins, plus the server-side session guards.
- `src/server/trustee`: invite-token helpers and the share repository (invite, accept → `pending_verify`, seal → `active`, revoke, purge, trustee-gated read, access-log). Trustee read/seal/revoke/audit APIs live under `src/app/api/shares` and `src/app/api/shared`.
- `src/app/api/account`: irreversible account deletion — cascade-deletes the user (vault, entries, passkeys, sessions, keypair, shares/invites) and emails any invited trustees that access is ending.
- `src/server/db`: Prisma 7 client with the PostgreSQL driver adapter.
- `src/server/mail`: pluggable mail transport (`MailTransport`) — Microsoft Graph (`sendMail`, certificate or client-secret token) or SMTP (nodemailer), selected by `NACHKLANG_MAIL_TRANSPORT`; OTP capture wraps the chosen transport for dev/e2e.
- `src/server/security`: nonce-bound CSP, HSTS, and browser-isolation headers.

## Persistence

- Better Auth tables for user, session, account, verification, and passkey.
- `VaultPasskeyKey` stores the PRF-wrapped Root Key per credential plus the recovery wrap — only opaque blobs.
- Vault entries store only encrypted metadata together with non-sensitive technical fields (itemId, ownerId, revision, algorithm, nonce, ciphertext, AAD struct).
- Trustee sharing tables: `UserKeypair` + `UserKeypairPasskeyKey` (public key plaintext, private key wrapped per passkey/recovery), `ShareInvite` (tokenized invite), `VaultShare` (status, trustee public key snapshot, fingerprint, sealed Root Key), `ShareAccessLog` (append-only read audit). Only opaque/sealed blobs are stored.
