import { NextResponse } from "next/server";

import { itemProgressSchema } from "@/features/trustee/domain/share-schemas";
import { recordAuditEvent } from "@/server/audit/audit-repo";
import { requireFullyAuthenticated } from "@/server/auth/session";
import {
  getActiveShareForTrustee,
  getVaultOwnerId,
  upsertItemProgress,
} from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A trustee records their handling status for one shared item. Gated to an ACTIVE share for the
// caller, so only a granted (and not-revoked) trustee can write. The body is an opaque encrypted
// blob — the server never sees the status value.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const { vaultId } = await params;

  const share = await getActiveShareForTrustee(vaultId, session.user.id);
  if (!share) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = itemProgressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await upsertItemProgress({
    vaultId,
    itemId: parsed.data.itemId,
    trusteeUserId: session.user.id,
    nonceBase64: parsed.data.nonceBase64,
    ciphertextBase64: parsed.data.ciphertextBase64,
  });

  // Transparency, leak-free: log only the opaque itemId (the owner resolves the entry NAME
  // client-side from their own unlocked vault; the trustee NAME is resolved at read-time). The
  // status value stays encrypted and is never logged. Owner log + trustee's own (self) log.
  const ownerId = await getVaultOwnerId(vaultId);
  if (ownerId) {
    void recordAuditEvent({
      action: "item.status_changed",
      actorUserId: session.user.id,
      targetUserId: ownerId,
      vaultId,
      metadata: { itemId: parsed.data.itemId },
    }).catch(() => {});
  }
  void recordAuditEvent({
    action: "item.status_changed.self",
    actorUserId: session.user.id,
    targetUserId: session.user.id,
    vaultId,
    metadata: { itemId: parsed.data.itemId },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
