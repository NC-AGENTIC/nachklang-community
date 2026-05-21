# 9. Architecture Decisions

## ADR-001: Next.js fullstack instead of separate SPA/API

Next.js 16 reduces operational overhead for a small team and allows a single containerised artifact.

## ADR-002: PostgreSQL 18 with Prisma 7

PostgreSQL is robust, open, and easy to operate. Prisma 7 uses the driver adapter and avoids legacy binary-target assumptions.

## ADR-003: Pluggable mail transport; certificate-preferred Graph auth

Mail delivery is abstracted behind a `MailTransport` interface so any SMTP server can be used as an
alternative to Microsoft Graph, selected by `NACHKLANG_MAIL_TRANSPORT` (default Graph). For Graph,
NachKlang prefers a **certificate-based** client assertion (no shared secret to leak or rotate);
client-secret mode is also supported. Both Graph modes work in production.

## ADR-004: Passwordless authentication

NachKlang has no passwords and no separate second factor. Passkeys (WebAuthn + PRF) are the primary mechanism, and email
one-time codes provide the sign-up identity plus a fallback login. A recovery code allows passkey-less vault access.

## ADR-005: Family/friends sharing (read-only digital legacy) — implemented

A vault owner can grant a trusted relative/friend **read-only**, end-to-end-encrypted access to their
vault metadata. The server never sees plaintext and cannot open the share.

- **Identity per user:** every user has an X25519 keypair (`crypto_box_keypair`). The private key is
  wrapped exactly like the Root Key — per passkey via the PRF-derived KEK and once via the
  recovery-code KEK; the public key is stored in plaintext. Newly onboarded users get the keypair
  during onboarding; existing users get a PRF-only keypair provisioned lazily.
- **Trustee-only accounts:** a brand-new invitee onboards a passkey + sharing keypair **without** a
  personal vault, straight from the invite link (the accept page is public and carries a safe
  `returnTo` through signup/signin). Their home is `/shared`; vault-less accounts route there instead
  of `/vault`. An invitee who already has a personal vault keeps it — the share links to the same
  account, so one email never yields two divergent access logics.
- **Out-of-band verification (SAS):** before granting, both parties compare a short fingerprint
  (`SHA-256(publicKey)` → three 4-digit groups) derived **client-side** from the trustee's public
  key. This defends against a malicious server swapping the key.
- **Granting:** the owner transiently derives an *extractable* copy of the Root Key (the "add device"
  pattern), `crypto_box_seal`s it to the verified trustee public key, and stores only the sealed blob.
- **Reading:** the trustee unlocks their private key, `crypto_box_seal_open`s the Root Key, and
  decrypts the owner's ciphertext fetched via a read-only, trustee-gated API. Every read appends an
  owner-visible `ShareAccessLog` row.
- **Revocation:** wipes the sealed blob and blocks future reads. Already-read data cannot be un-seen
  (documented limitation). Inactivity/dead-man's-switch release is a later iteration.

(Earlier versions deferred this to v2; it is now shipped.)
