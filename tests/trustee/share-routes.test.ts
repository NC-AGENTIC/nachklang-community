import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateTrusteeKeypair,
  publicKeyToBase64,
  fingerprintPublicKey,
  publicKeyFromBase64,
} from "@/features/trustee/crypto/trustee-keypair";

const repo = vi.hoisted(() => ({
  getOwnerVaultId: vi.fn(),
  createInvite: vi.fn(),
  getInvitePreview: vi.fn(),
  getUserPublicKey: vi.fn(),
  acceptInvite: vi.fn(),
  listSharesForVault: vi.fn(),
}));
const mail = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@/server/trustee/share-repo", () => repo);
vi.mock("@/server/audit/audit-repo", () => ({ recordAuditEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/auth/session", () => ({
  requireFullyAuthenticated: vi.fn(async () => ({
    user: { id: "owner1", email: "owner@e.test", name: "Maria" },
  })),
}));
vi.mock("@/server/mail/transport", () => ({ getMailTransport: () => mail }));
vi.mock("@/server/i18n/pick-locale", () => ({ pickLocaleFromRequest: () => "de" }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

import { POST as invitePost } from "@/app/api/shares/invite/route";
import { GET as inviteGet } from "@/app/api/shares/invite/[token]/route";
import { POST as acceptPost } from "@/app/api/shares/invite/[token]/accept/route";
import { GET as sharesGet } from "@/app/api/shares/route";

beforeEach(() => {
  for (const fn of Object.values(repo)) fn.mockReset();
  mail.send.mockReset();
});

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/shares/invite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/shares/invite", () => {
  it("creates an invite, emails the trustee, and returns a locale-scoped accept URL", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.createInvite.mockResolvedValue({ id: "inv1", token: "TOK123", expiresAt: new Date() });
    mail.send.mockResolvedValue(undefined);

    const res = await invitePost(jsonReq({ inviteeEmail: "trustee@e.test", label: "Sis" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.acceptUrl).toMatch(/\/de\/shares\/accept\/TOK123$/);
    expect(body.emailSent).toBe(true);
    expect(repo.createInvite).toHaveBeenCalledWith({
      vaultId: "v1",
      inviteeEmail: "trustee@e.test",
      label: "Sis",
    });
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][0].to).toBe("trustee@e.test");
  });

  it("returns 404 when the owner has not onboarded a vault", async () => {
    repo.getOwnerVaultId.mockResolvedValue(null);
    const res = await invitePost(jsonReq({ inviteeEmail: "t@e.test", label: "X" }));
    expect(res.status).toBe(404);
    expect(repo.createInvite).not.toHaveBeenCalled();
  });

  it("returns 400 on a malformed body", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    const res = await invitePost(jsonReq({ inviteeEmail: "not-an-email", label: "" }));
    expect(res.status).toBe(400);
  });

  it("still returns 201 with emailSent=false if the mail send fails (link is the fallback)", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.createInvite.mockResolvedValue({ id: "inv1", token: "TOK123", expiresAt: new Date() });
    mail.send.mockRejectedValue(new Error("smtp down"));
    const res = await invitePost(jsonReq({ inviteeEmail: "t@e.test", label: "X" }));
    expect(res.status).toBe(201);
    expect((await res.json()).emailSent).toBe(false);
  });
});

