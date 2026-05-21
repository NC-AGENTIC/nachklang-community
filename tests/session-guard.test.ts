import { describe, expect, it, vi } from "vitest";

const { getSession, passkeyCount } = vi.hoisted(() => ({
  getSession: vi.fn(),
  passkeyCount: vi.fn(),
}));

vi.mock("@/server/auth/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("@/server/db/prisma", () => ({ prisma: { passkey: { count: passkeyCount } } }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { requireFullyAuthenticated } from "@/server/auth/session";

describe("requireFullyAuthenticated", () => {
  it("passes when the user has >=1 passkey", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", emailVerified: true } });
    passkeyCount.mockResolvedValue(1);
    await expect(requireFullyAuthenticated()).resolves.toMatchObject({ user: { id: "u1" } });
  });
  it("rejects when no passkey is registered", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", emailVerified: true } });
    passkeyCount.mockResolvedValue(0);
    await expect(requireFullyAuthenticated()).rejects.toBeTruthy();
  });
});
