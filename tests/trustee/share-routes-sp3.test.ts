import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  getOwnerVaultId: vi.fn(),
  sealShare: vi.fn(),
  revokeShare: vi.fn(),
  purgeShare: vi.fn(),
  getActiveShareForTrustee: vi.fn(),
  getVaultOwnerId: vi.fn(),
  getVaultOwnerName: vi.fn(),
  logShareAccess: vi.fn(),
  listSharesForTrustee: vi.fn(),
  listAccessLog: vi.fn(),
  listItemProgressForTrustee: vi.fn(),
}));
const items = vi.hoisted(() => ({ listItems: vi.fn() }));

vi.mock("@/server/trustee/share-repo", () => repo);
vi.mock("@/server/vault/vault-item-repo", () => items);
vi.mock("@/server/audit/audit-repo", () => ({ recordAuditEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/auth/session", () => ({
  requireFullyAuthenticated: vi.fn(async () => ({ user: { id: "u1", email: "u@e.test", name: "U" } })),
}));

import { POST as sealPost } from "@/app/api/shares/[id]/seal/route";
import { DELETE as shareDelete } from "@/app/api/shares/[id]/route";
import { GET as accessLogGet } from "@/app/api/shares/[id]/access-log/route";
import { GET as sharedGet } from "@/app/api/shared/[vaultId]/route";
import { GET as sharedListGet } from "@/app/api/shared/route";

beforeEach(() => {
  for (const fn of Object.values(repo)) fn.mockReset();
  items.listItems.mockReset();
});

function sealReq(body: unknown): Request {
  return new Request("http://localhost/api/shares/s1/seal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/shares/[id]/seal", () => {
  it("stores the owner-computed sealed Root Key and activates the share", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.sealShare.mockResolvedValue({ ok: true });
    const res = await sealPost(sealReq({ sealedRootKey: "sealed-b64" }), {
      params: Promise.resolve({ id: "s1" }),
    });
    expect(res.status).toBe(200);
    expect(repo.sealShare).toHaveBeenCalledWith({
      shareId: "s1",
      ownerVaultId: "v1",
      sealedRootKey: "sealed-b64",
    });
  });

  it("rejects an empty body", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    const res = await sealPost(sealReq({}), { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(400);
    expect(repo.sealShare).not.toHaveBeenCalled();
  });

  it("404s when the share is not a pending share of the owner's vault", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.sealShare.mockResolvedValue({ error: "not_found" });
    const res = await sealPost(sealReq({ sealedRootKey: "x" }), {
      params: Promise.resolve({ id: "s1" }),
    });
    expect(res.status).toBe(404);
  });

  it("404s when the caller has no vault", async () => {
    repo.getOwnerVaultId.mockResolvedValue(null);
    const res = await sealPost(sealReq({ sealedRootKey: "x" }), {
      params: Promise.resolve({ id: "s1" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/shares/[id]", () => {
  it("revokes the share and returns 204", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.revokeShare.mockResolvedValue({ ok: true });
    const res = await shareDelete(new Request("http://localhost/api/shares/s1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "s1" }),
    });
    expect(res.status).toBe(204);
    expect(repo.revokeShare).toHaveBeenCalledWith({ shareId: "s1", ownerVaultId: "v1" });
  });

  it("404s when nothing matches", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.revokeShare.mockResolvedValue({ error: "not_found" });
    const res = await shareDelete(new Request("http://localhost/api/shares/s1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "s1" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/shared/[vaultId]", () => {
  it("403s a non-active / non-trustee requester and writes no log", async () => {
    repo.getActiveShareForTrustee.mockResolvedValue(null);
    const res = await sharedGet(new Request("http://localhost/api/shared/v1"), {
      params: Promise.resolve({ vaultId: "v1" }),
    });
    expect(res.status).toBe(403);
    expect(repo.logShareAccess).not.toHaveBeenCalled();
    expect(items.listItems).not.toHaveBeenCalled();
  });

  it("returns owner ciphertext + sealed key and writes one access-log row", async () => {
    repo.getActiveShareForTrustee.mockResolvedValue({ id: "s1", sealedRootKey: "sealed-b64" });
    repo.getVaultOwnerId.mockResolvedValue("owner1");
    items.listItems.mockResolvedValue([
      {
        itemId: "i1",
        ownerId: "owner1",
        revision: 2,
        algorithm: "aes-256-gcm",
        nonceBase64: "n",
        ciphertextBase64: "c",
        associatedData: { type: "vault-entry", version: 1, vaultId: "v1", itemId: "i1", ownerId: "owner1", revision: 2 },
        createdAt: new Date("2026-05-21T10:00:00Z"),
        updatedAt: new Date("2026-05-21T10:00:00Z"),
      },
    ]);
    repo.listItemProgressForTrustee.mockResolvedValue([]);
    repo.logShareAccess.mockResolvedValue(undefined);

    const res = await sharedGet(new Request("http://localhost/api/shared/v1", { headers: { "user-agent": "UA" } }), {
      params: Promise.resolve({ vaultId: "v1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vaultId).toBe("v1");
    expect(body.ownerId).toBe("owner1");
    expect(body.sealedRootKey).toBe("sealed-b64");
    expect(body.items).toHaveLength(1);
    expect(body.items[0].itemId).toBe("i1");
    expect(repo.logShareAccess).toHaveBeenCalledTimes(1);
    expect(repo.logShareAccess.mock.calls[0][0]).toMatchObject({ shareId: "s1", trusteeUserId: "u1" });
  });
});

describe("GET /api/shared (trustee list)", () => {
  it("lists vaults shared with the trustee", async () => {
    repo.listSharesForTrustee.mockResolvedValue([
      { vaultId: "v1", label: "Sis", vault: { user: { name: "Maria", email: "maria@e.test" } } },
    ]);
    const res = await sharedListGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shares).toEqual([{ vaultId: "v1", ownerName: "Maria" }]);
  });
});

describe("GET /api/shares/[id]/access-log", () => {
  it("returns access entries for an owned share", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.listAccessLog.mockResolvedValue([
      { accessedAt: new Date("2026-05-22T08:00:00Z"), ipAddress: "1.2.3.4", userAgent: "UA" },
    ]);
    const res = await accessLogGet(new Request("http://localhost/api/shares/s1/access-log"), {
      params: Promise.resolve({ id: "s1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries[0].accessedAt).toBe("2026-05-22T08:00:00.000Z");
  });

  it("404s when the share is not owned by the caller", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.listAccessLog.mockResolvedValue(null);
    const res = await accessLogGet(new Request("http://localhost/api/shares/s1/access-log"), {
      params: Promise.resolve({ id: "s1" }),
    });
    expect(res.status).toBe(404);
  });
});
