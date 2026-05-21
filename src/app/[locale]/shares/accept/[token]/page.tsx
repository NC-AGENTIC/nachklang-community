import { headers } from "next/headers";

import { AcceptInviteFlow } from "@/features/trustee/ui/accept-invite-flow";
import type { AcceptPhase } from "@/features/trustee/ui/accept-invite-panel";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

// Public page (token-gated): show the invite preview to everyone so a brand-new invitee isn't
// dead-ended at /signin. The page only decides which call-to-action to render; the accept action
// itself is still fully-auth-gated server-side.
export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  let phase: AcceptPhase = "anonymous";
  if (session?.user?.emailVerified) {
    const passkeys = await prisma.passkey.count({ where: { userId: session.user.id } });
    // Has a passkey → can accept directly; signed up but no passkey yet → register one inline
    // (trustee-only, no personal vault).
    phase = passkeys > 0 ? "ready" : "register";
  }

  return <AcceptInviteFlow token={token} phase={phase} />;
}
