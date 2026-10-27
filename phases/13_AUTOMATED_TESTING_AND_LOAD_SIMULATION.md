# Phase 13: Automated Testing & Load Simulation (SDLC QA)

## 1. Phase Overview & Objectives
**Target Workspace**: `web/__tests__/`, `socket-server/__tests__/`, `e2e/`, `scripts/`  
**Primary Goal**: Implement the Quality Assurance (QA) phase of the SDLC at **$0 extra cost**. Build automated unit tests with Vitest, test Fastify routes using `fastify.inject()`, execute end-to-end multi-browser chat flows with Playwright, and create a reproducible virtual user load simulation script with k6 to test Hostinger's socket and database capacity under 100–500 concurrent users.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`12_PWA_AND_MOBILE_CHROME_INSTALLATION.md`](12_PWA_AND_MOBILE_CHROME_INSTALLATION.md) (All features and PWA installation ready).
- **Environment**: Vitest, React Testing Library, Playwright, Grafana k6 (Open Source local runner).
- **Performance Benefit**: Fastify + Native `ws` uses ~30 MB RAM, enabling k6 load testing up to **500 concurrent simulated users** on standard Hostinger plans.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── vitest.config.ts             # Vitest configuration for Next.js 15
│   └── __tests__/
│       ├── unit/
│       │   ├── auth.test.ts         # JWT sign/verify & password hashing tests
│       │   ├── validation.test.ts   # Zod username & email validator tests
│       │   └── audioUtils.test.ts   # Waveform peak extraction normalization tests
│       └── integration/
│           ├── authApi.test.ts      # Supertest / NextRequest tests for /api/auth/*
│           └── searchApi.test.ts    # Search API prefix matching tests
├── socket-server/
│   └── __tests__/
│       ├── roomManager.test.ts      # In-memory RoomManager unit tests
│       └── wsAuth.test.ts           # Native WebSocket upgrade authentication tests
├── e2e/
│   ├── playwright.config.ts         # Playwright multi-browser configuration
│   └── chat-flow.spec.ts            # E2E 2-user registration and live messaging flow
└── scripts/
    └── load-test.js                 # k6 virtual user load simulation script (100–500 users)
```

---

## 4. Virtual User Load Simulation Script (`scripts/load-test.js`)

```javascript
// scripts/load-test.js
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 simulated users
    { duration: '1m',  target: 300 }, // Steady state 300 active connections
    { duration: '30s', target: 500 }, // Stress peak: 500 simulated users
    { duration: '30s', target: 0 },   // Graceful ramp-down
  ],
  thresholds: {
    ws_connecting: ['p(95)<800'],     // 95% of connections establish under 800ms
    ws_session_duration: ['min>10000'], // Sessions remain connected without drops
  },
};

export default function () {
  const url = __ENV.SOCKET_URL || 'ws://localhost:4000';
  const testToken = __ENV.TEST_JWT_TOKEN || 'valid_test_jwt_cookie';
  const params = {
    headers: {
      Cookie: `auth_token=${testToken}`,
    },
  };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      // Send heartbeat ping envelope every 5s
      socket.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping', payload: { time: Date.now() } }));
      }, 5000);
    });

    socket.on('message', (raw) => {
      const data = JSON.parse(raw);
      check(data, { 'valid envelope received': (d) => d && d.type });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 25000);
  });

  check(res, { 'WebSocket handshake status 101': (r) => r && r.status === 101 });
  sleep(1);
}
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Unit & Integration Testing Suite (Vitest)**:
  - Configure `web/vitest.config.ts`.
  - Write `auth.test.ts`:
    - Tests `signToken` and `verifyToken` with valid and expired JWTs.
    - Verifies password hashing entropy and comparison.
  - Write `validation.test.ts`:
    - Validates username regex against allowed characters (`alex_1`, `sarah_99`) and illegal characters (`alex@`, `spaces in name`, `too_long_username_exceeding_25_chars`).
  - Write `searchApi.test.ts`:
    - Executes query against mock Prisma client to verify prefix matching and self-exclusion.
- [ ] **2. Fastify & Native `ws` Tests (`socket-server/__tests__/`)**:
  - `roomManager.test.ts`:
    - Verify adding and removing sockets from rooms.
    - Verify `broadcastToRoom` sends envelopes only to sockets in that room.
    - Verify `leaveAll` purges sockets and deletes empty rooms.
  - `wsAuth.test.ts`:
    - Test connecting without cookie: Expect rejection with HTTP 401.
    - Test connecting with valid JWT: Expect connection accepted and registered in `roomManager`.
- [ ] **3. End-to-End Chat Flow with Playwright (`e2e/chat-flow.spec.ts`)**:
  - Configure `playwright.config.ts` targeting Chromium and Mobile Chrome emulation.
  - Test scenario:
    1. Browser Context 1: Register User A (`@user_a`).
    2. Browser Context 2: Register User B (`@user_b`).
    3. User A searches for `@user_b` in the New Chat modal and opens conversation.
    4. User A types and sends *"Hello from Playwright!"*.
    5. User B verifies receipt of the message in real-time over native WebSockets.
    6. User A confirms status tick transitions from single `✓` to double blue `✓✓`.
- [ ] **4. Run & Benchmark Load Simulation (k6)**:
  - Seed database with 50 test accounts.
  - Run `k6 run scripts/load-test.js`.
  - Measure:
    - 95th percentile connection time.
    - Dropped connection count (must be 0%).
    - Hostinger server memory (should stay under 60 MB for Fastify + `ws`).

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 13 complete, verify:
1. `npm run test` executes all Vitest unit and integration tests with **100% passing status**.
2. `npx playwright test` completes the 2-user real-time chat E2E test without timeouts or errors.
3. Running the k6 load script with 300 virtual users maintains a connection error rate of 0% and average latency `< 200ms`.

---

## 7. Handoff to Phase 14
Phase 14 will implement Automated CI/CD, Production Deployment on Hostinger, and System Monitoring (GitHub Actions, Fastify health checks, Winston log rotation, UptimeRobot keep-alive, and daily database backup cron).
