import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: { passkey: { count: vi.fn() } },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

const redirectCalls: string[] = [];
vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    redirectCalls.push(target);
    throw new Error(`__redirect__:${target}`);
  },
}));

async function expectRedirect(fn: () => Promise<unknown>, to: string) {
  redirectCalls.length = 0;
  await expect(fn()).rejects.toThrow(`__redirect__:${to}`);
  expect(redirectCalls).toEqual([to]);
}

describe("session helpers", () => {
  it("requireSession redirects to /signin when no session exists", async () => {
    const { auth } = await import("@/server/auth/auth");
    (auth.api.getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const { requireSession } = await import("@/server/auth/session");
    await expectRedirect(() => requireSession(), "/signin");
  });

  it("requireEmailVerified redirects to /signup when emailVerified is false", async () => {
    const { auth } = await import("@/server/auth/auth");
    (auth.api.getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "u1", email: "a@b.c", emailVerified: false },
      session: { id: "s1" },
    });
    const { requireEmailVerified, requireSession } = await import("@/server/auth/session");
    const session = await requireSession();
    await expectRedirect(async () => requireEmailVerified(session), "/signup");
  });

  it("requireFullyAuthenticated redirects to /onboarding when no passkey is registered", async () => {
    const { auth } = await import("@/server/auth/auth");
    (auth.api.getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "u1", email: "a@b.c", emailVerified: true },
      session: { id: "s1" },
    });
    const { prisma } = await import("@/server/db/prisma");
    (prisma.passkey.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);
    const { requireFullyAuthenticated } = await import("@/server/auth/session");
    await expectRedirect(() => requireFullyAuthenticated(), "/onboarding");
  });

  it("requireFullyAuthenticated lets through a verified session with a passkey", async () => {
    const { auth } = await import("@/server/auth/auth");
    (auth.api.getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "u1", email: "a@b.c", emailVerified: true },
      session: { id: "s1" },
    });
    const { prisma } = await import("@/server/db/prisma");
    (prisma.passkey.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);
    const { requireFullyAuthenticated } = await import("@/server/auth/session");
    const session = await requireFullyAuthenticated();
    expect(session.user.id).toBe("u1");
  });
});
