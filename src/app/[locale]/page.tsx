import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { LandingHero } from "@/features/marketing/ui/landing-hero";
import { auth } from "@/server/auth/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.emailVerified) {
    redirect("/vault");
  }
  return (
    <main className="landing">
      <LandingHero />
    </main>
  );
}
