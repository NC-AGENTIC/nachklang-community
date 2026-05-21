import { z } from "zod";

// Owner invites a trustee by email + a human label ("my sister", "Anwalt", ...).
export const createInviteSchema = z
  .object({
    inviteeEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(254),
    label: z.string().trim().min(1).max(80),
  })
  .strict();

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

// Owner-computed sealed Root Key (libsodium crypto_box_seal of the 32-byte Root Key to the
// trustee's X25519 public key), base64. ~108 chars for a 32-byte payload; cap generously.
export const sealShareSchema = z
  .object({
    sealedRootKey: z.string().min(1).max(512),
  })
  .strict();

export type SealShareInput = z.infer<typeof sealShareSchema>;

// Trustee's per-item handling-status overlay: an AES-GCM nonce + ciphertext (base64) of a tiny
// JSON status payload, encrypted client-side with the vault Root Key. The server stores the
// opaque blob and never learns the status (zero-knowledge).
export const itemProgressSchema = z
  .object({
    itemId: z.string().trim().min(1).max(160),
    nonceBase64: z.string().min(1).max(64),
    ciphertextBase64: z.string().min(1).max(512),
  })
  .strict();

export type ItemProgressInput = z.infer<typeof itemProgressSchema>;
