import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export type StoredVaultItem = {
  itemId: string;
  ownerId: string;
  revision: number;
  algorithm: string;
  nonceBase64: string;
  ciphertextBase64: string;
  associatedData: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

export type VaultItemWriteInput = {
  vaultId: string;
  itemId: string;
  ownerId: string;
  revision: number;
  algorithm: string;
  nonceBase64: string;
  ciphertextBase64: string;
  associatedData: Prisma.JsonObject;
};

export async function listItems(vaultId: string): Promise<StoredVaultItem[]> {
  const rows = await prisma.vaultCiphertext.findMany({
    where: { vaultId },
    orderBy: { createdAt: "asc" },
    select: {
      itemId: true,
      ownerId: true,
      revision: true,
      algorithm: true,
      nonceBase64: true,
      ciphertextBase64: true,
      associatedData: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows;
}

export type CreateItemOutcome =
  | { kind: "ok"; row: { itemId: string; revision: number; createdAt: Date; updatedAt: Date } }
  | { kind: "conflict" };

export async function createItem(input: VaultItemWriteInput): Promise<CreateItemOutcome> {
  try {
    const row = await prisma.vaultCiphertext.create({
      data: {
        vaultId: input.vaultId,
        itemId: input.itemId,
        ownerId: input.ownerId,
        revision: input.revision,
        algorithm: input.algorithm,
        nonceBase64: input.nonceBase64,
        ciphertextBase64: input.ciphertextBase64,
        associatedData: input.associatedData,
      },
      select: { itemId: true, revision: true, createdAt: true, updatedAt: true },
    });
    return { kind: "ok", row };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { kind: "conflict" };
    }
    throw error;
  }
}

export type UpdateItemOutcome =
  | { kind: "ok"; row: { itemId: string; revision: number; updatedAt: Date } }
  | { kind: "stale" };

export async function updateItem(input: VaultItemWriteInput): Promise<UpdateItemOutcome> {
  const result = await prisma.vaultCiphertext.updateMany({
    where: {
      vaultId: input.vaultId,
      itemId: input.itemId,
      revision: input.revision - 1,
    },
    data: {
      revision: input.revision,
      algorithm: input.algorithm,
      nonceBase64: input.nonceBase64,
      ciphertextBase64: input.ciphertextBase64,
      associatedData: input.associatedData,
    },
  });
  if (result.count === 0) {
    return { kind: "stale" };
  }
  const row = await prisma.vaultCiphertext.findUniqueOrThrow({
    where: { vaultId_itemId: { vaultId: input.vaultId, itemId: input.itemId } },
    select: { itemId: true, revision: true, updatedAt: true },
  });
  return { kind: "ok", row };
}

export type DeleteItemOutcome = { kind: "ok" } | { kind: "stale" };

export async function deleteItem(vaultId: string, itemId: string, revision: number): Promise<DeleteItemOutcome> {
  const result = await prisma.vaultCiphertext.deleteMany({
    where: { vaultId, itemId, revision },
  });
  return result.count === 0 ? { kind: "stale" } : { kind: "ok" };
}

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === "P2002";
}
