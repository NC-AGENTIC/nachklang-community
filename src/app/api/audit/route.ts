import { NextResponse } from "next/server";

import { listAuditForUser } from "@/server/audit/audit-repo";
import { requireFullyAuthenticated } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in user's transparency log: their own actions plus any action (incl. admin/automation
// deletions captured by DB triggers) affecting their account or vault.
export async function GET(): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const events = await listAuditForUser(session.user.id, session.user.email ?? null);
  return NextResponse.json({ events });
}
