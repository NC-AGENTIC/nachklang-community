import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { assertItemAadConsistency, vaultItemBodySchema } from "@/features/vault/domain/vault-item-api-schemas";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { createItem, listItems } from "@/server/vault/vault-item-repo";
import { findVaultByUser } from "@/server/vault/vault-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const vault = await findVaultByUser(session.user.id);
  if (!vault) {
    return NextResponse.json({ error: "vault_not_onboarded" }, { status: 404 });
  }
  const rows = await listItems(vault.vaultId);
  return NextResponse.json({
    vaultId: vault.vaultId,
    items: rows.map((row) => ({
      itemId: row.itemId,
      ownerId: row.ownerId,
      revision: row.revision,
      algorithm: row.algorithm,
      nonceBase64: row.nonceBase64,
      ciphertextBase64: row.ciphertextBase64,
      associatedData: row.associatedData,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const vault = await findVaultByUser(session.user.id);
  if (!vault) {
    return NextResponse.json({ error: "vault_not_onboarded" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = vaultItemBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 422 });
  }
  try {
    assertItemAadConsistency(parsed.data, {
      ownerVaultId: vault.vaultId,
      urlItemId: parsed.data.itemId,
      ownerUserId: session.user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "invalid_body", message: error instanceof Error ? error.message : "aad_mismatch" },
      { status: 422 },
    );
  }

  const outcome = await createItem({
    vaultId: vault.vaultId,
    itemId: parsed.data.itemId,
    ownerId: session.user.id,
    revision: parsed.data.revision,
    algorithm: parsed.data.algorithm,
    nonceBase64: parsed.data.nonceBase64,
    ciphertextBase64: parsed.data.ciphertextBase64,
    associatedData: parsed.data.associatedData as unknown as Prisma.JsonObject,
  });
  if (outcome.kind === "conflict") {
    return NextResponse.json({ error: "vault_item_exists" }, { status: 409 });
  }
  return NextResponse.json(
    {
      itemId: outcome.row.itemId,
      revision: outcome.row.revision,
      createdAt: outcome.row.createdAt.toISOString(),
      updatedAt: outcome.row.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}
