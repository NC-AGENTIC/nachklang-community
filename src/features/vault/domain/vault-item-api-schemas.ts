import { z } from "zod";

const base64UrlNoPad = z
  .string()
  .min(1)
  .max(8192)
  .regex(/^[A-Za-z0-9_-]+$/, "must be URL-safe base64 without padding");

const itemIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "itemId must be URL-safe");

const associatedDataSchema = z
  .object({
    type: z.literal("vault-entry"),
    version: z.literal(1),
    vaultId: z.string().uuid(),
    itemId: itemIdSchema,
    ownerId: z.string().min(1).max(128),
    revision: z.number().int().positive(),
  })
  .strict();

const baseBodySchema = z
  .object({
    itemId: itemIdSchema,
    revision: z.number().int().positive(),
    // v1 = XChaCha20-Poly1305 (legacy), v2 = AES-256-GCM (SP6c). Ciphertext is
    // opaque to the server; this only records which client cipher produced it.
    algorithm: z.enum(["xchacha20poly1305-ietf", "aes-256-gcm"]),
    nonceBase64: base64UrlNoPad,
    ciphertextBase64: base64UrlNoPad,
    associatedData: associatedDataSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.associatedData.itemId !== value.itemId) {
      ctx.addIssue({
        code: "custom",
        path: ["associatedData", "itemId"],
        message: "associatedData.itemId must equal itemId",
      });
    }
    if (value.associatedData.revision !== value.revision) {
      ctx.addIssue({
        code: "custom",
        path: ["associatedData", "revision"],
        message: "associatedData.revision must equal revision",
      });
    }
  });

export const vaultItemBodySchema = baseBodySchema.superRefine((value, ctx) => {
  if (value.revision !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["revision"],
      message: "POST requires revision === 1",
    });
  }
});

export const putVaultItemBodySchema = baseBodySchema.superRefine((value, ctx) => {
  if (value.revision < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["revision"],
      message: "PUT requires revision >= 2",
    });
  }
});

export type VaultItemBody = z.infer<typeof baseBodySchema>;
export type VaultItemAssociatedData = z.infer<typeof associatedDataSchema>;

export function assertItemAadConsistency(
  body: VaultItemBody,
  ctx: { ownerVaultId: string; urlItemId: string; ownerUserId: string }
): void {
  if (body.associatedData.vaultId !== ctx.ownerVaultId) {
    throw new Error("associatedData.vaultId does not match the caller's vault");
  }
  if (body.itemId !== ctx.urlItemId) {
    throw new Error("body.itemId does not match the URL itemId");
  }
  if (body.associatedData.itemId !== ctx.urlItemId) {
    throw new Error("associatedData.itemId does not match the URL itemId");
  }
  if (body.associatedData.ownerId !== ctx.ownerUserId) {
    throw new Error("associatedData.ownerId does not match the caller");
  }
}
