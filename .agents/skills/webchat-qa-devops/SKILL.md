---
name: webchat-qa-devops
description: >-
  Use this skill when creating or running automated tests (Vitest, Playwright), executing k6 user load simulation,
  configuring GitHub Actions CI/CD pipelines to Hostinger, and setting up zero-cost monitoring and database backup scripts.
---

# WebChat QA, Testing & DevOps Skill

This skill governs testing, virtual user load simulation, automated CI/CD deployment, and operations for the WebChat application on Hostinger at **$0.00 extra monthly cost**.

---

## 1. Automated Testing Architecture (SDLC QA)

### Unit & Integration Testing (Vitest)
- Test directory: `web/__tests__/` and `socket-server/__tests__/`.
- Focus areas:
  - Input validators (`validateUsername`, `validateEmail`).
  - JWT creation and verification utilities.
  - REST endpoints (`/api/auth/register`, `/api/auth/login`, `/api/users/search`).
  - Fastify native WebSocket upgrade authentication with valid/expired cookies.
  - `RoomManager` unit tests (joining rooms, broadcasting, leaving rooms).

### End-to-End Chat Testing (Playwright)
- Test file: `e2e/chat-flow.spec.ts`.
- Simulates two distinct browser contexts (User A and User B):
  1. User A registers and searches for User B.
  2. User A sends a message; User B receives it in real-time over native WebSockets.
  3. Status tick transitions from single grey `✓` to double grey `✓✓` to double blue `✓✓`.
  4. User A records a mock voice note; User B verifies playback availability.

---

## 2. Virtual User Load Simulator (k6 Script)

Because Server #2 utilizes **native `ws`**, the k6 load testing engine connects directly without requiring any third-party socket wrappers:

```javascript
// scripts/load-test.js
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 simulated users
    { duration: '1m',  target: 300 }, // Steady state 300 active connections
    { duration: '30s', target: 500 }, // Stress peak: 500 simulated users
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    ws_connecting: ['p(95)<800'],     // 95% of connections established under 800ms
  },
};

export default function () {
  const url = __ENV.SOCKET_URL || 'ws://localhost:4000';
  const testToken = __ENV.TEST_JWT_TOKEN || 'valid_test_jwt_cookie';
  const params = { headers: { Cookie: `auth_token=${testToken}` } };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      // Send heartbeat ping envelope every 5s
      socket.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping', payload: { time: Date.now() } }));
      }, 5000);
    });

    socket.on('message', (raw) => {
      const msg = JSON.parse(raw);
      check(msg, { 'received valid envelope': (m) => m && m.type });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 25000);
  });

  check(res, { 'connection status is 101': (r) => r && r.status === 101 });
  sleep(1);
}
```

Run simulation locally:
```bash
k6 run scripts/load-test.js
```

---

## 3. Automated CI/CD Pipeline (GitHub Actions)

Zero-cost automated deployment via `.github/workflows/deploy.yml`:

```yaml
name: Deploy WebChat to Hostinger

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
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

      - name: Run Vitest Suite
        run: npm run test

      - name: Build Next.js Standalone & Fastify Server
        run: |
          cd web && npm run build
          cd ../socket-server && npm run build

      - name: Deploy Server #1 to Hostinger
        uses: easingthemes/ssh-deploy@main
        env:
          SSH_PRIVATE_KEY: ${{ secrets.HOSTINGER_SSH_KEY }}
          REMOTE_HOST: ${{ secrets.HOSTINGER_HOST }}
          REMOTE_USER: ${{ secrets.HOSTINGER_USER }}
          SOURCE: "web/.next/standalone/ web/.next/static/ web/public/"
          TARGET: "/home/u123456789/domains/chat.yourdomain.com/public_html"

      - name: Deploy Server #2 (Fastify + ws) to Hostinger
        uses: easingthemes/ssh-deploy@main
        env:
          SSH_PRIVATE_KEY: ${{ secrets.HOSTINGER_SSH_KEY }}
          REMOTE_HOST: ${{ secrets.HOSTINGER_HOST }}
          REMOTE_USER: ${{ secrets.HOSTINGER_USER }}
          SOURCE: "socket-server/dist/ socket-server/package.json"
          TARGET: "/home/u123456789/domains/ws.yourdomain.com/public_html"
```

---

## 4. Zero-Cost Maintenance & Monitoring Operations

1. **Hostinger Daily Database Backup Cron**:
   Hostinger hPanel > Advanced > Cron Jobs (Daily at 03:00 AM):
   ```bash
   mysqldump -u DBNAME_USER -p'DB_PASSWORD' DBNAME | gzip > ~/backups/db_$(date +\%F).sql.gz && find ~/backups/ -name "db_*.sql.gz" -mtime +7 -delete
   ```
2. **Uptime Keep-Alive Monitoring (UptimeRobot)**:
   - Free UptimeRobot monitor pinging `https://chat.yourdomain.com/api/health` and `https://ws.yourdomain.com/health` every 5 minutes.
   - Prevents Hostinger CloudLinux passenger / LiteSpeed Node processes from idling.
3. **Local Disk Error Logger**:
   - Winston logger configured to rotate daily logs into `/logs/error-%DATE%.log` with max size 10MB and 14 days retention.
