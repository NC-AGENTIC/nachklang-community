import { NextResponse } from "next/server";

import { addPasskeyKeyPayloadSchema } from "@/features/vault/domain/vault-setup-schemas";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const session = await requireFullyAuthenticated();

  const vault = await prisma.vault.findUnique({ where: { userId: session.user.id } });
  if (!vault) {
    return NextResponse.json({ error: "not_onboarded" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = addPasskeyKeyPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await prisma.vaultPasskeyKey.create({
      data: {
        vaultId: vault.vaultId,
        credentialID: parsed.data.credentialID,
        wrapped: parsed.data.wrapped,
      },
    });
  } catch {
    // Unique violation on (vaultId, credentialID) → key already present.
    return NextResponse.json({ error: "key_exists" }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request): Promise<Response> {
  const session = await requireFullyAuthenticated();

  const vault = await prisma.vault.findUnique({ where: { userId: session.user.id } });
  if (!vault) {
    return NextResponse.json({ error: "not_onboarded" }, { status: 404 });
  }

  const credentialID = new URL(request.url).searchParams.get("credentialID");
  if (!credentialID) {
    return NextResponse.json({ error: "missing_credentialID" }, { status: 400 });
  }

  const remaining = await prisma.vaultPasskeyKey.count({ where: { vaultId: vault.vaultId } });
  if (remaining <= 1) {
    return NextResponse.json({ error: "last_unlock_path" }, { status: 409 });
  }

  await prisma.vaultPasskeyKey.delete({
    where: { vaultId_credentialID: { vaultId: vault.vaultId, credentialID } },
  });

  return new NextResponse(null, { status: 204 });
}
