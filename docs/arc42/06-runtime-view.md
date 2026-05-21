# 6. Runtime View

## Onboarding

1. The user verifies their email via an email one-time code (sign-up identity).
2. The browser registers a passkey (WebAuthn with the PRF extension).
3. The browser generates the vault Root Key (AES-256-GCM, re-derived non-extractable) and the KDF policy.
4. The Root Key is wrapped with a key derived from the passkey's PRF output and stored as an opaque blob per credential.
5. A recovery code is generated; an Argon2id-derived key wraps a second copy of the Root Key as the recovery wrap.
6. The recovery kit is shown and must be confirmed by the user.

## Unlock

1. The user authenticates with a passkey (or the recovery code as fallback).
2. The browser unwraps the Root Key into a non-extractable `CryptoKey` held only in memory.
3. Legacy v1 entries (XChaCha20-Poly1305) are auto-migrated to v2 (AES-256-GCM) on unlock.

## Saving an Entry

1. The user picks a provider or enters one manually.
2. The UI rejects any secret fields; only a password-location hint is allowed.
3. The browser encrypts the entry with the Root Key and AEAD associated data binding type, version, vault, item, owner, and revision.
4. The server stores only ciphertext, nonce, revision, and technical IDs.

## Granting Trustee Access

1. The owner invites a trustee by email; the invitee accepts the link and provisions a passkey + X25519 sharing keypair. Acceptance is bound to the invited mailbox — the server rejects (403) unless the signed-in account's OTP-verified email matches the invited address, so a leaked or forwarded link cannot be claimed by another account.
2. Both parties compare a short out-of-band fingerprint (`SHA-256(publicKey)`) recomputed client-side.
3. After the owner confirms the match, the browser derives a transient extractable Root Key copy, `crypto_box_seal`s it to the trustee's public key, and uploads only the sealed blob.

## Reading a Shared Vault (Trustee)

1. The trustee unlocks their private key (passkey PRF or recovery code) and fetches the sealed Root Key + ciphertext from the trustee-gated read API (403 unless an active share exists).
2. The browser `crypto_box_seal_open`s the Root Key, imports it non-extractably, and decrypts the owner's entries.
3. Each read appends an owner-visible `ShareAccessLog` row; revocation wipes the sealed blob and blocks further reads.

## Exporting and Deleting

1. **Export:** the browser serialises the decrypted vault to CSV and writes a password-protected AES-256 ZIP entirely client-side; the passphrase and plaintext never reach the server.
2. **Account deletion:** invited trustees are emailed that access is ending, then the user record is cascade-deleted (vault, entries, passkeys, sessions, keypair, shares/invites). It is irreversible with no admin recovery.
