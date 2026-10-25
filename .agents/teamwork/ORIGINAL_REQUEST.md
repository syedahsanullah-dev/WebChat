# Original User Request

## 2026-10-24T18:52:21Z

Implement Phase 01 of the WhatsApp Web clone: bootstrap the monorepo workspace (`web/`, `socket-server/`, `shared/`), set up Next.js 15+ App Router in standalone mode with WhatsApp Web Tailwind design tokens, build the responsive 2-column layout shell with UI primitives and sound assets, scaffold the Fastify 4+ & native ws daemon, and verify all Phase 01 quality gates.

Working directory: d:/MyGitHubProjects/WebChat
Integrity mode: development

Reference files:
- `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`
- `TECH_STACK_AND_ENV_CONFIG.md`
- `chk.txt`

## Requirements

### R1. Monorepo Workspace & Next.js Standalone Configuration
- Initialize root workspace directories: `web/` (Next.js 15 App Router, React 19, TypeScript, Tailwind CSS), `socket-server/` (Fastify 4+, native `ws`), and `shared/` (shared contracts/types).
- Configure `web/next.config.js` with `output: 'standalone'` and unoptimized local image delivery for Hostinger Node.js deployment.
- Configure `web/tailwind.config.ts` with the official WhatsApp Web dark & light color palette tokens (`wa.dark`, `wa.light`, `wa.green`, `wa.blue`) as defined in `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`.

### R2. Responsive WhatsApp Web Two-Column Layout Shell
- Implement the split-screen layout in `web/src/app/chat/`:
  - Desktop: Left sidebar (~30–35% width) and right chat area (~65–70% flex-grow).
  - Mobile (< 768px): Full-width sidebar when no conversation is active; sliding full-width active chat view with back arrow button (`←`) when a conversation is opened.
  - Set `h-[100dvh]` on layout containers to avoid mobile navigation bar height shifts and `overscroll-behavior-y: contain` to prevent accidental pull-to-refresh.
- Global dark/light theme support with toggle and `localStorage` persistence.
- Add WhatsApp doodle wallpaper background in `globals.css` and custom slim scrollbars.

### R3. Core UI Primitives & Notification Audio
- Build reusable UI primitives matching WhatsApp Web design:
  - `Avatar`: Circular avatar with fallback initials and bottom-right online green indicator dot when active.
  - `SearchInput`: Search input with WhatsApp magnifying glass icon, clear button, and global `Ctrl + /` (or `Cmd + /`) keyboard shortcut listener.
  - `DropdownMenu`: Accessible three-dots vertical menu icon (`⋮`) with popover action items.
  - `Modal`: Accessible backdrop overlay modal with escape key listener and focus management.
- Provide notification audio assets in `web/public/sounds/`:
  - `sent.mp3` (message sent pop)
  - `receive.mp3` (notification chime)
  - `ringtone.mp3` (audio call ringing loop)

### R4. Fastify + Native `ws` Socket Server Scaffolding
- Scaffold `socket-server/` with `package.json`, `tsconfig.json`, and dependencies per `TECH_STACK_AND_ENV_CONFIG.md` (`fastify`, `ws`, `@fastify/cors`, `@fastify/cookie`, `dotenv`, `winston`).
- Add the in-memory `RoomManager` (`socket-server/src/lib/roomManager.ts`) and TypeScript `WsEnvelope<T>` envelope definitions.

### R5. Verification & Checklist Update
- Verify all Phase 01 quality gates (builds cleanly with `.next/standalone/server.js`, responsive layouts, shortcut listener).
- Mark completed Phase 1 tasks with `[x]` in `chk.txt`.

## Acceptance Criteria

### Build & Standalone Generation
- [ ] `web/package.json` installs dependencies cleanly and `npm run build` completes with 0 TypeScript/ESLint errors.
- [ ] Next.js standalone build generates `.next/standalone/server.js`.
- [ ] `socket-server/package.json` has all required dependencies and typechecks cleanly.

### Layout & Functional Behavior
- [ ] Navigating to `/chat` renders the two-column WhatsApp Web interface.
- [ ] At viewport width `< 768px`, the layout displays full-width sidebar; opening a conversation displays full-width chat with a working `←` button that returns to the sidebar.
- [ ] Pressing `Ctrl + /` or `Cmd + /` immediately focuses the search input.
- [ ] Notification sound files exist in `web/public/sounds/` (`sent.mp3`, `receive.mp3`, `ringtone.mp3`).
- [ ] WhatsApp doodle pattern and custom scrollbars are visible in the chat interface.

