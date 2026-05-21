import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EmailOtpSignup } from "@/features/auth/ui/email-otp-signup";
import { auth } from "@/server/auth/auth";
import { safeReturnTo } from "@/server/auth/return-to";
import { findVaultByUser } from "@/server/vault/vault-repo";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  const returnTo = safeReturnTo((await searchParams).returnTo);
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    if (returnTo) redirect(`/${locale}${returnTo}`);
    const existing = await findVaultByUser(session.user.id);
    redirect(existing ? "/vault" : "/onboarding");
  }
  return (
    <EmailOtpSignup turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? null} returnTo={returnTo} />
  );
}
