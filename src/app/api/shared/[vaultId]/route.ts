import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/server/audit/audit-repo";
import { requireFullyAuthenticated } from "@/server/auth/session";
import {
  getActiveShareForTrustee,
  getVaultOwnerId,
  getVaultOwnerName,
  listItemProgressForTrustee,
  logShareAccess,
} from "@/server/trustee/share-repo";
import { listItems } from "@/server/vault/vault-item-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: Request): string | undefined {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim();
  return request.headers.get("x-real-ip") ?? undefined;
}

// Trustee read-only access to a shared vault's ciphertext. Gated to an active VaultShare for the
// requesting user; every successful read appends a ShareAccessLog row (owner-visible audit).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const { vaultId } = await params;

  const share = await getActiveShareForTrustee(vaultId, session.user.id);
  if (!share) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ownerId = await getVaultOwnerId(vaultId);
  const ownerName = await getVaultOwnerName(vaultId);
  const rows = await listItems(vaultId);
  const progress = await listItemProgressForTrustee(vaultId, session.user.id);

  await logShareAccess({
    shareId: share.id,
    trusteeUserId: session.user.id,
    ipAddress: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  // Transparency, leak-free: log the trustee read in the OWNER's log. The trustee NAME is resolved
  // at read-time (not stored), so no extra PII is persisted.
  if (ownerId) {
    void recordAuditEvent({
      action: "vault.read",
      actorUserId: session.user.id,
      targetUserId: ownerId,
      vaultId,
    }).catch(() => {});
  }

  // Most recent owner content change, so the trustee can see how fresh the shared vault is.
  const ownerUpdatedAt = rows.reduce<string | null>((latest, row) => {
    const iso = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt);
    return latest === null || iso > latest ? iso : latest;
  }, null);

  return NextResponse.json({
    vaultId,
    ownerId,
    ownerName,
    ownerUpdatedAt,
    sealedRootKey: share.sealedRootKey,
    items: rows.map((row) => ({
      itemId: row.itemId,
      ownerId: row.ownerId,
      revision: row.revision,
      algorithm: row.algorithm,
      nonceBase64: row.nonceBase64,
      ciphertextBase64: row.ciphertextBase64,
      associatedData: row.associatedData,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    })),
    progress: progress.map((p) => ({
      itemId: p.itemId,
      nonceBase64: p.nonceBase64,
      ciphertextBase64: p.ciphertextBase64,
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    })),
  });
}
