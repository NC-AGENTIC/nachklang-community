# 10. Quality Requirements

- Security: dependency audit with no known vulnerabilities, nonce-bound CSP active, cryptography tests green.
- Usability: the first view is usable at 390px width without horizontal overflow.
- Operation: `docker compose config` and a local build must run reproducibly.
- Maintainability: feature-oriented structure under `src/features`, technical adapters under `src/server`.
- Accessibility: semantic navigation, visible focus, sufficient contrast, no mouse-only interactions.
