import { SharedVaultView } from "@/features/trustee/ui/shared-vault-view";
import { requireFullyAuthenticated } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function SharedVaultPage({
  params,
}: {
  params: Promise<{ locale: string; vaultId: string }>;
}) {
  await requireFullyAuthenticated();
  const { vaultId } = await params;
  return <SharedVaultView vaultId={vaultId} />;
}
