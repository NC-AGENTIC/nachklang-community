import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { assertItemAadConsistency, putVaultItemBodySchema } from "@/features/vault/domain/vault-item-api-schemas";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { deleteItem, updateItem } from "@/server/vault/vault-item-repo";
import { findVaultByUser } from "@/server/vault/vault-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ itemId: string }> };

export async function PUT(request: Request, ctx: RouteCtx): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const vault = await findVaultByUser(session.user.id);
  if (!vault) {
    return NextResponse.json({ error: "vault_not_onboarded" }, { status: 404 });
  }
  const { itemId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = putVaultItemBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 422 });
  }
  try {
    assertItemAadConsistency(parsed.data, {
      ownerVaultId: vault.vaultId,
      urlItemId: itemId,
      ownerUserId: session.user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "invalid_body", message: error instanceof Error ? error.message : "aad_mismatch" },
      { status: 422 },
    );
  }

  const outcome = await updateItem({
    vaultId: vault.vaultId,
    itemId,
    ownerId: session.user.id,
    revision: parsed.data.revision,
    algorithm: parsed.data.algorithm,
    nonceBase64: parsed.data.nonceBase64,
    ciphertextBase64: parsed.data.ciphertextBase64,
    associatedData: parsed.data.associatedData as unknown as Prisma.JsonObject,
  });
  if (outcome.kind === "stale") {
    return NextResponse.json({ error: "vault_item_stale" }, { status: 409 });
  }
  return NextResponse.json({
    itemId: outcome.row.itemId,
    revision: outcome.row.revision,
    updatedAt: outcome.row.updatedAt.toISOString(),
  });
}

export async function DELETE(request: Request, ctx: RouteCtx): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const vault = await findVaultByUser(session.user.id);
  if (!vault) {
    return NextResponse.json({ error: "vault_not_onboarded" }, { status: 404 });
  }
  const { itemId } = await ctx.params;
  const url = new URL(request.url);
  const revisionStr = url.searchParams.get("revision");
  const revision = Number(revisionStr);
  if (!revisionStr || !Number.isInteger(revision) || revision <= 0) {
    return NextResponse.json({ error: "invalid_revision" }, { status: 422 });
  }

  const outcome = await deleteItem(vault.vaultId, itemId, revision);
  if (outcome.kind === "stale") {
    return NextResponse.json({ error: "vault_item_stale" }, { status: 409 });
  }
  return new NextResponse(null, { status: 204 });
}
