import { redirect } from "next/navigation";

import { VaultSettings } from "@/features/vault/ui/vault-settings";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { findVaultByUser, noVaultRedirect } from "@/server/vault/vault-repo";

export const dynamic = "force-dynamic";

export default async function VaultSettingsPage() {
  const session = await requireFullyAuthenticated();
  const row = await findVaultByUser(session.user.id);
  if (!row) {
    redirect(await noVaultRedirect(session.user.id));
  }
  const vaultAdmin = {
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.name ?? session.user.email,
    role: "admin" as const,
    status: "active" as const,
  };
  return <VaultSettings vaultAdmin={vaultAdmin} />;
}
