# Dispatch Messages

## 2026-10-24T20:13:51Z
You are the Project Orchestrator for Phase 02 of the WhatsApp Web clone project.

Your dedicated working directory is:
d:\MyGitHubProjects\WebChat\.agents\teamwork\orchestrator_phase02

Your task is to plan, dispatch, monitor, and coordinate the complete implementation and build of Phase 02 per the user request in d:\MyGitHubProjects\WebChat\.agents\teamwork\ORIGINAL_REQUEST.md (timestamp 2026-10-24T20:12:34Z).

Reference files:
- Specification: phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md
- Previous Phase Handoff: phases/01_WORKSPACE_AND_LAYOUT_SHELL.md and .agents/teamwork/orchestrator_phase01/handoff.md
- Tech stack and env: TECH_STACK_AND_ENV_CONFIG.md
- SDLC Checklist: chk.txt
- Project guardrails: AGENTS.md

Scope of Phase 02:
1. Production-Ready MySQL Prisma Schema & Singleton Clients
   - web/prisma/schema.prisma strictly with provider = "mysql" and all 7 data models (User, Contact, Chat, ChatParticipant, Message, MessageStatus, CallLog)
   - Singleton Prisma clients in web/src/lib/prisma.ts and socket-server/src/lib/prisma.ts with connection pooling (connection_limit=10&pool_timeout=20)
   - Prisma Client generation (npx prisma generate)
2. Production SQL Migrations & Database Seeding
   - Initial migration DDL in web/prisma/migrations/0_init/migration.sql
   - Production seed script in web/prisma/seed.ts seeding demo accounts (@ahsan, @developer, @designer) with hashed passwords, contacts, direct chat, sample messages, and message receipts
   - .env files in web/ and socket-server/ with Hostinger connection format and shared JWT_SECRET
3. Server #2 Fastify + Native ws Daemon & In-Memory RoomManager
   - Fastify 4+ in socket-server/src/index.ts with @fastify/cors and @fastify/cookie
   - Native ws WebSocketServer attached to Fastify HTTP server
   - In-memory RoomManager (socket-server/src/lib/roomManager.ts) tracking active sockets and chat rooms
   - 30-second heartbeat ping-pong
   - GET /health endpoint returning { status: "ok", memoryMB: ... } with target RSS < 35 MB
4. WebSocket JWT Handshake Authentication
   - HTTP upgrade authentication in socket-server/src/middleware/auth.ts verifying auth_token cookie
   - Reject unauthenticated upgrade with 401
5. Local Uploads Directory Scaffold & Checklist Synchronization
   - web/public/uploads/ (avatars/, images/, voice/) with .gitkeep and .gitignore
   - Clean builds across web/ and socket-server/ (npm run build)
   - Update Phase 02 checklist items in chk.txt with [x]

Keep your progress.md, plan.md, and BRIEFING.md updated in your working directory.
When finished, notify Sentinel with a complete handoff report.
