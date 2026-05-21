import { VerifyEmailResult } from "@/features/auth/ui/verify-email-result";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <VerifyEmailResult token={params.token ?? ""} />;
}
