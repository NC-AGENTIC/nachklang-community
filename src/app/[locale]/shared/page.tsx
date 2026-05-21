import { SharedWithMeList } from "@/features/trustee/ui/shared-with-me-list";
import { requireFullyAuthenticated } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function SharedWithMePage() {
  await requireFullyAuthenticated();
  return <SharedWithMeList />;
}
