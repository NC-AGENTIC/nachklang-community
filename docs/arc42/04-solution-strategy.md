# 4. Solution Strategy

- Zero-knowledge vault: a non-extractable Root Key lives only in browser memory; entries are encrypted client-side with AES-256-GCM and bound AEAD associated data.
- Passwordless authentication: passkeys (WebAuthn + PRF) are primary; email one-time codes (via a pluggable transport: Microsoft Graph or SMTP) provide the sign-up identity and a fallback login. There is no password and no separate second factor.
- Minimal server state: no plaintext indexes, no vault passphrase, no admin recovery — the server holds only opaque wrapped key blobs and ciphertext.
- Mobile-first UI: the workspace is the first thing an authenticated user sees.
- Container-first operation: the local Compose setup matches the production deployment as closely as possible.
