import { z } from "zod";

export const wrappedTrusteePrivateKeySchema = z
  .object({
    version: z.literal(2),
    algorithm: z.literal("aes-256-gcm"),
    ivBase64: z.string().min(1),
    ciphertextBase64: z.string().min(1),
    associatedData: z
      .object({
        type: z.enum(["trustee-private-key-prf", "trustee-private-key-recovery"]),
        keypairId: z.string().min(1),
        credentialID: z.string().min(1).optional(),
        version: z.literal(2),
      })
      .strict(),
  })
  .strict();

export const createKeypairPayloadSchema = z
  .object({
    keypairId: z.string().min(1).max(80),
    publicKey: z.string().min(1).max(128),
    prfWrappedPrivateKeys: z
      .array(
        z.object({
          credentialID: z.string().min(1),
          wrapped: wrappedTrusteePrivateKeySchema,
        }),
      )
      .min(1)
      .max(20),
    // Optional: lazily-provisioned keypairs (existing users, no recovery code at hand) have
    // only PRF wraps. See bootstrapUserKeypairPrfOnly.
    recoveryWrappedPrivateKey: wrappedTrusteePrivateKeySchema.optional(),
  })
  .strict();

export type CreateKeypairPayloadInput = z.infer<typeof createKeypairPayloadSchema>;
