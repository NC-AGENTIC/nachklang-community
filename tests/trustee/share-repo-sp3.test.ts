import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  shareUpdateMany: vi.fn(),
  shareFindFirst: vi.fn(),
  shareFindMany: vi.fn(),
  logCreate: vi.fn(),
  logFindMany: vi.fn(),
  vaultFindUnique: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    vaultShare: { updateMany: m.shareUpdateMany, findFirst: m.shareFindFirst, findMany: m.shareFindMany },
    shareAccessLog: { create: m.logCreate, findMany: m.logFindMany },
    vault: { findUnique: m.vaultFindUnique },
  },
}));

import {
  getActiveShareForTrustee,
  getVaultOwnerId,
  listAccessLog,
  listSharesForTrustee,
  logShareAccess,
  revokeShare,
  sealShare,
} from "@/server/trustee/share-repo";

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
});

describe("sealShare", () => {
  it("activates the share scoped to the owner's vault and stores the sealed blob", async () => {
    m.shareUpdateMany.mockResolvedValue({ count: 1 });
    const res = await sealShare({ shareId: "s1", ownerVaultId: "v1", sealedRootKey: "sealed-b64" });
    expect(res).toEqual({ ok: true });
    const arg = m.shareUpdateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "s1", vaultId: "v1", status: "pending_verify" });
    expect(arg.data).toEqual({ status: "active", sealedRootKey: "sealed-b64" });
  });

  it("returns not_found when no pending share matches the owner's vault", async () => {
    m.shareUpdateMany.mockResolvedValue({ count: 0 });
    expect(await sealShare({ shareId: "s1", ownerVaultId: "v1", sealedRootKey: "x" })).toEqual({
      error: "not_found",
    });
  });
});

describe("revokeShare", () => {
  it("revokes and wipes the sealed blob, scoped to the owner's vault", async () => {
    m.shareUpdateMany.mockResolvedValue({ count: 1 });
    const res = await revokeShare({ shareId: "s1", ownerVaultId: "v1" });
    expect(res).toEqual({ ok: true });
    const arg = m.shareUpdateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "s1", vaultId: "v1" });
    expect(arg.data).toEqual({ status: "revoked", sealedRootKey: null });
  });

  it("returns not_found when nothing matches", async () => {
    m.shareUpdateMany.mockResolvedValue({ count: 0 });
    expect(await revokeShare({ shareId: "s1", ownerVaultId: "v1" })).toEqual({ error: "not_found" });
  });
});

describe("getActiveShareForTrustee", () => {
  it("returns the active share id + sealed blob for the trustee", async () => {
    m.shareFindFirst.mockResolvedValue({ id: "s1", sealedRootKey: "sealed" });
    const res = await getActiveShareForTrustee("v1", "trustee1");
    expect(res).toEqual({ id: "s1", sealedRootKey: "sealed" });
    expect(m.shareFindFirst.mock.calls[0][0].where).toEqual({
      vaultId: "v1",
      trusteeUserId: "trustee1",
      status: "active",
    });
  });

  it("returns null for a non-active / non-trustee request", async () => {
    m.shareFindFirst.mockResolvedValue(null);
    expect(await getActiveShareForTrustee("v1", "nope")).toBeNull();
  });
});

describe("logShareAccess", () => {
  it("appends an access-log row", async () => {
    m.logCreate.mockResolvedValue({ id: "log1" });
    await logShareAccess({ shareId: "s1", trusteeUserId: "t1", ipAddress: "1.2.3.4", userAgent: "UA" });
    expect(m.logCreate.mock.calls[0][0].data).toEqual({
      shareId: "s1",
      trusteeUserId: "t1",
      ipAddress: "1.2.3.4",
      userAgent: "UA",
    });
  });
});

describe("listSharesForTrustee", () => {
  it("returns active shares for the trustee", async () => {
    m.shareFindMany.mockResolvedValue([{ vaultId: "v1" }]);
    const res = await listSharesForTrustee("t1");
    expect(res).toEqual([{ vaultId: "v1" }]);
    expect(m.shareFindMany.mock.calls[0][0].where).toEqual({ trusteeUserId: "t1", status: "active" });
  });
});

describe("getVaultOwnerId", () => {
  it("resolves the owner user id of a vault", async () => {
    m.vaultFindUnique.mockResolvedValue({ userId: "owner1" });
    expect(await getVaultOwnerId("v1")).toBe("owner1");
  });
  it("returns null for an unknown vault", async () => {
    m.vaultFindUnique.mockResolvedValue(null);
    expect(await getVaultOwnerId("v1")).toBeNull();
  });
});

describe("listAccessLog", () => {
  it("returns null when the share is not owned by the caller's vault", async () => {
    m.shareFindFirst.mockResolvedValue(null);
    expect(await listAccessLog("s1", "v1")).toBeNull();
    expect(m.logFindMany).not.toHaveBeenCalled();
  });

  it("returns access rows newest-first when the share is owned", async () => {
    m.shareFindFirst.mockResolvedValue({ id: "s1" });
    m.logFindMany.mockResolvedValue([{ accessedAt: new Date(), ipAddress: "1.2.3.4", userAgent: "UA" }]);
    const res = await listAccessLog("s1", "v1");
    expect(res).toHaveLength(1);
    expect(m.logFindMany.mock.calls[0][0]).toMatchObject({
      where: { shareId: "s1" },
      orderBy: { accessedAt: "desc" },
    });
  });
});
