import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { requireFullyAuthenticated } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { pickLocaleFromRequest } from "@/server/i18n/pick-locale";
import { getMailTransport } from "@/server/mail/transport";
import { getOwnerVaultId, listTrusteeEmailsForOwnerVault } from "@/server/trustee/share-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Permanent, irreversible account deletion. Notifies any invited trustees that their access is
// ending, then hard-deletes the user — Prisma cascades remove the vault, items, shares, invites,
// keypair, passkeys and sessions, and the DB audit triggers record every deletion.
export async function DELETE(request: Request): Promise<Response> {
  const session = await requireFullyAuthenticated();
  const userId = session.user.id;

  const vaultId = await getOwnerVaultId(userId);
  if (vaultId) {
    const recipients = await listTrusteeEmailsForOwnerVault(vaultId);
    if (recipients.length > 0) {
      const locale = pickLocaleFromRequest(request);
      const t = await getTranslations({ locale, namespace: "email.offboarding" });
      const ownerName = session.user.name || session.user.email;
      const html = `<p>${t("intro", { owner: ownerName })}</p><p>${t("body")}</p><p>${t("footer")}</p>`;
      await Promise.all(
        recipients.map((to) =>
          getMailTransport()
            .send({ to, subject: t("subject", { owner: ownerName }), html })
            .catch(() => {}),
        ),
      );
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  return new NextResponse(null, { status: 204 });
}
