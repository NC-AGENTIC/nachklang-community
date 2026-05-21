import { redirect } from "next/navigation";

import { VaultWorkspace } from "@/features/vault/ui/vault-workspace";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { findVaultByUser, noVaultRedirect } from "@/server/vault/vault-repo";
import type { VaultMember } from "@/features/vault/domain/vault-permissions";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const session = await requireFullyAuthenticated();
  const row = await findVaultByUser(session.user.id);
  if (!row) {
    redirect(await noVaultRedirect(session.user.id));
  }
  const vaultAdmin: VaultMember = {
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.name ?? session.user.email,
    role: "admin",
    status: "active",
  };
  return <VaultWorkspace vaultAdmin={vaultAdmin} />;
}
