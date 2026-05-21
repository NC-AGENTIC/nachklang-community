# Ubuntu Host Hardening Runbook

Context: single EU cloud host. The repo-level posture is already strong (hardened containers,
internal-only DB, edge TLS/HSTS/rate-limit), and the reference deployment exposes only **443**
publicly — administrative SSH is reachable only over a private VPN (no public TCP/22), and port
80 is closed because Caddy issues/renews certificates via TLS-ALPN-01. This runbook captures the
host-layer hardening to apply/verify on the live host.

## P0 — biggest wins, low effort
1. **Keep SSH off the public internet.** Prefer a private VPN (e.g. Tailscale/WireGuard) and
   firewall public TCP/22 shut entirely; if a VPN is not an option, at least restrict the source
   to admin IP(s) instead of `0.0.0.0/0`. SSH is the highest-value external target.
2. **`sshd_config`:** `PermitRootLogin no`, `PasswordAuthentication no`,
   `KbdInteractiveAuthentication no`, `PubkeyAuthentication yes`, `AllowUsers <deploy-user>`,
   lower `MaxAuthTries`/`LoginGraceTime`. Prefer a FIDO2 hardware key (`sk-ssh-ed25519`).
3. **`unattended-upgrades`** for OS security patches + `needrestart`; schedule a kernel-reboot
   window.
4. **Docker log limits** in `/etc/docker/daemon.json` (`json-file` `max-size`/`max-file`) and
   `live-restore: true` — unbounded container logs are a common single-host disk-fill outage.

## P1 — defense in depth
5. **Host firewall (ufw/nftables)** behind the cloud firewall: default-deny inbound except
   **443** (plus the VPN interface for SSH). Port 80 is unnecessary with TLS-ALPN-01. (Only Caddy
   publishes ports, so no Docker-iptables conflict.)
6. **CrowdSec** (modern fail2ban) — low SSH value with key-only auth, but can also parse Caddy
   logs to throttle HTTP abuse.
7. **Kernel livepatch** (Ubuntu Pro free tier, ≤5 machines) — patch kernel CVEs without reboot.
8. **Time sync** (chrony/systemd-timesyncd) — TLS validity, audit-log timestamps, session/OTP
   expiry.

## P2 — good practice
9. `.env` perms `600` owned by the deploy user; Graph cert key via Docker secret. The backup
   **age private key must never be on the host** (see [backup-restore.md](backup-restore.md)).
10. **Rootless Docker or Podman** removes the `docker` group = root-equivalent risk (larger
    change).
11. Minimize the image (no GUI, drop unused packages e.g. snapd); optional `auditd`.
12. Full-disk encryption (LUKS): limited value on a running cloud VM (key in RAM), mainly
    protects decommissioned disks — low priority on Hetzner Cloud.
