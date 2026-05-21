import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { PasskeySignInForm } from "@/features/auth/ui/passkey-signin-form";
import { auth } from "@/server/auth/auth";
import { safeReturnTo } from "@/server/auth/return-to";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  const returnTo = safeReturnTo((await searchParams).returnTo);
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    redirect(returnTo ? `/${locale}${returnTo}` : "/unlock");
  }
  return (
    <PasskeySignInForm
      turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? null}
      returnTo={returnTo}
    />
  );
}
