# Scope: Phase 02 Database & Dual-Server Infrastructure Setup

## Architecture
- **Dual-Server Topology ($0 added monthly cost on Hostinger)**:
  - **Server #1 (`web/`, Next.js 15+ App Router standalone)**: Handles UI, SSR, REST APIs, static uploads, PWA. Connects to MySQL via singleton `web/src/lib/prisma.ts` with `connection_limit=10&pool_timeout=20`.
  - **Server #2 (`socket-server/`, Fastify 4+ & Native `ws` daemon)**: Runs 24/7 on port 4000. Memory target RSS < 35 MB on Linux (~70 MB on Windows dev runtime). In-memory `RoomManager` tracks active connections, multi-tab sessions, and chat rooms. Intercepts HTTP upgrade requests for JWT authentication via `socket-server/src/middleware/auth.ts`. Connects to MySQL via singleton `socket-server/src/lib/prisma.ts`.
- **Database (Hostinger MySQL / MariaDB)**:
  - 7 Core Models: `User`, `Contact`, `Chat`, `ChatParticipant`, `Message`, `MessageStatus`, `CallLog` (strictly audio-only, no video fields).
  - Hoisted `@prisma/client` at monorepo root shared by both `web/` and `socket-server/`.
  - Initial migration in `web/prisma/migrations/0_init/migration.sql`.
  - Idempotent seed script in `web/prisma/seed.ts` seeding demo accounts `@ahsan`, `@developer`, `@designer`.
- **Static Media Storage**:
  - `web/public/uploads/` with subdirectories `avatars/`, `images/`, `voice/`. Preserved via `.gitkeep` and excluded via `.gitignore`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | MySQL Prisma Schema (7 models) | `web/prisma/schema.prisma` with User, Contact, Chat, ChatParticipant, Message, MessageStatus, CallLog | M1 | ORIGINAL_REQUEST §R1 |
| F2 | Singleton Prisma Clients | `web/src/lib/prisma.ts` and `socket-server/src/lib/prisma.ts` with connection pooling | M1 | ORIGINAL_REQUEST §R1 |
| F3 | Prisma Client Generation | `npx prisma generate` generating client with native and linux binary targets | M1 | ORIGINAL_REQUEST §R1 |
| F4 | Initial SQL Migration DDL | `web/prisma/migrations/0_init/migration.sql` with full MySQL DDL | M2 | ORIGINAL_REQUEST §R2 |
| F5 | Production Seed Script | `web/prisma/seed.ts` seeding demo accounts (@ahsan, @developer, @designer), contacts, chat, messages, receipts | M2 | ORIGINAL_REQUEST §R2 |
| F6 | Environment Configurations | `web/.env` and `socket-server/.env` with Hostinger connection strings & shared JWT_SECRET | M2 | ORIGINAL_REQUEST §R2 |
| F7 | Fastify 4+ & Native ws Daemon | `socket-server/src/index.ts` with @fastify/cors, @fastify/cookie, 30s heartbeat, GET /health RSS target | M3 | ORIGINAL_REQUEST §R3 |
| F8 | In-Memory RoomManager | `socket-server/src/lib/roomManager.ts` with multi-tab tracking, getters, room broadcasting, zero-leak cleanup | M3 | ORIGINAL_REQUEST §R3 |
| F9 | WebSocket JWT Upgrade Authentication | `socket-server/src/middleware/auth.ts` verifying auth_token cookie / query token, attaching identity, rejecting with 401 | M3 | ORIGINAL_REQUEST §R4 |
| F10 | Local Uploads Scaffold | `web/public/uploads/` with avatars/, images/, voice/, .gitkeep, and media .gitignore | M4 | ORIGINAL_REQUEST §R5 |
| F11 | Cross-Workspace Build & Test | `npm run build` and tests passing across web and socket-server | M4 | ORIGINAL_REQUEST §R5 |
| F12 | Checklist Synchronization | Mark completed Phase 2 checklist items in `chk.txt` | M5 | ORIGINAL_REQUEST §R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Technical Investigation | 3 Explorers analyze schema, socket, tests | none | DONE |
| M1 | Database Schema & Singleton Clients | F1, F2, F3 (`schema.prisma`, singleton clients, generate) | M0 | DONE |
| M2 | SQL Migrations, Seed Script & .env | F4, F5, F6 (`migration.sql`, `seed.ts`, `.env` files) | M1 | DONE |
| M3 | Socket Server Daemon, Auth & RoomManager | F7, F8, F9 (`auth.ts`, `roomManager.ts`, `index.ts`) | M1 | DONE |
| M4 | Uploads Scaffold & Build Verification | F10, F11 (`public/uploads/`, builds, tests) | M2, M3 | DONE |
| M5 | Multi-Agent Review, Challenge & Forensic Audit | Verification across 2 Reviewers, 2 Challengers, 1 Auditor | M4 | DONE |
| M6 | Checklist Sync & Sentinel Handoff | F12 (`chk.txt` update, handoff.md) | M5 | IN_PROGRESS |

