# Plan: Phase 02 Database & Dual-Server Infrastructure Setup

## Objectives
Deliver the complete, production-ready implementation of Phase 02 as specified in `phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md` and `ORIGINAL_REQUEST.md`:
1. Production-Ready MySQL Prisma Schema & Singleton Clients (with connection pooling limits `connection_limit=10&pool_timeout=20`).
2. Production SQL Migrations (`0_init/migration.sql`) & Seed script (`web/prisma/seed.ts`) with demo accounts (`@ahsan`, `@developer`, `@designer`).
3. Server #2 Fastify + Native ws Daemon (`socket-server/src/index.ts`), in-memory `RoomManager` (`socket-server/src/lib/roomManager.ts`), 30s heartbeat ping-pong, and `GET /health` RSS target < 35 MB.
4. WebSocket JWT Handshake Authentication (`socket-server/src/middleware/auth.ts`) validating `auth_token` cookie and attaching user identity.
5. Local Uploads Directory Scaffold (`web/public/uploads/` with `avatars/`, `images/`, `voice/`, `.gitkeep`, `.gitignore`).
6. Clean builds across `web/` and `socket-server/`.
7. Phase 02 checklist update in `chk.txt`.

## Phase 02 Execution Roadmap

### Step 0: Survey & Technical Investigation (Parallel Explorers)
- **Explorer 1 (Database & Prisma Specialist)**:
  - Examine existing `web/prisma/`, dependencies in `web/package.json` (`@prisma/client`, `prisma`, `bcryptjs`, `@types/bcryptjs`), Prisma CLI setup, and MySQL schema constraints.
  - Check migration strategy and seed execution commands in package.json.
- **Explorer 2 (Socket Server & Auth Specialist)**:
  - Examine `socket-server/` existing files from Phase 01 (`src/index.ts`, `src/lib/roomManager.ts`, dependencies, tsconfig).
  - Check JWT handling, cookie parsing, Fastify plugin registration, and WebSocket upgrade lifecycle.
- **Explorer 3 (Verification & Testing Specialist)**:
  - Examine current test configurations across workspaces, build scripts, typecheck setups, and how to verify health endpoint and unauthenticated WS drop.

### Step 1: Synthesis & Scoping
- Aggregate Explorer reports into `SCOPE.md`.
- Formulate precise file write boundaries and tasks for Worker.

### Step 2: Implementation (Worker)
- Worker implements all Phase 02 requirements across `web/` and `socket-server/`.
- Worker runs `npx prisma generate`, test suites, and clean builds.
- Worker reports detailed test and build results.

### Step 3: Verification & Quality Gates
- **Reviewer 1**: Reviews database schema, Prisma clients, migrations, seed script, connection pooling, and Hostinger compatibility.
- **Reviewer 2**: Reviews socket-server Fastify setup, native ws attachment, RoomManager methods, JWT auth middleware, and memory efficiency.
- **Challenger 1**: Verifies database generation, migration SQL syntax, seed script execution/types, and singleton client exports.
- **Challenger 2**: Tests Fastify server startup, GET /health RSS memory, WebSocket connection lifecycle, valid JWT acceptance, and invalid token rejection (HTTP 401).
- **Forensic Auditor**: Audits codebase for integrity (no hardcoded credentials, no fake test mocks, $0 cost compliance, audio-only guardrails).

### Step 4: Gate Evaluation & Handoff
- Check all gate criteria in `GATE_STATUS.md`.
- Synchronize checklist items in `chk.txt`.
- Send completion message and handoff report to Sentinel (`e670bad0-7e9a-4356-91b8-c5cb304a00c5`).
