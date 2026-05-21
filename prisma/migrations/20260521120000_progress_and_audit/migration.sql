-- CreateTable: trustee per-item handling progress (encrypted overlay; owner entry untouched)
CREATE TABLE "ShareItemProgress" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "trusteeUserId" TEXT NOT NULL,
    "nonceBase64" TEXT NOT NULL,
    "ciphertextBase64" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareItemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareItemProgress_vaultId_itemId_trusteeUserId_key" ON "ShareItemProgress"("vaultId", "itemId", "trusteeUserId");

-- CreateIndex
CREATE INDEX "ShareItemProgress_vaultId_trusteeUserId_idx" ON "ShareItemProgress"("vaultId", "trusteeUserId");

-- AddForeignKey
ALTER TABLE "ShareItemProgress" ADD CONSTRAINT "ShareItemProgress_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("vaultId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareItemProgress" ADD CONSTRAINT "ShareItemProgress_trusteeUserId_fkey" FOREIGN KEY ("trusteeUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: immutable transparency log. No FK on targetUserId so rows survive user deletion.
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetEmail" TEXT,
    "vaultId" TEXT,
    "summary" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_targetUserId_idx" ON "AuditEvent"("targetUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_targetEmail_idx" ON "AuditEvent"("targetEmail");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_idx" ON "AuditEvent"("occurredAt");

-- Audit backstop: a generic trigger that records an immutable AuditEvent on ANY delete of a
-- user-scoped row, regardless of whether the delete came from the app, a raw psql session, an
-- admin, or an automation. Identifying columns are read directly from the deleted row (via
-- to_jsonb(OLD)) so no cross-table lookup is needed (robust under ON DELETE CASCADE ordering).
-- An app transaction may set `app.actor`/`app.actor_id` (SET LOCAL) to attribute the action;
-- when unset (raw/admin/automation) the actor defaults to 'system'.
CREATE OR REPLACE FUNCTION audit_capture() RETURNS trigger AS $$
DECLARE
  rec jsonb := to_jsonb(OLD);
  v_target_user text;
  v_target_email text;
BEGIN
  v_target_user := COALESCE(
    rec->>'userId',
    rec->>'ownerId',
    rec->>'trusteeUserId',
    CASE WHEN TG_TABLE_NAME = 'user' THEN rec->>'id' END
  );
  v_target_email := COALESCE(
    rec->>'inviteeEmail',
    CASE WHEN TG_TABLE_NAME = 'user' THEN rec->>'email' END
  );

  INSERT INTO "AuditEvent"
    ("id", "occurredAt", "source", "actor", "actorUserId", "action", "targetUserId", "targetEmail", "vaultId", "metadata")
  VALUES (
    gen_random_uuid()::text,
    now(),
    'db',
    COALESCE(NULLIF(current_setting('app.actor', true), ''), 'system'),
    NULLIF(current_setting('app.actor_id', true), ''),
    TG_TABLE_NAME || '.' || lower(TG_OP),
    v_target_user,
    v_target_email,
    rec->>'vaultId',
    jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_delete_user AFTER DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER audit_delete_vault AFTER DELETE ON "Vault" FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER audit_delete_vault_ciphertext AFTER DELETE ON "VaultCiphertext" FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER audit_delete_vault_share AFTER DELETE ON "VaultShare" FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER audit_delete_share_invite AFTER DELETE ON "ShareInvite" FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER audit_delete_user_keypair AFTER DELETE ON "UserKeypair" FOR EACH ROW EXECUTE FUNCTION audit_capture();
CREATE TRIGGER audit_delete_passkey AFTER DELETE ON "passkey" FOR EACH ROW EXECUTE FUNCTION audit_capture();
