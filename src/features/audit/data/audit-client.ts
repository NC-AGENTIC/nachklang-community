export type AuditEvent = {
  id: string;
  occurredAt: string;
  source: string;
  actor: string;
  action: string;
  vaultId: string | null;
  metadata: unknown;
  actorName: string | null;
};

export async function fetchAuditEvents(): Promise<AuditEvent[]> {
  const res = await fetch("/api/audit", { method: "GET", credentials: "same-origin" });
  if (!res.ok) throw new Error(`audit_failed_${res.status}`);
  return ((await res.json()) as { events: AuditEvent[] }).events;
}
