# 8. Crosscutting Concepts

## Cryptography

- Argon2id as the KDF with versioned minimum parameters enforced at unlock.
- AES-256-GCM as the entry AEAD (v2); legacy XChaCha20-Poly1305 (v1) is auto-migrated.
- Associated data binds type, version, vault, item, owner, and revision.
- The Root Key is non-extractable and never leaves browser memory — no localStorage, sessionStorage, or IndexedDB.

## Trustee sharing

- Each user has an X25519 `crypto_box` keypair; the private key is wrapped exactly like the Root Key (PRF KEK per passkey + recovery-code KEK), the public key is plaintext.
- Granting derives a transient *extractable* Root Key copy, `crypto_box_seal`s it to the trustee's verified public key, and stores only the sealed blob — the server can never open it.
- Authenticity is established out-of-band: a `SHA-256(publicKey)` short fingerprint (SAS) is recomputed client-side on both sides and compared by the humans before the owner seals.
- The read API is gated to an **active** `VaultShare` for the requesting user; each read appends a `ShareAccessLog` row. Revocation wipes the sealed blob; already-read data cannot be un-seen.

## Web Security

- The only allow-listed third-party origin is Cloudflare Turnstile (bot protection); its script loads under the request nonce, so `strict-dynamic` still applies.
- Per-request nonce-bound CSP, HSTS, COOP/COEP, CORP same-origin, and `X-Frame-Options: DENY`.
- Trusted Types enforcement is intentionally deferred: a transitive dependency uses the `Function` constructor, while first-party DOM sinks are already clean.

## Abuse Protection

- Cloudflare Turnstile (env-gated via `TURNSTILE_SECRET_KEY`) guards the email-OTP send endpoint against bot mass-registration and inbox bombing; the server rejects OTP-send requests without a valid token.
- Per-IP rate limiting is enforced at two layers: Better Auth caps OTP-send (3 / 5 min) and OTP-verify (10 / 5 min), and the Caddy edge caps `/api/auth/*` at 30 req/min/IP.

## Vault Locking

- After 5 minutes of inactivity the vault auto-locks: the Root Key is cleared from memory while the login session persists. A warning countdown appears shortly before.
- A manual "Sperren" (lock) action clears the Root Key on demand and routes to `/unlock`.
- Soft navigation does not wipe the in-memory key, but a real close or reload does.
- Recovery is reachable even without a passkey: `/signin` offers an email-code sign-in, which lands on `/unlock` where the recovery code can be used.

## Data Export & Deletion

- **Export** runs entirely client-side: the decrypted vault is serialised to a UTF-8 CSV and packed into a password-protected **AES-256 ZIP** (`@zip.js/zip.js`). The format is deliberately app-independent (opens in any spreadsheet / archive tool); the user passphrase and plaintext never reach the server.
- **Account deletion** is irreversible and cascades across all of the user's data (vault, entries, passkeys, sessions, sharing keypair, shares/invites). Vault-owner deletion is gated behind a prior export; invited trustees are notified by email before removal. No soft-delete, no admin recovery.

## Internationalization

- The UI ships in German (default), English, French, and Spanish via next-intl with
  URL-prefix routing (`/de`, `/en`, `/fr`, `/es`); the bare `/` redirects to the locale
  resolved from the `NEXT_LOCALE` cookie, then `Accept-Language`, then the German default.
- The locale middleware is composed inside the per-request CSP-nonce proxy (`src/proxy.ts`):
  the proxy mints the nonce, hands the request to next-intl, and forwards `x-nonce` onto the
  rewrite via Next's `x-middleware-override-headers` mechanism so server components still read
  it through `headers()`.
- German is the source of truth in `messages/de.json`; a catalog-parity test fails the build
  if any locale drifts from the German key set. Legal pages (Impressum, Datenschutz,
  Copyright) carry the note that the German version is authoritative; the French and Spanish
  legal texts are pending human legal review.

## Privacy

- Data minimisation: the server stores only authentication data and ciphertext.
- Export and deletion are supported.
- Logs must never contain vault contents, one-time codes, or recovery data.
