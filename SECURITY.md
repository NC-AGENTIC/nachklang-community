# Security

NachKlang is a **zero-knowledge** web app for managing *metadata* about online accounts —
login URLs, the email/username used, a free-text hint about where the real password is kept,
and a lifecycle status. It is designed so that the server, the operator, and anyone with
database access **cannot read your vault contents**.

This document describes the security model as it is actually implemented. Every claim maps to
code in this repository.

## Reporting a vulnerability

Please report security issues privately to **security@nc-agentic.de**.

- Do **not** open public GitHub issues for vulnerabilities.
- Include reproduction steps and affected versions/commit.
- We aim to acknowledge within **5 business days** and to agree a disclosure timeline with you.
- Please give us a reasonable window to fix before any public disclosure.

## Core principle: no external passwords, ever

NachKlang **never stores the passwords of your external accounts** — not even encrypted. A
vault entry holds only metadata plus a `passwordLocationHint` (e.g. "in my password manager
under Finance"). This is enforced in code: `assertNoSecretFields()` recursively rejects any
field whose key matches `password | passwort | secret | otp | totp | token | recovery |
privatekey`, with `passwordLocationHint` as the single allowed exception. The rule runs both
in the entry schema validation and again immediately before encryption.

## Client-side encryption & key handling

All vault encryption and decryption happens **in the browser**. The server only ever sees
ciphertext and opaque wrapped keys.

- **Root Key.** A 256-bit AES-GCM key generated in the browser via WebCrypto. After
  bootstrap it is held as a **non-extractable** `CryptoKey` — its raw bytes are never present
  in JavaScript-reachable memory during a normal unlocked session. It is kept only in a
  module-level in-memory store; there is **no `localStorage`, `sessionStorage`, or
  `IndexedDB` caching** of keys.
- **Entry encryption (current, v2).** AES-256-GCM via WebCrypto, with a fresh 12-byte random
  IV per entry and **Additional Authenticated Data** binding each ciphertext to its
  `vaultId`, `itemId`, `ownerId`, and `revision`. This prevents ciphertext from being moved
  between items/vaults or rolled back to an older revision.
- **Entry encryption (legacy, v1).** Older entries used XChaCha20-Poly1305 (libsodium). They
  are transparently re-encrypted to v2 the first time the vault is unlocked.
- **Key derivation.** Recovery uses Argon2id (libsodium) — default 64 MiB / 3 iterations,
  with an enforced minimum of 19 MiB / 2 iterations, a 16-byte random salt, and a 256-bit
  output.

## Unlocking the vault

The Root Key is wrapped (encrypted) under two independent key-encryption keys, so the vault
can be opened two ways:

- **Passkey (primary).** A WebAuthn passkey with the **PRF extension**. The PRF output is run
  through HKDF-SHA-256 to derive a non-extractable AES-GCM key-encryption key, which unwraps
  the Root Key. The wrapped key is stored per credential (`VaultPasskeyKey`), so multiple
  devices can be enrolled. The plaintext Root Key never leaves the browser.
- **Recovery code (fallback).** A 120-bit recovery code (Crockford base32) is stretched with
  Argon2id into a key-encryption key that unwraps the Root Key. Raw key bytes from this path
  are zeroed (`memzero`) after use.

The server stores only the wrapped blobs. It has **no mechanism to derive or recover the Root
Key** — losing both your passkeys and your recovery code means the data is unrecoverable by
design.

## Authentication

NachKlang is **passwordless**. Password login is disabled entirely; there is no password or
TOTP secret stored anywhere.

- **Passkeys (WebAuthn)** via Better Auth + `@better-auth/passkey` are the primary login.
- **Email one-time codes (OTP)** are used to verify identity at sign-up and as the fallback
  login when a passkey is unavailable. OTP email is sent through the configured mail transport
  (Microsoft Graph by default, or any SMTP server).
- **Account session vs vault lock are separate.** The Better Auth login session and the
  in-memory Root Key are independent: an idle timeout locks the vault (clears the Root Key)
  without ending the login session, so re-entry only requires re-unlocking, not full re-auth.
- **Idle auto-lock.** After 5 minutes of inactivity the vault locks automatically (with a
  short warning beforehand) and the Root Key is wiped from memory. A manual "Sperren" (lock)
  action clears it on demand. The key is also cleared on tab close / hard reload (`pagehide`).

Server-side route guards enforce the auth chain (`requireSession` → `requireEmailVerified` →
`requirePasskeyRegistered`). Deleting your last passkey is blocked server-side so you cannot
lock yourself out.

## Transport & browser isolation

Security headers are set both at the Caddy edge and by the Next.js app:

- **Content-Security-Policy** — per-request **nonce-bound** policy with `script-src 'self'
  'nonce-…' 'strict-dynamic' 'wasm-unsafe-eval'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`.
- **HSTS** — `max-age=63072000; includeSubDomains; preload`.
- **Cross-origin isolation** — `Cross-Origin-Opener-Policy: same-origin` (app),
  `Cross-Origin-Embedder-Policy: require-corp` (Caddy edge, covering `_next/static`),
  `Cross-Origin-Resource-Policy: same-origin`.
- **Clickjacking** — `X-Frame-Options: DENY` plus CSP `frame-ancestors 'none'`.
- Plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` disabling camera/microphone/geolocation/payment.

**Trusted Types caveat:** `require-trusted-types-for 'script'` is intentionally **not yet
enforced**. First-party DOM sinks are already clean, but a transitive dependency uses the
`Function` constructor, which Trusted Types would block. Enforcement is deferred until the
upstream dependency is fixed.

## Mail security

- Outgoing mail goes through a pluggable transport selected by `NACHKLANG_MAIL_TRANSPORT`:
  **Microsoft Graph** (default) or **SMTP** (via nodemailer). OTP codes are not persisted —
  the dev/e2e capture file is disabled in production.
- For Microsoft Graph, **certificate-based authentication is recommended** (an RS256
  self-signed JWT client assertion, no shared secret to leak or rotate). Client-secret mode is
  also supported. Choose via `NACHKLANG_GRAPH_AUTH_MODE` (see INSTALLATION).
- The mailbox UPN / SMTP host and the visible reply-to address are environment-driven (no
  addresses are hardcoded in source).

## Supply chain & runtime hardening

- Dependencies are version-pinned in `package.json`; container base images in `compose.yaml`
  are pinned by digest. Dependabot is enabled for dependency and GitHub Actions updates.
- CI (GitHub Actions) runs typecheck, unit tests, and build on every push/PR with a
  least-privilege token.
- The `web` container runs as a non-root user, read-only root filesystem with a `/tmp`
  tmpfs, `cap_drop: ALL`, and `no-new-privileges`.

## Backups (encrypted at rest, offline key)

Production database backups extend the zero-knowledge posture to data at rest off the live DB:

- Backups are `pg_dump` archives **age-encrypted to a recipient public key** held on the host,
  while the matching **private key is generated and kept offline only** — never placed on the
  server. The host (and anyone who compromises it) can *create* backups but **cannot decrypt
  them**. Losing the offline key makes backups unrecoverable, by the same design as the vault
  Root Key.
- Each artifact is written with a SHA-256 checksum and pruned on a Grandfather-Father-Son
  schedule by a daily systemd timer; a separate failure unit surfaces a failed run (journald,
  optional webhook). Because artifacts are encrypted before they leave the host, off-site copies
  need not be trusted with plaintext. See `docs/ops/backup-restore.md`.

## Abuse protection

Sign-up relies on email one-time codes, which a bot could abuse for mass registration or
inbox bombing. **Cloudflare Turnstile** (a privacy-friendly CAPTCHA that sets no tracking
cookies) guards the OTP-send endpoint: when configured (`TURNSTILE_SECRET_KEY`), the server
rejects any OTP-send request without a valid Turnstile token. It is env-gated, so deployments
without keys simply run without it. Layered behind Turnstile, **per-IP rate limiting** is
enforced at two levels: Better Auth caps the OTP-send endpoint (3 sends / 5 min) and OTP
verification (10 attempts / 5 min), and the Caddy edge caps `/api/auth/*` at 30 requests/min
per client IP before traffic reaches the app.

## Secret handling

- No credentials, keys, or secrets are committed to this repository. `.env.example` contains
  only placeholders.
- Real configuration lives in `.env.local` (local dev) or `.env` on the production host —
  both untracked.
- The Microsoft Graph certificate private key is mounted at runtime (e.g. via Docker
  secrets), never baked into an image or committed.

## Data export & account deletion

- **Encrypted export.** From the vault settings a user can export their whole vault to a
  **password-protected ZIP** (`@zip.js/zip.js`, **AES-256**, `encryptionStrength: 3`). The
  archive holds a single UTF-8 CSV (RFC-4180, BOM-prefixed for spreadsheets) that opens in any
  spreadsheet or archive tool (7-Zip, Keka, WinRAR) — usable without NachKlang. The export is
  produced **entirely in the browser** from already-decrypted data; the user-chosen passphrase
  (minimum 8 characters) never leaves the client, and the server never sees the plaintext or the
  archive. The CSV is plaintext metadata, so it is only as strong as the passphrase the user
  picks.
- **Account deletion.** A user can irreversibly delete their account at any time. Deletion
  cascades across all of their data — vault, entries, passkeys, sessions, sharing keypair, and
  any shares/invites they created — via Postgres foreign-key cascades. For vault owners the UI
  gates deletion behind a successful export first (so data is not lost by accident); trustee-only
  accounts have no export gate. Invited trustees are emailed that their access is ending before
  the records are removed. There is no soft-delete and no admin recovery.

## Trustee sharing (read-only digital legacy)

A vault owner can grant a trusted relative/friend **read-only**, end-to-end-encrypted access to
their vault metadata. The server stores only sealed material and can never open a share.

- **Per-user X25519 keypair.** Every user has a `crypto_box` keypair. The private key (32 bytes) is
  wrapped exactly like the Root Key — per passkey via the PRF-derived KEK and once via the
  recovery-code KEK (AAD binds `type/keypairId/credentialID/version`). The public key is plaintext.
- **Invite acceptance is mailbox-bound.** An invite link carries a 256-bit bearer token, but the
  token alone is not sufficient to claim the grant: acceptance is rejected (403) unless the
  signed-in account's **OTP-verified** email matches the invited address. A leaked or forwarded
  link therefore cannot be redeemed by an arbitrary account, and the legitimate invitee cannot be
  displaced by a token holder.
- **Out-of-band fingerprint (SAS).** Before granting, both parties compare a short code
  (`SHA-256(publicKey)` → three 4-digit groups) that each side recomputes **client-side** from the
  trustee's public key. A server that swaps the key produces a mismatching code, which the humans
  catch. Sealing only happens after the owner confirms the match.
- **Granting.** The owner transiently derives an *extractable* copy of the Root Key (the same path
  as "add this device"), `crypto_box_seal`s it to the verified trustee public key, and discards the
  extractable copy. The server stores only the sealed blob.
- **Reading.** The trustee unlocks their private key (passkey PRF or recovery code),
  `crypto_box_seal_open`s the Root Key, imports it as a non-extractable AES-GCM key, and decrypts the
  owner's ciphertext fetched from a read-only API. The API is gated to an **active** trustee for the
  requested vault (otherwise 403); trustees can never reach write endpoints.
- **Audit + revocation.** Every read appends an owner-visible access-log row (timestamp, IP, UA).
  Revocation wipes the sealed blob and blocks future reads. **Already-read data cannot be un-seen**,
  and a sealed blob the server released early would still require the trustee's private key to open —
  confidentiality depends on trusting the trustee, only access *timing* is server-influenced.

## What is *not* protected

NachKlang protects the *contents* of your vault. It does not, and cannot, prevent:

- Compromise of the device/browser while the vault is unlocked (the Root Key is in memory).
- Loss of all unlock factors (passkeys **and** recovery code) — data becomes unrecoverable.
- Leakage of *metadata you choose to store* if your account itself is taken over via a stolen
  passkey or a hijacked email-OTP inbox.
- A trustee you granted access to retaining what they have already read after you revoke; choose
  trustees you trust.

## Scope

This security model covers the single-user vault **and** read-only trustee sharing as implemented
today. Inactivity-triggered ("dead man's switch") release is not yet implemented — a trustee gains
access as soon as the owner grants and verifies.
