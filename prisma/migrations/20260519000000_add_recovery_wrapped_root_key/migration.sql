-- Add nullable recoveryWrappedRootKey column (SP3 inserts always populate it;
-- a follow-up migration in SP4/SP6 can tighten to NOT NULL once populated).
ALTER TABLE "Vault" ADD COLUMN "recoveryWrappedRootKey" JSONB;

-- Drop the redundant userId index since the unique constraint below implies one.
DROP INDEX IF EXISTS "Vault_userId_idx";

-- Enforce one vault per user. This will fail loud if duplicate userId rows
-- exist; SP2 ships with no production data so this is safe.
ALTER TABLE "Vault" ADD CONSTRAINT "Vault_userId_key" UNIQUE ("userId");
