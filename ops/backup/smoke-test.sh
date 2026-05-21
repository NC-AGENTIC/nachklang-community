#!/usr/bin/env bash
# DEV-ONLY end-to-end backup acceptance test against an EPHEMERAL Postgres.
#
# WARNING: This spins up a throwaway stack and runs `docker compose down -v` (deletes its
# volumes). It runs under an ISOLATED compose project name so it can never touch a real stack,
# but it is still a developer tool. DO NOT run it on the production host — validate prod with the
# non-destructive runbook in docs/ops/backup-restore.md instead (a real read-only pg_dump backup
# plus a restore drill into a scratch DB).
#
# It proves the whole chain: real pg_dump -> age encryption -> checksum -> decrypt with a
# throwaway private key -> pg_restore --list succeeds. Requires Docker and `age` on the host.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# Isolate from the developer's normal stack so the `down -v` cleanup can NEVER delete their
# real dev postgres-data volume — this test runs in its own throwaway compose project.
export COMPOSE_PROJECT_NAME=nachklang-backup-smoke

work="$(mktemp -d)"
backups="$work/backups"; mkdir -p "$backups"
trap 'docker compose down -v --remove-orphans >/dev/null 2>&1 || true; rm -rf "$work"' EXIT

# 1. Throwaway age keypair (private key stays only in $work, deleted on exit).
age-keygen -o "$work/id.txt" 2>"$work/keygen.log"
recipient="$(grep -oE 'age1[0-9a-z]+' "$work/keygen.log" | head -1)"
test -n "$recipient"

export NACHKLANG_BACKUP_AGE_RECIPIENT="$recipient"
export NACHKLANG_BACKUP_DIR="$backups"

# 2. Bring up Postgres, apply schema, seed one row so the dump has content.
#    NB: the INSERT below is coupled to the `user` model in prisma/schema.prisma — if that
#    model's required columns change, update this seed row to match.
docker compose up -d postgres
docker compose --profile migrate run --rm migrate
docker compose exec -T postgres \
  psql -U "${POSTGRES_USER:-nachklang}" -d "${POSTGRES_DB:-nachklang}" \
  -c "INSERT INTO \"user\" (id,name,email,\"emailVerified\",\"createdAt\",\"updatedAt\") VALUES ('smoke','Smoke','smoke@example.com',true,now(),now());"

# 3. Run the real backup job.
docker compose --profile backup run --rm backup

# 4. Assert artifact + sidecar exist.
artifact="$(ls "$backups"/nachklang-*.dump.age | head -1)"
test -s "$artifact"
test -s "$artifact.sha256"
echo "artifact: $artifact"

# 5. Checksum verifies.
( cd "$backups" && sha256sum -c "$(basename "$artifact").sha256" )

# 6. Decrypt with the throwaway private key and confirm it's a valid pg_dump archive
#    (pg_restore --list runs inside the pinned postgres image — no host pg client needed).
age -d -i "$work/id.txt" "$artifact" > "$work/restore.dump"
docker run --rm -v "$work":/w \
  postgres:18-bookworm@sha256:47855c76129d1383e7efc66a1a776e33c9171b3450e95deb822119e02eaab592 \
  pg_restore --list /w/restore.dump | grep -q "TABLE DATA" \
  && echo "SMOKE PASS: backup is decryptable and restorable"
