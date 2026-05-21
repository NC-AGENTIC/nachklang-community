import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export type VaultRow = {
  vaultId: string;
  kdfPolicy: Prisma.JsonValue;
  recoveryWrappedRootKey: Prisma.JsonValue | null;
};

export async function findVaultByUser(userId: string): Promise<VaultRow | null> {
  const row = await prisma.vault.findUnique({
    where: { userId },
    select: {
      vaultId: true,
      kdfPolicy: true,
      recoveryWrappedRootKey: true,
    },
  });
  return row ?? null;
}

// True for trustee-only accounts (a sharing keypair but no personal vault) and for vault owners.
export async function userHasKeypair(userId: string): Promise<boolean> {
  const row = await prisma.userKeypair.findUnique({ where: { userId }, select: { id: true } });
  return row !== null;
}

// Where to send an account that has no personal vault: trustees go to the shared view; a
// brand-new account with neither vault nor keypair goes to vault onboarding.
export async function noVaultRedirect(userId: string): Promise<"/shared" | "/onboarding"> {
  return (await userHasKeypair(userId)) ? "/shared" : "/onboarding";
}
