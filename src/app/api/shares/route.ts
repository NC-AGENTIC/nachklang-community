import { NextResponse } from "next/server";

import { requireFullyAuthenticated } from "@/server/auth/session";
import { getOwnerVaultId, listSharesForVault } from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Owner's "who has access" list. Returns trusteePublicKey so the owner can recompute the SAS
// fingerprint client-side; never returns sealedRootKey.
export async function GET(): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const vaultId = await getOwnerVaultId(session.user.id);
  if (!vaultId) {
    return NextResponse.json({ error: "not_onboarded" }, { status: 404 });
  }

  const rows = await listSharesForVault(vaultId);
  const shares = rows.map((s) => {
    const last = s.accessLogs?.[0]?.accessedAt ?? null;
    return {
      id: s.id,
      label: s.label,
      status: s.status,
      trusteePublicKey: s.trusteePublicKey,
      fingerprint: s.trusteeFingerprint,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
      lastAccessedAt: last instanceof Date ? last.toISOString() : last,
      accessCount: s._count?.accessLogs ?? 0,
    };
  });
  return NextResponse.json({ shares });
}
