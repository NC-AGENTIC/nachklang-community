import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export type AuditActor = "user" | "system";

// Write an application-level audit event (rich, semantic). Database-level deletes are captured
// separately by triggers (see the progress_and_audit migration). Call sites should treat this as
// best-effort (`.catch(() => {})`) so auditing never breaks the underlying operation.
export async function recordAuditEvent(input: {
  action: string;
  actor?: AuditActor;
  source?: "app" | "db";
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  vaultId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      source: input.source ?? "app",
      actor: input.actor ?? "user",
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetUserId: input.targetUserId ?? null,
      targetEmail: input.targetEmail ?? null,
      vaultId: input.vaultId ?? null,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
  });
}

export type AuditEventView = {
  id: string;
  occurredAt: string;
  source: string;
  actor: string;
  action: string;
  vaultId: string | null;
  metadata: unknown;
  // Resolved at read-time from actorUserId (NOT stored in the audit row), so no extra PII is
  // persisted and the name disappears once the actor account is deleted.
  actorName: string | null;
};

// Everything in the signed-in user's transparency log: every event is recorded against the
// AFFECTED user (targetUserId / targetEmail), so the log reads from one consistent perspective and
// a trustee never sees owner-perspective lines. Audit rows are FK-free, so they survive even after
// the referenced data is deleted — which is the whole point of the transparency log.
export async function listAuditForUser(
  userId: string,
  email: string | null,
  limit = 200,
): Promise<AuditEventView[]> {
  const rows = await prisma.auditEvent.findMany({
    where: {
      OR: [{ targetUserId: userId }, ...(email ? [{ targetEmail: email }] : [])],
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  // Resolve actor names in one lookup, but NEVER reveal the viewer's own name back to them as a
  // third party (their own actions read as "you"). Names are only resolved for OTHER actors.
  const otherActorIds = [
    ...new Set(rows.map((r) => r.actorUserId).filter((id): id is string => !!id && id !== userId)),
  ];
  const names = otherActorIds.length
    ? await prisma.user.findMany({ where: { id: { in: otherActorIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(names.map((u) => [u.id, u.name]));

  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurredAt instanceof Date ? r.occurredAt.toISOString() : String(r.occurredAt),
    source: r.source,
    actor: r.actor,
    action: r.action,
    vaultId: r.vaultId,
    metadata: r.metadata,
    actorName: r.actorUserId && r.actorUserId !== userId ? (nameById.get(r.actorUserId) ?? null) : null,
  }));
}