### Checklist Synchronization
- [ ] All 5 Phase 1 checklist items in `chk.txt` are marked `[x]`.


## 2026-10-24T20:12:34Z

Implement and build Phase 02 of the WhatsApp Web clone: strictly production-ready Hostinger Database & Dual-Server Infrastructure Setup. Code and build the Prisma ORM MySQL schema with all 7 models, production SQL migration, seed script, singleton Prisma clients with connection pooling (`connection_limit=10`), Fastify 4+ & native ws daemon with in-memory RoomManager and JWT upgrade authentication, local upload folders, and update Phase 02 checkmarks in chk.txt. Note: As instructed by the user, focus directly on coding and building Phase 02 cleanly.

Working directory: d:/MyGitHubProjects/WebChat
Integrity mode: development

Reference files:
- `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md` (Handoff)
- `phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md` (Specification)
- `TECH_STACK_AND_ENV_CONFIG.md`
- `chk.txt`

## Requirements

### R1. Production-Ready MySQL Prisma Schema & Singleton Clients
- Implement `web/prisma/schema.prisma` strictly with `provider = "mysql"` and all 7 data models: `User`, `Contact`, `Chat`, `ChatParticipant`, `Message`, `MessageStatus`, and `CallLog` (audio-only), adhering to the exact schema, relations, indices, and constraints specified in `phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md`.
- Implement singleton Prisma client instances in `web/src/lib/prisma.ts` and `socket-server/src/lib/prisma.ts` enforcing connection pooling limits (`connection_limit=10&pool_timeout=20`).
- Generate the Prisma Client (`npx prisma generate`).

### R2. Production SQL Migrations & Database Seeding
- Provide production-ready initial migration SQL in `web/prisma/migrations/0_init/migration.sql` ready for `prisma migrate deploy` on Hostinger.
- Create production seed script `web/prisma/seed.ts` seeding demo test accounts (`@ahsan`, `@developer`, `@designer`) with hashed passwords (bcrypt), contacts, a direct chat, sample messages, and message status receipts.
- Configure `.env` in `web/` and `socket-server/` with Hostinger connection string format (`connection_limit=10&pool_timeout=20`), shared `JWT_SECRET`, and port configurations.

### R3. Server #2 Fastify + Native ws Daemon & In-Memory RoomManager
- Bootstrap Fastify 4+ in `socket-server/src/index.ts` with `@fastify/cors` and `@fastify/cookie`.
- Attach native `ws` WebSocketServer to Fastify's HTTP server.
- Implement production in-memory `RoomManager` (`socket-server/src/lib/roomManager.ts`) tracking user active sockets (multi-tab support) and chat rooms (`join`, `leave`, `broadcastToRoom`, `sendToUser`, `isUserOnline`).
- Implement 30-second heartbeat ping-pong to clean up stale mobile connections.
- Expose `GET /health` returning `{ status: "ok", memoryMB: ... }` with RSS target < 35 MB.

### R4. WebSocket JWT Handshake Authentication
- Implement HTTP upgrade authentication in `socket-server/src/middleware/auth.ts`:
  - Extract and parse `auth_token` cookie from request headers.
  - Verify token using shared `JWT_SECRET`.
  - Attach authenticated identity (`userId`, `username`, `isAlive`) to the socket connection.
  - Reject unauthenticated or invalid upgrade requests with HTTP 401.

### R5. Local Uploads Directory Scaffold & Checklist Synchronization
- Scaffold `web/public/uploads/` with subdirectories `avatars/`, `images/`, and `voice/` containing `.gitkeep` and a `.gitignore` ignoring media uploads.
- Build both `web/` and `socket-server/` (`npm run build`).
- Mark completed Phase 02 checklist items with `[x]` in `chk.txt`.

## Acceptance Criteria

### Implementation & Build
- [ ] `web/prisma/schema.prisma` is production MySQL with all 7 models.
- [ ] `npx prisma generate` succeeds and generates the Prisma client.
- [ ] `web/prisma/migrations/0_init/migration.sql` exists with complete DDL for all 7 tables.
- [ ] `web/prisma/seed.ts` is implemented.
- [ ] `web/src/lib/prisma.ts` and `socket-server/src/lib/prisma.ts` export singleton clients.
- [ ] `socket-server/src/index.ts` and `socket-server/src/middleware/auth.ts` implement Fastify + native `ws` with JWT auth and RoomManager.
- [ ] `web/public/uploads/` directory structure created (`avatars/`, `images/`, `voice/`).
- [ ] `npm run build` succeeds across `web/` and `socket-server/`.
- [ ] Phase 2 items in `chk.txt` are checked `[x]`.
