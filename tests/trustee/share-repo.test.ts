import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  inviteCreate: vi.fn(),
  inviteFindUnique: vi.fn(),
  inviteUpdate: vi.fn(),
  shareUpsert: vi.fn(),
  shareFindUnique: vi.fn(),
  shareFindMany: vi.fn(),
  vaultFindUnique: vi.fn(),
  keypairFindUnique: vi.fn(),
  progressUpsert: vi.fn(),
  progressFindMany: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    shareInvite: { create: m.inviteCreate, findUnique: m.inviteFindUnique, update: m.inviteUpdate },
    vaultShare: { upsert: m.shareUpsert, findUnique: m.shareFindUnique, findMany: m.shareFindMany },
    vault: { findUnique: m.vaultFindUnique },
    userKeypair: { findUnique: m.keypairFindUnique },
    shareItemProgress: { upsert: m.progressUpsert, findMany: m.progressFindMany },
  },
}));

import {
  acceptInvite,
  createInvite,
  getInvitePreview,
  getOwnerVaultId,
  getUserPublicKey,
  listItemProgressForTrustee,
  listSharesForVault,
  upsertItemProgress,
} from "@/server/trustee/share-repo";

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
});

describe("createInvite", () => {
  it("persists a token + future expiry and returns them", async () => {
    m.inviteCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "inv1",
      ...data,
    }));
    const res = await createInvite({ vaultId: "v1", inviteeEmail: "t@e.test", label: "Sis" });
    expect(res.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(res.expiresAt.getTime()).toBeGreaterThan(Date.now());
    const created = m.inviteCreate.mock.calls[0][0].data;
    expect(created).toMatchObject({ vaultId: "v1", inviteeEmail: "t@e.test", label: "Sis", status: "invited" });
  });
});