## Interface Contracts
### Database Models ↔ Application
- `User`: `{ id: String(uuid), username: String(30), email: String(255), passwordHash: String, displayName: String(100), avatarUrl: String?, about: String, isOnline: Boolean, lastSeen: DateTime }`
- `Contact`: `{ id: String(uuid), userId: String, contactUserId: String, aliasName: String? }` (unique `[userId, contactUserId]`)
- `Chat`: `{ id: String(uuid), isGroup: Boolean, groupTitle: String?, groupDescription: String?, groupAvatarUrl: String?, groupAdminId: String?, lastMessageId: String?, lastMessageAt: DateTime }`
- `ChatParticipant`: `{ id: String(uuid), chatId: String, userId: String, role: "admin" | "member", joinedAt: DateTime, lastReadAt: DateTime }` (unique `[chatId, userId]`)
- `Message`: `{ id: String(uuid), chatId: String, senderId: String, messageType: "text" | "image" | "voice" | "system", content: String?, mediaUrl: String?, mediaSize: Int?, mediaDuration: Float?, replyToMessageId: String?, isDeleted: Boolean }`
- `MessageStatus`: `{ id: String(uuid), messageId: String, userId: String, status: "sent" | "delivered" | "read" }` (unique `[messageId, userId]`)
- `CallLog`: `{ id: String(uuid), chatId: String, callerId: String, receiverId: String, callType: "audio", status: "missed" | "completed" | "rejected" | "busy", duration: Int, startedAt: DateTime, endedAt: DateTime? }`

### WebSocket Upgrade Handshake Contract
- Endpoint: `ws://localhost:4000` (or `ws://ws.yourdomain.com`)
- Headers: `Cookie: auth_token=<jwt>` OR Query: `?token=<jwt>`
- Valid token payload: `{ userId: string, username: string, email?: string, iat: number, exp: number }`
- On Success: Socket upgraded, `(ws as AuthenticatedWebSocket).userId = payload.userId`, `(ws as AuthenticatedWebSocket).username = payload.username`, `(ws as AuthenticatedWebSocket).isAlive = true`. Emits `{ type: "user:online", payload: { userId, timestamp } }`.
- On Failure: Write HTTP `401 Unauthorized` with headers `Connection: close`, destroy socket.

### In-Memory RoomManager Contract
- `join(room: string, socket: WebSocket): void`
- `leave(room: string, socket: WebSocket): void`
- `leaveAll(socket: WebSocket): void`
- `registerUser(userId: string, socket: WebSocket): void`
- `unregisterUser(userId: string, socket: WebSocket): void`
- `isUserOnline(userId: string): boolean`
- `getUserSockets(userId: string): Set<WebSocket> | undefined`
- `getRoomMembers(room: string): Set<WebSocket> | undefined`
- `broadcastToRoom(room: string, data: WsEnvelope<unknown>, excludeSocket?: WebSocket): void`
- `sendToUser(userId: string, data: WsEnvelope<unknown>): void`

## Code Layout
```text
WebChat/
├── web/
│   ├── prisma/
│   │   ├── schema.prisma                       # F1: 7 MySQL Prisma models with binaryTargets
│   │   ├── migrations/0_init/migration.sql      # F4: Initial MySQL DDL
│   │   └── seed.ts                             # F5: Seed script with demo accounts (@ahsan, @developer, @designer)
│   ├── public/uploads/                         # F10: Local static uploads scaffold
│   │   ├── avatars/.gitkeep
│   │   ├── images/.gitkeep
│   │   ├── voice/.gitkeep
│   │   └── .gitignore
│   ├── src/lib/prisma.ts                       # F2: Global singleton Prisma client for Next.js
│   └── .env                                    # F6: DATABASE_URL & JWT_SECRET
├── socket-server/
│   ├── src/
│   │   ├── index.ts                            # F7: Fastify bootstrap + WS upgrade listener + ping-pong + /health
│   │   ├── lib/
│   │   │   ├── prisma.ts                       # F2: Global singleton Prisma client for socket server
│   │   │   └── roomManager.ts                  # F8: In-memory RoomManager with getters and broadcast
│   │   └── middleware/
│   │       └── auth.ts                         # F9: Modular HTTP upgrade JWT cookie verification
│   └── .env                                    # F6: DATABASE_URL, PORT=4000, JWT_SECRET, CORS_ORIGIN
└── chk.txt                                     # F12: Phase 02 checklist items marked [x]
```
