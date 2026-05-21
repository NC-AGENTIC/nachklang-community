# 11. Risks and Technical Debt

- Web-based zero-knowledge cannot fully prevent a maliciously altered delivered client. Mitigations: nonce-bound CSP, no third-party scripts, and a published build/release identifier.
- Trusted Types enforcement is deferred because a transitive dependency uses the `Function` constructor; first-party DOM sinks are already clean, and enforcement will follow once the upstream issue is fixed.
- Better Auth and Prisma 7 are current but moving fast. Versions stay exactly pinned and are watched via dependency audit.
- Docker base images and Compose services are pinned by digest. Signatures and SBOMs are reviewed before production.
- Account lifecycle uses four explicit states (aktiv, stillgelegt, anbieter-informiert, geloescht); status changes persist immediately with no undo.
- The encrypted export is a plaintext CSV inside an AES-256 ZIP, so its confidentiality depends entirely on the user-chosen passphrase; account deletion is irreversible by design (no soft-delete, no admin recovery).
