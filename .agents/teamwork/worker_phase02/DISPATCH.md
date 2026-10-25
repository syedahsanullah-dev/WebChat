## 2026-10-24T20:24:00Z
You are the Worker for Phase 02 (Database & Dual-Server Infrastructure Setup) of the WhatsApp Web clone.
Your working directory is: d:\MyGitHubProjects\WebChat\.agents\teamwork\worker_phase02

MANDATORY INSTRUCTION: You MUST read d:\MyGitHubProjects\WebChat\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the Phase 02 requirements starting around line 67) before starting work.

Also read:
- SCOPE.md at d:\MyGitHubProjects\WebChat\.agents\teamwork\orchestrator_phase02\SCOPE.md
- Explorer 1 (DB) report: d:\MyGitHubProjects\WebChat\.agents\teamwork\explorer_phase02_db\handoff.md
- Explorer 2 (Socket) report: d:\MyGitHubProjects\WebChat\.agents\teamwork\explorer_phase02_socket\handoff.md
- Explorer 3 (QA) report: d:\MyGitHubProjects\WebChat\.agents\teamwork\explorer_phase02_qa\handoff.md
- Relevant skills: .agents/skills/webchat-coding-engineer/SKILL.md, .agents/skills/webchat-requirements-architect/SKILL.md, .agents/skills/webchat-qa-devops/SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write boundaries:
1. `web/prisma/schema.prisma`:
   - Provider = "mysql"
   - Generator client with binaryTargets = ["native", "debian-openssl-3.0.x", "debian-openssl-1.1.x", "rhel-openssl-3.0.x"]
   - All 7 models (User, Contact, Chat, ChatParticipant, Message, MessageStatus, CallLog) exactly matching specification in phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md and Explorer 1 handoff. CallLog MUST be strictly audio-only (NO video).
2. `web/prisma/migrations/0_init/migration.sql`:
   - Production MySQL DDL for all 7 tables with foreign keys, onDelete constraints, indexes, and unique keys.
3. `web/prisma/seed.ts`:
   - Production seed script using PrismaClient and bcryptjs.
   - Seed demo accounts (@ahsan, @developer, @designer) with hashed passwords, contacts, direct chat, sample messages, and message status receipts.
4. `web/src/lib/prisma.ts`:
   - Global singleton Prisma client with connection pooling, cached in globalThis in dev mode to prevent connection exhaustion.
5. `socket-server/src/lib/prisma.ts`:
   - Global singleton Prisma client for Server #2 with connection pooling.
6. `socket-server/src/middleware/auth.ts`:
   - HTTP upgrade authentication extracting `auth_token` cookie (and query parameter fallback for dev/tests), verifying JWT with shared `JWT_SECRET`, attaching `{ userId, username, isAlive: true }` to socket, and rejecting unauthorized upgrade attempts with HTTP 401.
7. `socket-server/src/lib/roomManager.ts`:
   - Add missing `getUserSockets(userId: string)` and `getRoomMembers(room: string)` getter methods.
8. `socket-server/src/index.ts`:
   - Refactor to use modular `handleUpgradeAuth` from `src/middleware/auth.ts` and ensure clean lifecycle handling.
9. `socket-server/tests/websocket-live.test.ts`:
   - Use clean `roomManager.getUserSockets` and add tests verifying cookie `auth_token` authentication as well as HTTP 401 rejection for invalid/missing tokens.
10. `web/public/uploads/`:
    - Create subdirectories `avatars/`, `images/`, `voice/` with `.gitkeep` and a `.gitignore` ignoring media uploads.
11. `web/.env` and `socket-server/.env`:
    - Ensure DATABASE_URL includes `connection_limit=10&pool_timeout=20` and shared JWT_SECRET.
12. `chk.txt`:
    - Mark completed Phase 02 checklist items with `[x]`.

Verification tasks to execute and document:
1. Run `npx prisma generate --schema=web/prisma/schema.prisma`
2. Run `npm run build:socket` (or `npm run build --workspace=socket-server`)
3. Run `npm test --workspace=socket-server`
4. Run `npm run build:web` (or `npm run build --workspace=web`)
5. Run `npm test --workspace=web`

Document all file changes, commands executed, build and test outputs in your handoff report at:
d:\MyGitHubProjects\WebChat\.agents\teamwork\worker_phase02\handoff.md

When finished, send a message to orchestrator with your results and handoff path.
