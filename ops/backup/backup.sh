#!/usr/bin/env bash
# Dump Postgres, encrypt to an offline age recipient, publish atomically, checksum, prune.
# bash (not the image's dash) is required for `pipefail`: a failed pg_dump must abort the run
# instead of leaving a truncated-but-"successful" encrypted file.
set -euo pipefail

: "${POSTGRES_HOST:?POSTGRES_HOST required}"
: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"
: "${PGPASSWORD:?PGPASSWORD required}"
: "${AGE_RECIPIENT:?AGE_RECIPIENT required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib-prune.sh"

ts="$(date -u +%Y-%m-%dT%H%M%SZ)"
name="nachklang-${ts}.dump.age"
final="$BACKUP_DIR/$name"
tmp="$final.tmp"
trap 'rm -f "$tmp"' EXIT   # remove the partial on any failure; no-op after the atomic mv

# Stream the dump straight into age: the *unencrypted* dump never lands on disk.
pg_dump --host="$POSTGRES_HOST" --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
        --format=custom --no-password \
  | age -r "$AGE_RECIPIENT" > "$tmp"

# Gate: never publish/prune off a failed or empty run.
test -s "$tmp"
mv "$tmp" "$final"                                  # atomic publish
( cd "$BACKUP_DIR" && sha256sum "$name" > "$name.sha256" )

prune_gfs "$BACKUP_DIR" \
  "${BACKUP_KEEP_DAILY:-7}" "${BACKUP_KEEP_WEEKLY:-4}" "${BACKUP_KEEP_MONTHLY:-6}"

echo "backup ok: $name ($(stat -c%s "$final" 2>/dev/null || wc -c <"$final") bytes)"
