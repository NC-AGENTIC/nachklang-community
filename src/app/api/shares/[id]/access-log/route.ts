import { NextResponse } from "next/server";

import { requireFullyAuthenticated } from "@/server/auth/session";
import { getOwnerVaultId, listAccessLog } from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const { id } = await params;

  const ownerVaultId = await getOwnerVaultId(session.user.id);
  if (!ownerVaultId) {
    return NextResponse.json({ error: "not_onboarded" }, { status: 404 });
  }

  const rows = await listAccessLog(id, ownerVaultId);
  if (!rows) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    entries: rows.map((r) => ({
      accessedAt: r.accessedAt instanceof Date ? r.accessedAt.toISOString() : r.accessedAt,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
    })),
  });
}
