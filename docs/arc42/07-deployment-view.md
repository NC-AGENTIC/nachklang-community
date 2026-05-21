# 7. Deployment View

## Topology

Docker Compose runs four long-lived services:

- `web`: the Next.js standalone server, running non-root, read-only filesystem with tmpfs, all capabilities dropped, no-new-privileges.
- `caddy`: TLS termination and reverse proxy (auto-TLS via Let's Encrypt in production). Built from a custom image (`ops/caddy/Dockerfile`) with the rate-limit module; caps `/api/auth/*` at 30 req/min/IP at the edge. Certificates are issued/renewed over **TLS-ALPN-01** (port 443), so no public port 80 is required and the HTTP→HTTPS redirect listener is disabled.
- `postgres`: PostgreSQL 18 with a persistent volume and healthcheck.
- `valkey`: in-memory store with persistence disabled.

Two one-shot profiles are available: `migrate` (runs `prisma migrate deploy`) and `backup`
(creates an **age-encrypted** `pg_dump` archive in `NACHKLANG_BACKUP_DIR`, pruned on a GFS
schedule). The `backup` profile is driven on the host by a daily systemd timer, with a companion
failure unit that surfaces a failed run; backups are encrypted to an offline key the host cannot
decrypt. See `docs/ops/backup-restore.md`.

## Operation

- Single EU-hosted Linux host. The only public inbound is **443** (HTTPS): administrative SSH is
  reachable only over a private VPN (no public SSH), and port 80 is not exposed because issuance
  uses TLS-ALPN-01. The container still binds `:80` for local/plain-HTTP development.
- PostgreSQL and Valkey are reachable only on the internal Docker network.
- Configuration is environment-driven; production secrets live only on the host.
- Host hardening (key-only SSH, automatic security updates, intrusion throttling, time sync, and
  the offline backup key) is described in `docs/ops/host-hardening.md`.
- The local Compose setup is used to verify the deployment before release.
