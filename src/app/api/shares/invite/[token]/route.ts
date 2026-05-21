import { NextResponse } from "next/server";

import { getInvitePreview } from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public (token-gated) preview so the accept page can show "X invited you" before sign-in.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const preview = await getInvitePreview(token);
  if (!preview) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(preview);
}
