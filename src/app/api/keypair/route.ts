import { NextResponse } from "next/server";

import { createKeypairPayloadSchema } from "@/features/trustee/domain/keypair-schemas";
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

  const parsed = createKeypairPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  const { keypairId, publicKey, prfWrappedPrivateKeys, recoveryWrappedPrivateKey } = parsed.data;

  const existing = await prisma.userKeypair.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    return NextResponse.json({ error: "keypair_exists" }, { status: 409 });
  }

  try {
    await prisma.userKeypair.create({
      data: { id: keypairId, userId: session.user.id, publicKey, recoveryWrappedPrivateKey },
    });
    await prisma.userKeypairPasskeyKey.createMany({
      data: prfWrappedPrivateKeys.map((k) => ({
        keypairId,
        credentialID: k.credentialID,
        wrapped: k.wrapped,
      })),
    });
  } catch {
    return NextResponse.json({ error: "keypair_exists" }, { status: 409 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const row = await prisma.userKeypair.findUnique({
    where: { userId: session.user.id },
    select: { id: true, publicKey: true, recoveryWrappedPrivateKey: true },
  });
  if (!row) {
    return NextResponse.json({ error: "no_keypair" }, { status: 404 });
  }
  const passkeyKeys = await prisma.userKeypairPasskeyKey.findMany({
    where: { keypairId: row.id },
    select: { credentialID: true, wrapped: true },
  });
  return NextResponse.json({
    keypairId: row.id,
    publicKey: row.publicKey,
    recoveryWrappedPrivateKey: row.recoveryWrappedPrivateKey,
    prfWrappedPrivateKeys: passkeyKeys.map((k) => ({ credentialID: k.credentialID, wrapped: k.wrapped })),
  });
}
