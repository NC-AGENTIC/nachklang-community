import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { createInviteSchema } from "@/features/trustee/domain/share-schemas";
import { recordAuditEvent } from "@/server/audit/audit-repo";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { pickLocaleFromRequest } from "@/server/i18n/pick-locale";
import { buildInviteEmailHtml } from "@/server/mail/invite-email-template";
import { getMailTransport } from "@/server/mail/transport";
import { createInvite, getOwnerVaultId } from "@/server/trustee/share-repo";
import { INVITE_TTL_DAYS } from "@/server/trustee/invite-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL =
  process.env.NACHKLANG_APP_URL || process.env.NACHKLANG_BUILD_ORIGIN || "http://localhost:3000";

export async function POST(request: Request): Promise<Response> {
  const session = await requireFullyAuthenticated();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const vaultId = await getOwnerVaultId(session.user.id);
  if (!vaultId) {
    return NextResponse.json({ error: "not_onboarded" }, { status: 404 });
  }

  const { inviteeEmail, label } = parsed.data;
  const invite = await createInvite({ vaultId, inviteeEmail, label });

  void recordAuditEvent({
    action: "share.invited",
    actorUserId: session.user.id,
    targetUserId: session.user.id,
    vaultId,
    metadata: { inviteeEmail },
  }).catch(() => {});

  const locale = pickLocaleFromRequest(request);
  const acceptUrl = `${APP_URL}/${locale}/shares/accept/${invite.token}`;
  const ownerName = session.user.name || session.user.email;

  let emailSent = false;
  try {
    const t = await getTranslations({ locale, namespace: "email.invite" });
    await getMailTransport().send({
      to: inviteeEmail,
      subject: t("subject", { owner: ownerName }),
      html: buildInviteEmailHtml({
        acceptUrl,
        // Inline text wordmark (see auth.ts): remote email images are blocked by most clients.
        logoUrl: "",
        logoAlt: t("logoAlt"),
        heading: t("heading"),
        intro: t("intro", { owner: ownerName }),
        cta: t("cta"),
        expiry: t("expiry", { days: INVITE_TTL_DAYS }),
        footer: t("footer"),
      }),
    });
    emailSent = true;
  } catch {
    // The invite row exists regardless; the owner can copy the returned acceptUrl manually.
    emailSent = false;
  }

  return NextResponse.json({ ok: true, acceptUrl, emailSent }, { status: 201 });
}
