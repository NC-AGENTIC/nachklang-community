import { z } from "zod";

export const webCryptoWrappedRootKeySchema = z.object({
  version: z.literal(2),
  algorithm: z.literal("aes-256-gcm"),
  ivBase64: z.string().min(1),
  ciphertextBase64: z.string().min(1),
  associatedData: z.object({
    type: z.enum(["vault-root-key-prf", "vault-root-key-recovery"]),
    vaultId: z.string().min(1),
    credentialID: z.string().min(1).optional(),
    version: z.literal(2),
  }).strict(),
}).strict();

export const kdfPolicySchema = z.object({
  algorithm: z.literal("argon2id"),
  version: z.literal(1),
  operationsLimit: z.number().int().positive(),
  memoryLimitBytes: z.number().int().positive(),
  saltBase64: z.string().min(1),
}).strict();

export const createVaultPayloadSchema = z.object({
  vaultId: z.string().min(1).max(80),
  kdfPolicy: kdfPolicySchema,
  prfWrappedRootKeys: z.array(z.object({
    credentialID: z.string().min(1),
    wrapped: webCryptoWrappedRootKeySchema,
  })).min(1).max(20),
  recoveryWrappedRootKey: webCryptoWrappedRootKeySchema,
}).strict();

export const addPasskeyKeyPayloadSchema = z.object({
  credentialID: z.string().min(1),
  wrapped: webCryptoWrappedRootKeySchema,
}).strict();

export type CreateVaultPayload = z.infer<typeof createVaultPayloadSchema>;
export type AddPasskeyKeyPayload = z.infer<typeof addPasskeyKeyPayloadSchema>;
