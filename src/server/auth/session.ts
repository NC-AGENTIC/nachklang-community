import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";

export type AuthenticatedSession = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    twoFactorEnabled?: boolean;
    name?: string;
  };
  session: {
    id: string;
  };
};

export async function requireSession(): Promise<AuthenticatedSession> {
  const session = (await auth.api.getSession({ headers: await headers() })) as AuthenticatedSession | null;
  if (!session) {
    redirect("/signin");
  }
  return session;
}

export function requireEmailVerified(session: AuthenticatedSession): AuthenticatedSession {
  if (!session.user.emailVerified) {
    redirect("/signup");
  }
  return session;
}

export async function requirePasskeyRegistered(
  session: AuthenticatedSession,
): Promise<AuthenticatedSession> {
  const passkeys = await prisma.passkey.count({ where: { userId: session.user.id } });
  if (passkeys < 1) {
    redirect("/onboarding");
  }
  return session;
}

export async function requireFullyAuthenticated(): Promise<AuthenticatedSession> {
  const session = await requireSession();
  const verified = requireEmailVerified(session);
  return requirePasskeyRegistered(verified);
}
