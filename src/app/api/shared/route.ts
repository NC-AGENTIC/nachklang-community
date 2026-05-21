import { NextResponse } from "next/server";

import { requireFullyAuthenticated } from "@/server/auth/session";
import { listSharesForTrustee } from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Shared with me": vaults the caller can read as an active trustee.
export async function GET(): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const rows = await listSharesForTrustee(session.user.id);
  const shares = rows.map((s) => ({
    vaultId: s.vaultId,
    ownerName: s.vault.user.name,
  }));
  return NextResponse.json({ shares });
}
