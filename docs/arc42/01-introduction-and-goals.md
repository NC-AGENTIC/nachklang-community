# 1. Introduction and Goals

NachKlang helps people keep track of their online accounts without ever storing the external passwords themselves.
The core function is a highly secure vault for account metadata: provider, login URL, the email or username used,
a hint about where the real password is kept, free-form notes, and a lifecycle status.

## Quality Goals

- Confidentiality: the server, OS admins, and database admins only ever see ciphertext.
- Integrity: tampering, rollback, and KDF downgrades must be detectable.
- Simplicity: a small set of well-structured functions rather than feature breadth.
- Accessibility: mobile-first, keyboard operable, clear focus handling.
- GDPR: data minimisation, EU operation, export and deletion.
