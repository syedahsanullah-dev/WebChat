# DISPATCH — worker_socket

- **Role**: Backend Realtime Engineer
- **Working Directory**: d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_socket
- **Parent**: orchestrator_phase01
- **Domain Skill Path**: d:/MyGitHubProjects/WebChat/.agents/skills/webchat-coding-engineer/SKILL.md
- **Exclusive File Ownership**:
  - `socket-server/package.json`
  - `socket-server/tsconfig.json`
  - `socket-server/.env.example`
  - `socket-server/src/index.ts`
  - `socket-server/src/types/index.ts`
  - `socket-server/src/lib/logger.ts`
  - `socket-server/src/lib/roomManager.ts`
- **Inputs**:
  - `d:/MyGitHubProjects/WebChat/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY: read this first!)
  - `PROJECT.md`
  - `d:/MyGitHubProjects/WebChat/.agents/teamwork/spec_miner_survey_1/handoff.md` (Contains exact dependencies, RoomManager implementation, and environment variables!)
  - `TECH_STACK_AND_ENV_CONFIG.md`
  - `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`

- **Task**:
  Implement Milestone 4 in `socket-server/`:
  1. **Scaffold `socket-server/package.json` and `tsconfig.json`**:
     - Exact dependencies per `TECH_STACK_AND_ENV_CONFIG.md`:
       - `fastify`: `^4.28.1`
       - `@fastify/cors`: `^9.0.1`
       - `@fastify/cookie`: `^9.3.1`
       - `ws`: `^8.18.0`
       - `@prisma/client`: `^5.22.0`
       - `jsonwebtoken`: `^9.0.2`
       - `dotenv`: `^16.4.7`
       - `winston`: `^3.17.0`
     - Dev dependencies: `typescript` (`^5.7.2`), `@types/node` (`^20.17.9`), `@types/ws` (`^8.5.13`), `@types/jsonwebtoken` (`^9.0.7`), `tsx` (`^4.19.2`), `vitest` (`^2.1.8`).
     - Scripts: `dev`, `build`, `start`, `test`.
     - `tsconfig.json`: NodeNext or Node16 module resolution, target ES2022, strict mode.
  2. **Environment Template (`socket-server/.env.example`)**:
     - `PORT=4000`, `NODE_ENV=development`, `CORS_ORIGIN=http://localhost:3000`, `DATABASE_URL=...`, `JWT_SECRET=...`, `PING_INTERVAL_MS=30000`, `TYPING_THROTTLE_MS=2500`.
  3. **Winston Logger (`socket-server/src/lib/logger.ts`)**:
     - Clean console/file logging.
  4. **In-Memory RoomManager (`socket-server/src/lib/roomManager.ts`)**:
     - Implement `AuthenticatedWebSocket` and `RoomManager` class with `join`, `leave`, `leaveAll`, `registerUser`, `isUserOnline`, `broadcastToRoom`, `sendToUser` as specified in `TECH_STACK_AND_ENV_CONFIG.md` and `spec_miner_survey_1/handoff.md`.
     - Export singleton `roomManager`.
  5. **Fastify Server & WebSocket Mount (`socket-server/src/index.ts`)**:
     - Fastify 4 instance with `@fastify/cors` and `@fastify/cookie`.
     - `GET /health` endpoint returning `{ status: "ok", memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024) }`.
     - Native `ws` `WebSocketServer` mounted on `fastify.server`.
     - Upgrade listener extracting token or authenticating, handling ping/pong heartbeat (30s interval).
  6. **Type Definitions (`socket-server/src/types/index.ts`)**:
     - Re-export or define `WsEnvelope<T>` matching `@webchat/shared` contracts.
  7. **Verification**:
     - Run `npm install` in `socket-server/`.
     - Run `npx tsc --noEmit` in `socket-server/` (must pass with 0 errors).
     - Run `npm run build` in `socket-server/` to verify clean build to `dist/`.

- **Mandatory Integrity Warning**:
  DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

- **Output**:
  Write handoff report to `d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_socket/handoff.md` with:
  - Observation: exact files created, dependencies installed
  - Logic Chain: why Fastify + native ws was chosen, memory efficiency
  - Build/Test Results: `tsc` and `build` command execution outputs
  - Verification commands

## 2026-10-24T19:32:01Z
**Context**: Milestone 4 Socket Server Implementation
**Content**: Checking in on your status. We observed that socket-server/ files (dist, node_modules, src, package.json) are present.
**Action**: Please report your progress or complete your handoff.md report.
