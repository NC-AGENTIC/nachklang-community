# Backup & Restore Runbook

NachKlang stores **all** user data — including every encrypted vault — in PostgreSQL. Backing
up the database backs up the vaults. Backups are `pg_dump` archives, **age-encrypted to an
offline key**, written to `NACHKLANG_BACKUP_DIR` and pruned on a Grandfather-Father-Son
schedule by a daily systemd timer.

> **Validate on the production host, not locally.** The dev machine may be a different CPU
> architecture than prod, and a backup is only proven by running it where it will actually run.
> The dev-only `ops/backup/smoke-test.sh` spins up a throwaway stack and runs
> `docker compose down -v` — **never run it on the prod host**.

## 1. One-time: generate the age key (OFFLINE)

On a trusted machine (NOT the server):

```bash
age-keygen -o age-identity.txt
# -> "Public key: age1...."
```

- Store `age-identity.txt` in your password manager / offline vault. **Never copy it to the
  server.** Without it, backups are unrecoverable — by design (same model as the vault Root Key).
- Put the printed public key on the server in `.env` as `NACHKLANG_BACKUP_AGE_RECIPIENT`.

## 2. One-time: prepare the host

```bash
sudo install -d -m 700 -o 999 -g 999 /srv/nachklang-backups   # uid/gid 999 = postgres in the image
```

> uid/gid `999` must match the `postgres` user inside the pinned `postgres:18-bookworm` image.
> If the base image is ever bumped to one with a different postgres uid, re-`chown` the backup
> directory accordingly, or backup writes will fail with permission errors.

Set in the deployment's `.env` (adjust the compose project path to your install):

```
NACHKLANG_BACKUP_AGE_RECIPIENT=age1...
NACHKLANG_BACKUP_DIR=/srv/nachklang-backups
# optional: BACKUP_ALERT_WEBHOOK=https://...
```

## 3. First-time validation on the production host (non-destructive)

`pg_dump` only **reads** the database, so a backup run cannot harm production data. Run, from
the compose project directory on the prod host:

```bash
# Build the backup image on prod (amd64) and run one real backup.
docker compose build backup
docker compose --profile backup run --rm backup

# Confirm an encrypted artifact + checksum landed and the checksum verifies.
ls -l /srv/nachklang-backups
cd /srv/nachklang-backups && sha256sum -c "$(ls -1t nachklang-*.dump.age.sha256 | head -1)"
```

Then a **restore drill into a throwaway scratch database** (never the live DB), on a trusted
machine that holds `age-identity.txt`:

```bash
artifact=nachklang-<ts>.dump.age
age -d -i age-identity.txt "$artifact" > /tmp/drill.dump
pg_restore --list /tmp/drill.dump | head        # well-formed archive?
# Optional full drill: create a scratch DB, pg_restore into it, spot-check, then drop it.
rm -f /tmp/drill.dump
```

## 4. One-time: install the systemd timer

```bash
sudo cp ops/backup/systemd/nachklang-backup.service        /etc/systemd/system/
sudo cp ops/backup/systemd/nachklang-backup.timer          /etc/systemd/system/
sudo cp ops/backup/systemd/nachklang-backup-failure.service /etc/systemd/system/
# Edit WorkingDirectory / EnvironmentFile paths if your project dir is not /opt/nachklang.
sudo systemctl daemon-reload
sudo systemctl enable --now nachklang-backup.timer
systemctl list-timers nachklang-backup.timer
```

Run one immediately to confirm:
`sudo systemctl start nachklang-backup.service && journalctl -u nachklang-backup.service -n 20`.

## 5. Restore (on a trusted machine with age-identity.txt)

```bash
sha256sum -c nachklang-<ts>.dump.age.sha256
age -d -i age-identity.txt nachklang-<ts>.dump.age \
  | pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL"
```

The single DB role (`nachklang`) is recreated by the Postgres container's `POSTGRES_USER` on a
fresh volume, so a one-database `pg_dump` is sufficient (no `pg_dumpall --globals-only` needed).

## 6. Restore drill (do this periodically — e.g. monthly)

Prove backups are actually restorable, not just present: decrypt a recent artifact, run
`pg_restore --list`, then restore into a throwaway DB and spot-check row counts before dropping
it. A backup you have never restored is a hope, not a backup.

## 7. Phase 2 (later): off-site to Hetzner Storage Box

`NACHKLANG_BACKUP_DIR` is a clean, already-encrypted directory. A later phase syncs it to the
Storage Box (e.g. restic over SFTP, or rclone) with its own append-only retention. Because the
artifacts are encrypted before they leave the host, the transport need not be trusted with
plaintext.

## Host hardening

See [host-hardening.md](host-hardening.md) for the production host hardening runbook.
