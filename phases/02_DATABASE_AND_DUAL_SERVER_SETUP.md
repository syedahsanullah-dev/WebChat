# Phase 02: Hostinger Database & Dual-Server Infrastructure Setup

## 1. Phase Overview & Objectives
**Target Workspace**: `web/prisma/`, `socket-server/`, and Hostinger MySQL  
**Primary Goal**: Provision the Hostinger MySQL database, configure Prisma ORM with strict connection pooling (`connection_limit=10`), execute initial migrations for all 7 core models (including `CallLog`), seed demo accounts, initialize Server #2 (**Fastify 4+ & Native `ws` daemon**), build the in-memory `RoomManager`, and configure Hostinger local NVMe static upload folders.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`01_WORKSPACE_AND_LAYOUT_SHELL.md`](01_WORKSPACE_AND_LAYOUT_SHELL.md) (Workspace scaffolding & layout complete).
- **Environment**: Hostinger MySQL credentials in hPanel, Node.js 20 LTS.
- **Constraints**:
  - Connection pooling: `DATABASE_URL` must have `connection_limit=10` on Server #1 and `connection_limit=10` on Server #2.
  - Server #2 is a standalone Fastify + Native `ws` process in `socket-server/` with startup file `dist/index.js` (memory target: **~25–35 MB RAM**).
  - Media storage is local NVMe (`/public/uploads/`) at $0 cost.
  - Consult [`TECH_STACK_AND_ENV_CONFIG.md`](../TECH_STACK_AND_ENV_CONFIG.md) for full npm packages and `.env` specifications.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── prisma/
│   │   ├── schema.prisma            # 7 Prisma data models with MySQL provider
│   │   ├── migrations/              # Initial SQL migration
│   │   └── seed.ts                  # Seed script with demo test users & sample chats
│   ├── public/
│   │   └── uploads/                 # Local media storage directory
│   │       ├── avatars/             # User profile pictures
│   │       ├── images/              # Shared chat images
│   │       └── voice/               # Voice recording audio clips (.opus/.webm)
│   ├── src/lib/
│   │   └── prisma.ts                # Global singleton Prisma client with connection pooling
│   └── .env                         # DATABASE_URL with connection_limit=10
├── socket-server/                   # Server #2: Fastify + Native ws Application
│   ├── src/
│   │   ├── index.ts                 # Fastify bootstrap + WebSocketServer attachment
│   │   ├── lib/
│   │   │   ├── prisma.ts            # Socket server Prisma instance
│   │   │   └── roomManager.ts       # In-memory RoomManager for WebSocket broadcasting
│   │   └── middleware/
│   │       └── auth.ts              # JWT cookie validation on HTTP upgrade request
│   ├── package.json                 # fastify, ws, @fastify/cors, @fastify/cookie
│   ├── tsconfig.json
│   └── .env                         # PORT=4000, DATABASE_URL, CORS_ORIGIN
└── shared/
    └── src/
        ├── types.ts                 # Common data types
        └── events.ts                # WsEnvelope<T> schemas
