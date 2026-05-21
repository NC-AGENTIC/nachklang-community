import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/server/audit/audit-repo";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { getOwnerVaultId, purgeShare, revokeShare } from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const { id } = await params;

  const ownerVaultId = await getOwnerVaultId(session.user.id);
  if (!ownerVaultId) {
    return NextResponse.json({ error: "not_onboarded" }, { status: 404 });
  }

  // ?purge=1 permanently deletes a (revoked) share record; otherwise this revokes it.
  if (new URL(request.url).searchParams.get("purge") === "1") {
    const purged = await purgeShare({ shareId: id, ownerVaultId });
    if ("error" in purged) {
      return NextResponse.json({ error: purged.error }, { status: 404 });
    }
    void recordAuditEvent({
      action: "share.purged",
      actorUserId: session.user.id,
      targetUserId: session.user.id,
      vaultId: ownerVaultId,
    }).catch(() => {});
    return new NextResponse(null, { status: 204 });
  }

  const result = await revokeShare({ shareId: id, ownerVaultId });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  void recordAuditEvent({
    action: "share.revoked",
    actorUserId: session.user.id,
    targetUserId: session.user.id,
    vaultId: ownerVaultId,
  }).catch(() => {});

  return new NextResponse(null, { status: 204 });
}
