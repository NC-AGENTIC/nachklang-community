import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/features/vault/ui/onboarding-wizard";
import { requireSession } from "@/server/auth/session";
import { findVaultByUser } from "@/server/vault/vault-repo";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireSession();
  const existing = await findVaultByUser(session.user.id);
  if (existing) {
    redirect("/vault");
  }
  return <OnboardingWizard email={session.user.email} />;
}
