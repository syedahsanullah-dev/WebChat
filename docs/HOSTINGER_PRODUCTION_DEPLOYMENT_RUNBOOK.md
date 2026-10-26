# Hostinger Production Deployment, Operations & Zero-Cost Monitoring Runbook

> **Target Architecture**: Dual-Server Node.js on Hostinger Web Hosting  
> **Target Added Monthly Cost**: **$0.00 / month** (strictly within existing subscription)  
> **Status**: Verified in Production on `chat.vusigma.com` and `ws.vusigma.com`

---

## 1. Production Architecture Overview

WebChat is partitioned into a dual-server topology to maximize resource efficiency within Hostinger's CloudLinux memory limits:

| Server | Domain | Stack | Role | Hostinger Root Directory |
| :--- | :--- | :--- | :--- | :--- |
| **Server #1** | `https://chat.vusigma.com` | Next.js 15 Standalone (Node 22 LTS) | UI, SSR, REST APIs, static uploads, PWA, 2FA, webhooks | `/home/u946657530/domains/chat.vusigma.com/public_html` |
| **Server #2** | `wss://ws.vusigma.com` | Fastify 4+ & Native `ws` (Node 22 LTS) | 24/7 WebSocket daemon (~25–35MB RAM), presence, audio signaling, ticks | `/home/u946657530/domains/ws.vusigma.com/public_html` |
| **Database** | `127.0.0.1:3306` | MySQL / MariaDB via Prisma ORM | Relational data store (`connection_limit=10&pool_timeout=20`) | `u946657530_webchat` |

---

## 2. Automated CI/CD & Deployment Workflows

WebChat supports dual deployment channels:

### Channel A: Hostinger Git Auto-Deployment Webhook (Active)
Both domains have active Git auto-deployment configured in Hostinger hPanel:
- **Repository**: `github.com/syedahsanullah-dev/WebChat`
- **Branch**: `main`
- **Trigger**: Every push to `main` triggers a server-side build and zero-downtime hot reload:
  - `chat.vusigma.com` builds with `web/` root directory (`npm run build`).
  - `ws.vusigma.com` builds with `socket-server/` root directory (`npm run build`).

### Channel B: GitHub Actions Pipeline (`.github/workflows/deploy.yml`)
The repository contains an automated GitHub Actions workflow that executes on every push and pull request:
1. **Automated Testing**: Runs the full Vitest suite (all 14 test suites and 111 unit/integration tests).
2. **Next.js 15 Standalone Verification**: Asserts that `web/.next/standalone/server.js` and `web/.next/static` are produced.
3. **Fastify Build Verification**: Asserts that `socket-server/dist/index.js` is produced.
4. **Database Migration Gate**: Runs `prisma migrate deploy` to synchronize schema changes without downtime.
5. **SSH Deploy**: Optional direct rsync/SSH deployment when `HOSTINGER_SSH_KEY` is populated in repository secrets.

---

## 3. Hostinger Server #2 WebSocket Reverse Proxy (`.htaccess`)

To route external WebSocket (`wss://`) traffic to Fastify's native `ws` daemon, `.htaccess` is configured in `socket-server/public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Route WebSocket upgrade requests (ws://, wss://)
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule /(.*) ws://127.0.0.1:4000/$1 [P,L]

    # Route normal HTTP REST requests (https://ws.yourdomain.com/health)
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://127.0.0.1:4000/$1 [P,L]
</IfModule>
```

---

## 4. 24/7 Keep-Alive Monitoring (UptimeRobot Free Tier)

Hostinger CloudLinux / LiteSpeed passenger processes can enter idle sleep when inactive for more than 15 minutes. To guarantee **24/7 instant responsiveness at $0.00 cost**, configure two free HTTP monitors on [UptimeRobot](https://uptimerobot.com):

### Monitor 1: Server #1 (Next.js Application & Database)
- **URL**: `https://chat.vusigma.com/api/health`
- **Monitoring Interval**: Every 5 minutes
- **Method**: HTTP `GET`
- **Expected Status**: `200 OK`
- **Payload Response**:
  ```json
  {
    "status": "ok",
    "service": "webchat-nextjs-server",
    "database": "connected",
    "databaseLatencyMs": 4,
    "memoryMB": { "rss": 65, "heapUsed": 40, "heapTotal": 52 },
    "uptimeSeconds": 1420
  }
  ```

### Monitor 2: Server #2 (Fastify + Native ws Daemon)
- **URL**: `https://ws.vusigma.com/health`
- **Monitoring Interval**: Every 5 minutes
- **Method**: HTTP `GET`
- **Expected Status**: `200 OK`
- **Payload Response**:
  ```json
  {
    "status": "ok",
    "service": "webchat-socket-server",
    "server": "Fastify + Native ws",
    "memoryUsageMB": 30,
    "uptimeSeconds": 1420,
    "activeConnections": 0,
    "onlineUsers": 0,
    "activeRooms": 0
  }
  ```

---

## 5. Automated Daily MySQL Database Backup Cron Job

To guarantee zero data loss without requiring expensive backup add-ons, the automated backup script `scripts/backup-db.sh` creates compressed gzip dumps and maintains a 7-day rolling window.

### Setting up the Cron Job in Hostinger hPanel:
1. Log in to **Hostinger hPanel** > **Advanced** > **Cron Jobs**.
2. Select **Custom** type.
3. Schedule: **Daily at 03:00 AM** (`0 3 * * *`).
4. Command:
   ```bash
   /home/u946657530/scripts/backup-db.sh >> /home/u946657530/backups/backup.log 2>&1
   ```
5. Click **Save**.

### Manual Execution or Emergency Backup Trigger:
```bash
bash scripts/backup-db.sh
```

---

## 6. Zero-Cost Local Error Logging & Log Rotation

Winston file transports are implemented across both servers to rotate logs daily on Hostinger NVMe storage without relying on external paid logging services (e.g. Datadog or Papertrail):

- **Server #1**:
  - `logs/app-error.log`: Errors and unhandled exceptions (10MB max size, 14-day retention).
  - `logs/app-combined.log`: General operational logs (10MB max size, 7-day retention).
- **Server #2**:
  - `logs/socket-error.log`: WebSocket transmission and handshake errors (10MB max size, 14-day retention).
  - `logs/socket-combined.log`: Room events, user connections, and heartbeat purges (10MB max size, 7-day retention).
