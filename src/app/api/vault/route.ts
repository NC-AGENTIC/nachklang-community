import { NextResponse } from "next/server";

import { createVaultPayloadSchema } from "@/features/vault/domain/vault-setup-schemas";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const session = await requireFullyAuthenticated();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createVaultPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const { vaultId, kdfPolicy, prfWrappedRootKeys, recoveryWrappedRootKey } = parsed.data;

  const existing = await prisma.vault.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    return NextResponse.json({ error: "vault_exists" }, { status: 409 });
  }

  try {
    await prisma.vault.create({
      data: {
        userId: session.user.id,
        vaultId,
        kdfPolicy,
        recoveryWrappedRootKey,
      },
    });
    await prisma.vaultPasskeyKey.createMany({
      data: prfWrappedRootKeys.map((k) => ({
        vaultId,
        credentialID: k.credentialID,
        wrapped: k.wrapped,
      })),
    });
  } catch {
    // The Prisma client surfaces unique-constraint violations as P2002.
    // Either way, treat it as a 409 from the user's perspective.
    return NextResponse.json({ error: "vault_exists" }, { status: 409 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const row = await prisma.vault.findUnique({
    where: { userId: session.user.id },
    select: {
      vaultId: true,
      kdfPolicy: true,
      recoveryWrappedRootKey: true,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "not_onboarded" }, { status: 404 });
  }

  const passkeyKeys = await prisma.vaultPasskeyKey.findMany({
    where: { vaultId: row.vaultId },
    select: { credentialID: true, wrapped: true },
  });

  return NextResponse.json({
    vaultId: row.vaultId,
    kdfPolicy: row.kdfPolicy,
    recoveryWrappedRootKey: row.recoveryWrappedRootKey,
    prfWrappedRootKeys: passkeyKeys.map((k) => ({
      credentialID: k.credentialID,
      wrapped: k.wrapped,
    })),
  });
}
