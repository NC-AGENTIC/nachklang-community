import { NextResponse } from "next/server";

import { sealShareSchema } from "@/features/trustee/domain/share-schemas";
import { recordAuditEvent } from "@/server/audit/audit-repo";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { getOwnerVaultId, sealShare } from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = sealShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const ownerVaultId = await getOwnerVaultId(session.user.id);
  if (!ownerVaultId) {
    return NextResponse.json({ error: "not_onboarded" }, { status: 404 });
  }

  const result = await sealShare({ shareId: id, ownerVaultId, sealedRootKey: parsed.data.sealedRootKey });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  void recordAuditEvent({
    action: "share.sealed",
    actorUserId: session.user.id,
    targetUserId: session.user.id,
    vaultId: ownerVaultId,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