```

---

## 4. Complete Prisma Schema (`web/prisma/schema.prisma`)

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String   @id @default(uuid())
  username     String   @unique(map: "idx_users_username") @db.VarChar(30)
  email        String   @unique(map: "idx_users_email") @db.VarChar(255)
  passwordHash String   @db.VarChar(255)
  displayName  String   @db.VarChar(100)
  avatarUrl    String?  @db.VarChar(500)
  about        String   @default("Hey there! I am using WebChat.") @db.VarChar(255)
  isOnline     Boolean  @default(false)
  lastSeen     DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  contacts            Contact[]          @relation("UserContacts")
  addedByContacts     Contact[]          @relation("ContactAddedBy")
  chatParticipants    ChatParticipant[]
  sentMessages        Message[]
  messageStatuses     MessageStatus[]
  adminOfGroups       Chat[]             @relation("GroupAdmin")
  initiatedCalls      CallLog[]          @relation("CallerUser")
  receivedCalls       CallLog[]          @relation("ReceiverUser")

  @@map("users")
}

model Contact {
  id            String   @id @default(uuid())
  userId        String
  contactUserId String
  aliasName     String?  @db.VarChar(100)
  createdAt     DateTime @default(now())

  user        User @relation("UserContacts", fields: [userId], references: [id], onDelete: Cascade)
  contactUser User @relation("ContactAddedBy", fields: [contactUserId], references: [id], onDelete: Cascade)

  @@unique([userId, contactUserId], map: "idx_user_contact_unique")
  @@map("contacts")
}

model Chat {
  id               String   @id @default(uuid())
  isGroup          Boolean  @default(false)
  groupTitle       String?  @db.VarChar(100)
  groupDescription String?  @db.VarChar(500)
  groupAvatarUrl   String?  @db.VarChar(500)
  groupAdminId     String?
  lastMessageId    String?
  lastMessageAt    DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  admin        User?             @relation("GroupAdmin", fields: [groupAdminId], references: [id], onDelete: SetNull)
  participants ChatParticipant[]
  messages     Message[]
  callLogs     CallLog[]

  @@index([lastMessageAt(sort: Desc)], map: "idx_chats_last_message_at")
  @@map("chats")
}

model ChatParticipant {
  id         String    @id @default(uuid())
  chatId     String
  userId     String
  role       String    @default("member") @db.VarChar(20) // "admin" or "member"
  joinedAt   DateTime  @default(now())
  lastReadAt DateTime  @default(now())

  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([chatId, userId], map: "idx_chat_user_unique")
  @@map("chat_participants")
}

model Message {
  id                 String   @id @default(uuid())
  chatId             String
  senderId           String
  messageType        String   @default("text") @db.VarChar(20) // "text", "image", "voice", "system"
  content            String?  @db.Text
  mediaUrl           String?  @db.VarChar(500)
  mediaSize          Int?
  mediaDuration      Float?   // In seconds, for voice notes
  replyToMessageId   String?
  isDeleted          Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  chat     Chat            @relation(fields: [chatId], references: [id], onDelete: Cascade)
  sender   User            @relation(fields: [senderId], references: [id], onDelete: Cascade)
  statuses MessageStatus[]

  @@index([chatId, createdAt(sort: Desc)], map: "idx_messages_chat_created")
  @@map("messages")
}

model MessageStatus {
  id        String   @id @default(uuid())
  messageId String
  userId    String   // Recipient user
  status    String   @default("sent") @db.VarChar(20) // "sent", "delivered", "read"
  updatedAt DateTime @updatedAt

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId], map: "idx_message_user_status_unique")
  @@map("message_statuses")
}

model CallLog {
  id         String    @id @default(uuid())
  chatId     String
  callerId   String
  receiverId String
  callType   String    @default("audio") @db.VarChar(20) // "audio" (video disabled)
  status     String    @db.VarChar(20) // "missed", "completed", "rejected", "busy"
  duration   Int       @default(0) // Seconds
  startedAt  DateTime  @default(now())
  endedAt    DateTime?

  chat     Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  caller   User @relation("CallerUser", fields: [callerId], references: [id], onDelete: Cascade)
  receiver User @relation("ReceiverUser", fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([chatId, startedAt(sort: Desc)], map: "idx_call_logs_chat_started")
  @@map("call_logs")
}
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Environment Configuration & Connection Pooling**:
  - Configure `web/.env` and `socket-server/.env`:
    ```env
    DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE?connection_limit=10&pool_timeout=20"
    JWT_SECRET="generate-secure-random-256-bit-key"
    NEXT_PUBLIC_SOCKET_URL="ws://localhost:4000"
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```
  - Create `web/src/lib/prisma.ts` and `socket-server/src/lib/prisma.ts` with singleton patterns.
- [ ] **2. Prisma Migration & Seed Script**:
  - Run initial migration: `npx prisma migrate dev --name init_schema`.
  - Create `web/prisma/seed.ts` seeding:
    - User 1: `@ahsan` (`ahsan@example.com`, password hashed)
    - User 2: `@developer` (`developer@example.com`, password hashed)
    - User 3: `@designer` (`designer@example.com`, password hashed)
    - One sample direct chat with mock messages and statuses.
  - Execute seed via `npx prisma db seed`.
- [ ] **3. Server #2 Fastify & Native `ws` Bootstrap (`socket-server/src/index.ts`)**:
  - Initialize Fastify with `@fastify/cors` and `@fastify/cookie`.
  - Attach native `WebSocketServer({ server: fastify.server })`.
  - Health check endpoint: `GET /health` returning `{ status: "ok", memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024) }`.
  - Setup 30-second ping-pong interval to disconnect dead mobile clients.
- [ ] **4. In-Memory RoomManager (`socket-server/src/lib/roomManager.ts`)**:
  - Implement `RoomManager` class managing `rooms: Map<string, Set<WebSocket>>` and `userSockets: Map<string, Set<WebSocket>>`.
  - Expose helper methods: `join(room, socket)`, `leave(room, socket)`, `broadcastToRoom(room, data)`, `sendToUser(userId, data)`.
- [ ] **5. WebSocket JWT Handshake Authentication**:
  - Intercept the HTTP upgrade request:
    - Extract `auth_token` cookie.
    - Verify with `JWT_SECRET`.
    - Attach `userId`, `username`, and `isAlive = true` to the socket instance.
    - Reject unauthorized upgrade attempts with HTTP 401.
- [ ] **6. Local Uploads Directory Scaffold**:
  - Create directory `web/public/uploads/` with subdirectories `avatars/`, `images/`, `voice/`.
  - Add `.gitignore` inside `uploads/` ignoring uploaded media while preserving `.gitkeep`.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 02 complete, verify:
1. `npx prisma studio` in `web/` connects to MySQL and shows all 7 tables with seeded data.
2. `npm run dev` in `socket-server/` starts on `http://localhost:4000` with an idle memory usage of **< 35 MB**.
3. `curl http://localhost:4000/health` returns `{ "status": "ok" }`.
4. Connecting via a raw WebSocket client with an invalid cookie drops immediately with HTTP 401.

---

## 7. Handoff to Phase 03
Phase 03 will build the full Authentication & Profile system in `web/` (Username + Email registration, dual login, HTTP-only JWT cookies, Next.js auth middleware, and avatar profile drawer).
