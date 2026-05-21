# 3. Context and Scope

## Business Context

NachKlang users record their online accounts so the information is structured and findable. The real password stays
where it already lives — an external password manager, a paper safe, or another location — and the vault only keeps a
hint about that location. An owner can additionally grant a trusted relative/friend **read-only**, end-to-end-encrypted
access to the vault (the "digital legacy" use case), verified out-of-band and revocable. Inactivity-triggered release is
out of scope for this version.

## Technical Context

- Browser: runs all vault cryptography and operates over decrypted data in memory only.
- Next.js server: serves the UI, the authentication endpoints, and ciphertext APIs.
- PostgreSQL: stores authentication data, vault headers, and opaque ciphertext.
- Email transport (Microsoft Graph or any SMTP server): sends email one-time codes for sign-up and fallback login.
- Caddy: terminates TLS, reverse-proxies, and sets edge security headers.
