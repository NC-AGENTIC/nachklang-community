# 2. Constraints

- The deployment target is a single Linux host running Docker Compose, hosted in the EU.
- All runtime configuration is environment-driven (e.g. `WEBAUTHN_RP_ID`, app URLs, `CADDY_SITE_ADDRESS`); production secrets live only on the host.
- No commercial add-ons, no unvetted packages, no community Docker images without provenance checks.
- Node.js 24, Next.js 16, React 19, Prisma 7, PostgreSQL 18.
- External passwords must never be stored.
- Authentication is passwordless (passkeys with email-OTP as the identity and fallback mechanism).