describe("GET /api/shares/invite/[token]", () => {
  it("returns the trustee-safe preview", async () => {
    repo.getInvitePreview.mockResolvedValue({
      inviteeEmail: "t@e.test",
      status: "invited",
      acceptable: true,
      ownerName: "Maria",
    });
    const res = await inviteGet(new Request("http://localhost/api/shares/invite/TOK"), {
      params: Promise.resolve({ token: "TOK" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      inviteeEmail: "t@e.test",
      status: "invited",
      acceptable: true,
      ownerName: "Maria",
    });
  });

  it("returns 404 for an unknown token", async () => {
    repo.getInvitePreview.mockResolvedValue(null);
    const res = await inviteGet(new Request("http://localhost/api/shares/invite/NOPE"), {
      params: Promise.resolve({ token: "NOPE" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/shares/invite/[token]/accept", () => {
  function acceptReq(): Request {
    return new Request("http://localhost/api/shares/invite/TOK/accept", { method: "POST" });
  }

  it("returns 409 no_keypair when the trustee has no keypair yet", async () => {
    repo.getUserPublicKey.mockResolvedValue(null);
    const res = await acceptPost(acceptReq(), { params: Promise.resolve({ token: "TOK" }) });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("no_keypair");
    expect(repo.acceptInvite).not.toHaveBeenCalled();
  });

  it("binds the trustee public key with a server-computed fingerprint and returns it", async () => {
    const kp = await generateTrusteeKeypair();
    const pub = publicKeyToBase64(kp.publicKey);
    const expectedFp = await fingerprintPublicKey(publicKeyFromBase64(pub));
    repo.getUserPublicKey.mockResolvedValue(pub);
    repo.acceptInvite.mockResolvedValue({ shareId: "share1", status: "pending_verify" });

    const res = await acceptPost(acceptReq(), { params: Promise.resolve({ token: "TOK" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ shareId: "share1", status: "pending_verify", fingerprint: expectedFp });
    expect(repo.acceptInvite).toHaveBeenCalledWith({
      token: "TOK",
      trusteeUserId: "owner1",
      trusteeEmail: "owner@e.test",
      trusteePublicKey: pub,
      trusteeFingerprint: expectedFp,
    });
  });

  it("returns 403 when the caller's email does not match the invited email", async () => {
    const pub = publicKeyToBase64((await generateTrusteeKeypair()).publicKey);
    repo.getUserPublicKey.mockResolvedValue(pub);
    repo.acceptInvite.mockResolvedValue({ error: "email_mismatch" });
    const res = await acceptPost(acceptReq(), { params: Promise.resolve({ token: "TOK" }) });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("email_mismatch");
  });

  it("returns 404 when the invite token is unknown", async () => {
    const pub = publicKeyToBase64((await generateTrusteeKeypair()).publicKey);
    repo.getUserPublicKey.mockResolvedValue(pub);
    repo.acceptInvite.mockResolvedValue({ error: "not_found" });
    const res = await acceptPost(acceptReq(), { params: Promise.resolve({ token: "TOK" }) });
    expect(res.status).toBe(404);
  });

  it("returns 409 when the invite is expired or already used", async () => {
    const pub = publicKeyToBase64((await generateTrusteeKeypair()).publicKey);
    repo.getUserPublicKey.mockResolvedValue(pub);
    repo.acceptInvite.mockResolvedValue({ error: "not_acceptable" });
    const res = await acceptPost(acceptReq(), { params: Promise.resolve({ token: "TOK" }) });
    expect(res.status).toBe(409);
  });
});

describe("GET /api/shares", () => {
  it("returns the owner's trustees with SAS material, omitting sealedRootKey", async () => {
    repo.getOwnerVaultId.mockResolvedValue("v1");
    repo.listSharesForVault.mockResolvedValue([
      {
        id: "s1",
        label: "Sis",
        status: "active",
        trusteePublicKey: "pub-b64",
        trusteeFingerprint: "0421-9837-1056",
        sealedRootKey: "should-not-leak",
        createdAt: new Date("2026-05-21T10:00:00Z"),
        accessLogs: [{ accessedAt: new Date("2026-05-22T08:00:00Z") }],
        _count: { accessLogs: 3 },
      },
    ]);
    const res = await sharesGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shares).toHaveLength(1);
    expect(body.shares[0]).toEqual({
      id: "s1",
      label: "Sis",
      status: "active",
      trusteePublicKey: "pub-b64",
      fingerprint: "0421-9837-1056",
      createdAt: "2026-05-21T10:00:00.000Z",
      lastAccessedAt: "2026-05-22T08:00:00.000Z",
      accessCount: 3,
    });
    expect(JSON.stringify(body)).not.toContain("should-not-leak");
  });

  it("returns 404 when the owner has no vault", async () => {
    repo.getOwnerVaultId.mockResolvedValue(null);
    const res = await sharesGet();
    expect(res.status).toBe(404);
  });
});