describe("acceptInvite", () => {
  const base = {
    token: "tok",
    trusteeUserId: "trustee1",
    trusteeEmail: "trustee@e.test",
    trusteePublicKey: "pubkey-b64",
    trusteeFingerprint: "0421-9837-1056",
  };

  it("returns not_found when the token is unknown", async () => {
    m.inviteFindUnique.mockResolvedValue(null);
    expect(await acceptInvite(base)).toEqual({ error: "not_found" });
    expect(m.shareUpsert).not.toHaveBeenCalled();
  });

  it("returns not_acceptable for an expired invite", async () => {
    m.inviteFindUnique.mockResolvedValue({
      id: "inv1",
      vaultId: "v1",
      label: "Sis",
      status: "invited",
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await acceptInvite(base)).toEqual({ error: "not_acceptable" });
    expect(m.shareUpsert).not.toHaveBeenCalled();
  });

  it("rejects acceptance when the caller's email does not match the invited email", async () => {
    m.inviteFindUnique.mockResolvedValue({
      id: "inv1",
      vaultId: "v1",
      label: "Sis",
      inviteeEmail: "trustee@e.test",
      status: "invited",
      expiresAt: new Date(Date.now() + 100000),
    });
    m.shareFindUnique.mockResolvedValue(null);
    m.shareUpsert.mockResolvedValue({ id: "share1", status: "pending_verify" });
    const res = await acceptInvite({ ...base, trusteeEmail: "attacker@e.test" });
    expect(res).toEqual({ error: "email_mismatch" });
    expect(m.shareUpsert).not.toHaveBeenCalled();
    expect(m.inviteUpdate).not.toHaveBeenCalled();
  });

  it("matches the invited email case-insensitively", async () => {
    m.inviteFindUnique.mockResolvedValue({
      id: "inv1",
      vaultId: "v1",
      label: "Sis",
      inviteeEmail: "trustee@e.test",
      status: "invited",
      expiresAt: new Date(Date.now() + 100000),
    });
    m.shareFindUnique.mockResolvedValue(null);
    m.shareUpsert.mockResolvedValue({ id: "share1", status: "pending_verify" });
    const res = await acceptInvite({ ...base, trusteeEmail: "Trustee@E.TEST" });
    expect(res).toEqual({ shareId: "share1", status: "pending_verify" });
  });

  it("creates a pending_verify share binding the trustee key + fingerprint and marks the invite accepted", async () => {
    m.inviteFindUnique.mockResolvedValue({
      id: "inv1",
      vaultId: "v1",
      label: "Sis",
      inviteeEmail: "trustee@e.test",
      status: "invited",
      expiresAt: new Date(Date.now() + 100000),
    });
    m.shareFindUnique.mockResolvedValue(null);
    m.shareUpsert.mockResolvedValue({ id: "share1", status: "pending_verify" });
    const res = await acceptInvite(base);
    expect(res).toEqual({ shareId: "share1", status: "pending_verify" });

    const upsertArg = m.shareUpsert.mock.calls[0][0];
    expect(upsertArg.where).toEqual({ vaultId_trusteeUserId: { vaultId: "v1", trusteeUserId: "trustee1" } });
    expect(upsertArg.create).toMatchObject({
      vaultId: "v1",
      trusteeUserId: "trustee1",
      label: "Sis",
      status: "pending_verify",
      trusteePublicKey: "pubkey-b64",
      trusteeFingerprint: "0421-9837-1056",
    });
    // Re-accepting must invalidate any previous seal.
    expect(upsertArg.update).toMatchObject({ status: "pending_verify", sealedRootKey: null });
    expect(m.inviteUpdate).toHaveBeenCalledWith({ where: { id: "inv1" }, data: { status: "accepted" } });
  });

  it("re-opening an accepted invite with the SAME key is idempotent and preserves an active seal", async () => {
    // The link stays valid 14 days. A returning trustee who already accepted must NOT have their
    // active grant wiped: no upsert, no seal reset — just return the current share state.
    m.inviteFindUnique.mockResolvedValue({
      id: "inv1",
      vaultId: "v1",
      label: "Sis",
      inviteeEmail: "trustee@e.test",
      status: "accepted",
      expiresAt: new Date(Date.now() + 100000),
    });
    m.shareFindUnique.mockResolvedValue({
      id: "share1",
      status: "active",
      trusteePublicKey: "pubkey-b64",
    });
    const res = await acceptInvite(base);
    expect(res).toEqual({ shareId: "share1", status: "active" });
    expect(m.shareUpsert).not.toHaveBeenCalled();
    expect(m.inviteUpdate).not.toHaveBeenCalled();
  });

  it("rebinds and wipes the seal when re-accepted with a DIFFERENT public key (key rotation)", async () => {
    m.inviteFindUnique.mockResolvedValue({
      id: "inv1",
      vaultId: "v1",
      label: "Sis",
      inviteeEmail: "trustee@e.test",
      status: "accepted",
      expiresAt: new Date(Date.now() + 100000),
    });
    m.shareFindUnique.mockResolvedValue({
      id: "share1",
      status: "active",
      trusteePublicKey: "OLD-different-key",
    });
    m.shareUpsert.mockResolvedValue({ id: "share1", status: "pending_verify" });
    const res = await acceptInvite(base);
    expect(res).toEqual({ shareId: "share1", status: "pending_verify" });
    const upsertArg = m.shareUpsert.mock.calls[0][0];
    expect(upsertArg.update).toMatchObject({
      status: "pending_verify",
      sealedRootKey: null,
      trusteePublicKey: "pubkey-b64",
    });
  });
});

describe("listSharesForVault", () => {
  it("returns shares ordered for the owner view", async () => {
    m.shareFindMany.mockResolvedValue([{ id: "s1" }]);
    const res = await listSharesForVault("v1");
    expect(res).toEqual([{ id: "s1" }]);
    expect(m.shareFindMany.mock.calls[0][0].where).toEqual({ vaultId: "v1" });
  });
});

describe("getOwnerVaultId", () => {
  it("returns the caller's vaultId", async () => {
    m.vaultFindUnique.mockResolvedValue({ vaultId: "v1" });
    expect(await getOwnerVaultId("owner1")).toBe("v1");
  });
  it("returns null when the caller has no vault", async () => {
    m.vaultFindUnique.mockResolvedValue(null);
    expect(await getOwnerVaultId("owner1")).toBeNull();
  });
});

describe("item progress", () => {
  it("upserts a trustee's per-item status blob keyed on (vault,item,trustee)", async () => {
    m.progressUpsert.mockResolvedValue({});
    await upsertItemProgress({
      vaultId: "v1",
      itemId: "i1",
      trusteeUserId: "t1",
      nonceBase64: "n",
      ciphertextBase64: "c",
    });
    const arg = m.progressUpsert.mock.calls[0][0];
    expect(arg.where).toEqual({
      vaultId_itemId_trusteeUserId: { vaultId: "v1", itemId: "i1", trusteeUserId: "t1" },
    });
    expect(arg.create).toMatchObject({ vaultId: "v1", itemId: "i1", trusteeUserId: "t1", nonceBase64: "n", ciphertextBase64: "c" });
    expect(arg.update).toMatchObject({ nonceBase64: "n", ciphertextBase64: "c" });
  });

  it("lists a trustee's progress rows for a vault", async () => {
    m.progressFindMany.mockResolvedValue([{ itemId: "i1", nonceBase64: "n", ciphertextBase64: "c", updatedAt: new Date() }]);
    const rows = await listItemProgressForTrustee("v1", "t1");
    expect(rows).toHaveLength(1);
    expect(m.progressFindMany.mock.calls[0][0].where).toEqual({ vaultId: "v1", trusteeUserId: "t1" });
  });
});

describe("getUserPublicKey", () => {
  it("returns the caller's keypair public key", async () => {
    m.keypairFindUnique.mockResolvedValue({ publicKey: "pub-b64" });
    expect(await getUserPublicKey("u1")).toBe("pub-b64");
  });
  it("returns null when the caller has no keypair", async () => {
    m.keypairFindUnique.mockResolvedValue(null);
    expect(await getUserPublicKey("u1")).toBeNull();
  });
});

describe("getInvitePreview", () => {
  it("returns trustee-safe fields + owner display name, never internal ids", async () => {
    m.inviteFindUnique.mockResolvedValue({
      inviteeEmail: "t@e.test",
      label: "Sis",
      status: "invited",
      expiresAt: new Date(Date.now() + 100000),
      vault: { user: { name: "Maria", email: "maria@e.test" } },
    });
    const preview = await getInvitePreview("tok");
    expect(preview).toEqual({
      inviteeEmail: "t@e.test",
      status: "invited",
      acceptable: true,
      ownerName: "Maria",
    });
  });

  it("returns null for an unknown token", async () => {
    m.inviteFindUnique.mockResolvedValue(null);
    expect(await getInvitePreview("tok")).toBeNull();
  });

  it("marks an expired invite as not acceptable", async () => {
    m.inviteFindUnique.mockResolvedValue({
      inviteeEmail: "t@e.test",
      label: "Sis",
      status: "invited",
      expiresAt: new Date(Date.now() - 1000),
      vault: { user: { name: "Maria", email: "maria@e.test" } },
    });
    const preview = await getInvitePreview("tok");
    expect(preview?.acceptable).toBe(false);
  });
});
