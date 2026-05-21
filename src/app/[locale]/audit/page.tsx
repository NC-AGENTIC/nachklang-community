import { AuditLog } from "@/features/audit/ui/audit-log";
import { requireFullyAuthenticated } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireFullyAuthenticated();
  return <AuditLog />;
}
