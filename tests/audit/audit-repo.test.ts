import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    auditEvent: { create: m.create, findMany: m.findMany },
    user: { findMany: m.userFindMany },
  },
}));

import { listAuditForUser, recordAuditEvent } from "@/server/audit/audit-repo";

beforeEach(() => {
  m.create.mockReset();
  m.findMany.mockReset();
  m.userFindMany.mockReset();
  m.userFindMany.mockResolvedValue([]);
});

describe("recordAuditEvent", () => {
  it("defaults source=app, actor=user and persists the action", async () => {
    m.create.mockResolvedValue({});
    await recordAuditEvent({ action: "share.invited", actorUserId: "owner1", targetUserId: "owner1" });
    const data = m.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      source: "app",
      actor: "user",
      action: "share.invited",
      actorUserId: "owner1",
      targetUserId: "owner1",
    });
  });
});

describe("listAuditForUser", () => {
  it("returns events affecting the user (target id or email), newest first", async () => {
    m.findMany.mockResolvedValue([
      { id: "e1", occurredAt: new Date("2026-05-21T10:00:00Z"), source: "db", actor: "system", action: "user.delete", vaultId: null, metadata: null },
    ]);
    const rows = await listAuditForUser("u1", "u1@e.test");
    expect(rows[0]).toMatchObject({ id: "e1", action: "user.delete", actor: "system" });
    const where = m.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ targetUserId: "u1" }, { targetEmail: "u1@e.test" }]);
    expect(m.findMany.mock.calls[0][0].orderBy).toEqual({ occurredAt: "desc" });
  });

  it("omits the email clause when the user has no email", async () => {
    m.findMany.mockResolvedValue([]);
    await listAuditForUser("u1", null);
    const where = m.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ targetUserId: "u1" }]);
  });

  it("resolves the actor name for OTHER actors but never for the viewer (no extra PII stored)", async () => {
    m.findMany.mockResolvedValue([
      { id: "e1", occurredAt: new Date(), source: "app", actor: "user", action: "vault.read", vaultId: "v1", metadata: null, actorUserId: "trustee1" },
      { id: "e2", occurredAt: new Date(), source: "app", actor: "user", action: "share.invited", vaultId: "v1", metadata: null, actorUserId: "owner1" },
    ]);
    m.userFindMany.mockResolvedValue([{ id: "trustee1", name: "Ingrid" }]);
    const rows = await listAuditForUser("owner1", "owner@e.test");
    // only the OTHER actor's id is looked up — never the viewer's own
    expect(m.userFindMany.mock.calls[0][0].where).toEqual({ id: { in: ["trustee1"] } });
    expect(rows.find((r) => r.id === "e1")?.actorName).toBe("Ingrid");
    expect(rows.find((r) => r.id === "e2")?.actorName).toBeNull();
  });
});
