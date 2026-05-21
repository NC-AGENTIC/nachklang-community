import { redirect } from "next/navigation";

import { UnlockForm } from "@/features/vault/ui/unlock-form";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { noVaultRedirect } from "@/server/vault/vault-repo";

export const dynamic = "force-dynamic";

export default async function UnlockPage() {
  const session = await requireFullyAuthenticated();
  const row = await prisma.vault.findUnique({
    where: { userId: session.user.id },
    select: { vaultId: true, kdfPolicy: true, recoveryWrappedRootKey: true },
  });
  if (!row) {
    redirect(await noVaultRedirect(session.user.id));
  }
  const passkeyKeys = await prisma.vaultPasskeyKey.findMany({
    where: { vaultId: row.vaultId },
    select: { credentialID: true, wrapped: true },
  });
  return (
    <UnlockForm
      vault={{
        vaultId: row.vaultId,
        // Prisma returns JsonValue; the server wrote these via the typed schemas at create time, so the cast is safe.
        kdfPolicy: row.kdfPolicy as never,
        prfWrappedRootKeys: passkeyKeys.map((k) => ({
          credentialID: k.credentialID,
          wrapped: k.wrapped as never,
        })),
        recoveryWrappedRootKey: (row.recoveryWrappedRootKey ?? null) as never,
      }}
    />
  );
}
