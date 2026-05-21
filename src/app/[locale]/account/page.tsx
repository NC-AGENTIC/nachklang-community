import { redirect } from "next/navigation";

import { AccountSettingsView } from "@/features/account/ui/account-settings-view";
import { requireFullyAuthenticated } from "@/server/auth/session";
import { findVaultByUser } from "@/server/vault/vault-repo";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireFullyAuthenticated();
  // Vault owners manage account deletion (with the export-first gate) in /vault/settings; this
  // account page is the settings home for trustee-only members who have no vault.
  if (await findVaultByUser(session.user.id)) {
    redirect("/vault/settings");
  }
  return <AccountSettingsView />;
}
