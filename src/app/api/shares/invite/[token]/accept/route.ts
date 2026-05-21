import { NextResponse } from "next/server";

import { fingerprintPublicKey, publicKeyFromBase64 } from "@/features/trustee/crypto/trustee-keypair";
import { recordAuditEvent } from "@/server/audit/audit-repo";
import { requireFullyAuthenticated } from "@/server/auth/session";
import {
  acceptInvite,
  getInviteByToken,
  getUserPublicKey,
  getVaultOwnerId,
} from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const { token } = await params;

  // The trustee must already have a keypair; the client provisions one (ensure-keypair) first.
  const publicKey = await getUserPublicKey(session.user.id);
  if (!publicKey) {
    return NextResponse.json({ error: "no_keypair" }, { status: 409 });
  }

  // Fingerprint computed server-side from the bound key. The client recomputes it from the same
  // public key for the out-of-band SAS compare, so a server that swaps the key is detected.
  const fingerprint = await fingerprintPublicKey(publicKeyFromBase64(publicKey));

  const result = await acceptInvite({
    token,
    trusteeUserId: session.user.id,
    trusteePublicKey: publicKey,
    trusteeFingerprint: fingerprint,
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  // Transparency: record the acceptance in the OWNER's log (trustee name resolved at read-time)
  // and in the trustee's own (self) log.
  void (async () => {
    const invite = await getInviteByToken(token);
    const ownerId = invite ? await getVaultOwnerId(invite.vaultId) : null;
    if (ownerId && invite) {
      await recordAuditEvent({
        action: "share.accepted",
        actorUserId: session.user.id,
        targetUserId: ownerId,
        vaultId: invite.vaultId,
      });
      await recordAuditEvent({
        action: "share.accepted.self",
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        vaultId: invite.vaultId,
      });
    }
  })().catch(() => {});

  return NextResponse.json({ shareId: result.shareId, status: result.status, fingerprint });
}
