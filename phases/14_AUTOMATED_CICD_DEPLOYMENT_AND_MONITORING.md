# Phase 14: Automated CI/CD, Production Deployment & System Monitoring (SDLC Ops)

## 1. Phase Overview & Objectives
**Target Workspace**: `.github/workflows/`, Hostinger hPanel, `.htaccess`, and Server #1 & #2 configurations  
**Primary Goal**: Execute the final production deployment of WebChat to Hostinger at **$0.00 additional monthly cost**. Establish automated CI/CD via GitHub Actions for both Next.js Standalone and Fastify + Native `ws`, configure Hostinger Node.js applications with `.htaccess` WebSocket proxying, implement local error logging, schedule automated daily database backups, and set up 24/7 keep-alive monitoring with UptimeRobot.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md`](13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md) (All unit, integration, E2E, and load tests passing).
- **Environment**: Hostinger Web Hosting Plan (supporting Node.js apps), GitHub Actions, UptimeRobot (Free Tier).
- **Cost Constraint**: Uses free GitHub Actions runner minutes (2,000 mins/mo free), free Let's Encrypt SSL, and native Hostinger cron jobs.
- **Reference**: Full dependencies and scripts in [`TECH_STACK_AND_ENV_CONFIG.md`](../TECH_STACK_AND_ENV_CONFIG.md).

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions automated build and SSH/FTPS deployment
├── socket-server/
│   └── public_html/
│       └── .htaccess                # Apache/LiteSpeed WebSocket upgrade proxy configuration
├── web/
│   └── src/
│       ├── app/api/health/
│       │   └── route.ts             # Server #1 Health check endpoint for UptimeRobot
│       └── lib/
│           └── logger.ts            # Winston daily rotated file logger
└── scripts/
    └── backup-db.sh                 # Daily automated MySQL backup script for Hostinger cron
```

---

## 4. GitHub Actions Deployment Workflow (`.github/workflows/deploy.yml`)

```yaml
name: Deploy WebChat to Hostinger

on:
  push:
    branches: [main]

jobs:
  test-build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 20 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Automated Vitest Suite
        run: npm run test

      - name: Build Next.js Standalone
        run: |
          cd web
          npm run build

      - name: Build Fastify Socket Server
        run: |
          cd socket-server
          npm run build

      - name: Deploy Server #1 (Next.js Standalone) to Hostinger
        uses: easingthemes/ssh-deploy@main
        env:
          SSH_PRIVATE_KEY: ${{ secrets.HOSTINGER_SSH_KEY }}
          REMOTE_HOST: ${{ secrets.HOSTINGER_HOST }}
          REMOTE_USER: ${{ secrets.HOSTINGER_USER }}
          SOURCE: "web/.next/standalone/ web/.next/static/ web/public/"
          TARGET: "/home/u123456789/domains/chat.yourdomain.com/public_html"

      - name: Deploy Server #2 (Fastify + ws Daemon) to Hostinger
        uses: easingthemes/ssh-deploy@main
        env:
          SSH_PRIVATE_KEY: ${{ secrets.HOSTINGER_SSH_KEY }}
          REMOTE_HOST: ${{ secrets.HOSTINGER_HOST }}
          REMOTE_USER: ${{ secrets.HOSTINGER_USER }}
          SOURCE: "socket-server/dist/ socket-server/package.json"
          TARGET: "/home/u123456789/domains/ws.yourdomain.com/public_html"

      - name: Run Prisma Database Migrations
        run: |
          cd web
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

---

## 5. Hostinger Server Configurations & .htaccess

### Server #2 Subdomain `.htaccess` WebSocket Proxy (`ws.yourdomain.com`)
Place this file in the `public_html` root of the `ws.yourdomain.com` subdomain on Hostinger:

```apache
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /(.*) ws://127.0.0.1:YOUR_FASTIFY_PORT/$1 [P,L]
RewriteCond %{HTTP:Upgrade} !=websocket [NC]
RewriteRule /(.*) http://127.0.0.1:YOUR_FASTIFY_PORT/$1 [P,L]
```

### Server #2 Fastify Health Check Endpoint (`socket-server/src/index.ts`)
```typescript
fastify.get('/health', async () => {
  return {
    status: 'ok',
    server: 'Fastify + Native ws',
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    activeConnections: roomManager.getActiveSocketCount(),
    timestamp: new Date().toISOString(),
  };
});
```

---

## 6. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Hostinger Subdomain Setup in hPanel**:
  - Create Subdomain 1: `chat.yourdomain.com` (pointed to Server #1 Next.js application).
  - Create Subdomain 2: `ws.yourdomain.com` (pointed to Server #2 Fastify application).
  - Install free Let's Encrypt SSL certificates for both subdomains in hPanel.
- [ ] **2. Configure Hostinger Node.js Applications**:
  - In hPanel > Web Development > Node.js:
    - **App #1 (`chat.yourdomain.com`)**:
      - Node.js Version: 20 LTS.
      - Application Root: `/domains/chat.yourdomain.com/public_html`.
      - Application Startup File: `server.js` (generated by Next.js standalone build).
    - **App #2 (`ws.yourdomain.com`)**:
      - Node.js Version: 20 LTS.
      - Application Root: `/domains/ws.yourdomain.com/public_html`.
      - Application Startup File: `dist/index.js`.
- [ ] **3. Automated Daily Database Backup Cron Job**:
  - In Hostinger hPanel > Advanced > Cron Jobs, create a daily cron job scheduled for 03:00 AM:
    ```bash
    mysqldump -u DBNAME_USER -p'DB_PASSWORD' DBNAME | gzip > ~/backups/db_backup_$(date +\%F).sql.gz && find ~/backups/ -name "db_backup_*.sql.gz" -mtime +7 -delete
    ```
  - This automatically saves a compressed `.sql.gz` dump daily and prunes files older than 7 days to preserve disk space.
- [ ] **4. 24/7 Keep-Alive Monitoring (UptimeRobot Free Tier)**:
  - Register free account at [UptimeRobot](https://uptimerobot.com).
  - Create HTTP Monitor 1: `https://chat.yourdomain.com/api/health` (5-minute interval).
  - Create HTTP Monitor 2: `https://ws.yourdomain.com/health` (5-minute interval).
  - This guarantees that Hostinger CloudLinux/LiteSpeed shared Node.js worker processes never enter idle sleep.
- [ ] **5. Local Disk Error Logging**:
  - Implement Winston logger in `web/src/lib/logger.ts` and `socket-server/src/lib/logger.ts`.
  - Rotate error logs daily into `/logs/error-%DATE%.log` (max size 10MB, max 14 days retention).

---

## 7. Quality Gate & Production Sign-Off Checklist

Before declaring the deployment complete:
1. `https://chat.yourdomain.com` loads the WhatsApp Web interface with an active SSL padlock.
2. `https://ws.yourdomain.com/health` responds with `{ "status": "ok", "server": "Fastify + Native ws" }` and memory `< 35MB`.
3. Opening the app on Android Mobile Chrome displays the PWA "Install WebChat" banner.
4. Two users can sign in, send real-time messages with tick receipts, exchange voice notes, and complete a high-definition audio call.
5. UptimeRobot reports 100% uptime over a 24-hour test period.
6. The automated database backup file appears in `~/backups/` after the first cron execution.

---

## 8. Project Completion & Maintenance
With Phase 14 complete, the WhatsApp Web clone is fully deployed in production on Hostinger at **$0.00 extra monthly cost**, using **Next.js 15 Standalone** and **Fastify + Native `ws`**, satisfying all functional requirements and software development life cycle standards.
