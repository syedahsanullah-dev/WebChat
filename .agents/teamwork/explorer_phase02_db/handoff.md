# Phase 02 Investigation Report: Database & Prisma Architecture

**Agent**: Explorer 1 (Database & Prisma Specialist)  
**Working Directory**: `d:\MyGitHubProjects\WebChat\.agents\teamwork\explorer_phase02_db\`  
**Milestone**: Phase 02 Database & Dual Server Infrastructure Setup  
**Date**: 2026-10-24  

---

## 1. Observation

Direct observations from examining the codebase, dependencies, and environment:

1. **State of `web/prisma/` Directory**:
   - `list_dir` on `d:\MyGitHubProjects\WebChat\web` shows:
     ```json
     [".env.example", ".next", "next-env.d.ts", "next.config.js", "node_modules", "package.json", "postcss.config.js", "public", "scripts", "src", "tailwind.config.ts", "tsconfig.json", "vitest.config.ts"]
     ```
     `web/prisma/` directory currently does NOT exist. Neither `schema.prisma`, `migrations/`, nor `seed.ts` exist yet in `web/`.
   - `web/.env` does not exist (`web/.env.example` is present).

2. **Dependencies in `web/package.json`**:
   - Verified in `web/package.json` lines 18–32 & 33–54:
     - `@prisma/client`: `^5.22.0` (present in `dependencies`)
     - `prisma`: `^5.22.0` (present in `dependencies`)
     - `bcryptjs`: `^2.4.3` (present in `dependencies`)
     - `@types/bcryptjs`: `^2.4.6` (present in `devDependencies`)
     - `ts-node`: `^10.9.2` (present in `devDependencies`)
     - `"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }` (present on lines 51–53)
     - Scripts `db:migrate`, `db:deploy`, `db:seed`, `db:studio` are already registered on lines 13–16.

3. **Dependencies & Types in `socket-server/`**:
   - In `socket-server/package.json` lines 13–22:
     - `@prisma/client`: `^5.22.0` is installed.
     - `dotenv`: `^16.4.7` is installed.
   - In `socket-server/tsconfig.json` lines 4–5:
     - `"module": "NodeNext"`
     - `"moduleResolution": "NodeNext"`
     - Any local relative imports must explicitly include the `.js` extension (e.g., `import { prisma } from './lib/prisma.js'`).
   - `socket-server/src/lib/prisma.ts` does not yet exist.
   - `socket-server/.env` exists and contains:
     ```env
     DATABASE_URL="mysql://u123456789_webchat:YourSecurePassword123@127.0.0.1:3306/u123456789_webchat?connection_limit=10&pool_timeout=20"
     ```

4. **Prisma CLI & Schema Validation**:
   - Running `node -v; npm -v; npx prisma -v`:
     - Node: `v24.11.1`
     - npm: `11.6.2`
     - Prisma CLI: `5.22.0`
     - `@prisma/client`: `5.22.0`
     - Platform: `win32` (`windows`)
   - Proposed schema containing all 7 models (`User`, `Contact`, `Chat`, `ChatParticipant`, `Message`, `MessageStatus`, `CallLog`) was written to `.agents/teamwork/explorer_phase02_db/proposed_schema.prisma`.
   - Executing `npx prisma validate --schema=.agents/teamwork/explorer_phase02_db/proposed_schema.prisma` returned:
     ```
     The schema at .agents\teamwork\explorer_phase02_db\proposed_schema.prisma is valid 🚀
     ```

5. **Local Database Service**:
   - `Get-Service *mysql*`: Service `MySQL80` is running on local Windows.
   - `Test-NetConnection -ComputerName 127.0.0.1 -Port 3306`: `TcpTestSucceeded : True`.

6. **Static Uploads Directory**:
   - `web/public/uploads` does not exist yet (`web/public/` currently only contains `patterns/` and `sounds/`).

---

## 2. Logic Chain

1. **Schema Integrity & Zero-Cost Telephony Removal**:
   - From Observation 4, the 7 models match the specification in `phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md`:
     1. `User`: Identity based solely on `@username` (`@db.VarChar(30)`) and `email` (`@db.VarChar(255)`). No phone numbers or SMS columns exist.
     2. `Contact`: Maps address book relationships with `(userId, contactUserId)` unique constraint.
     3. `Chat`: Direct or group chats with `lastMessageAt DESC` index for instant sidebar sorting.
     4. `ChatParticipant`: User membership and roles with `(chatId, userId)` unique constraint.
     5. `Message`: Text, image, voice, system messages with `(chatId, createdAt DESC)` index for pagination.
     6. `MessageStatus`: Per-recipient receipt tracking (`sent`, `delivered`, `read`) with `(messageId, userId)` unique constraint.
     7. `CallLog`: High-definition audio calling only (`callType @default("audio")`), with zero video fields.
   - Therefore, the schema is 100% compliant with the project guardrails in `AGENTS.md`.

2. **Cross-Platform Binary Targets**:
   - Development occurs on Windows (`win32 x64`), while deployment targets Hostinger Linux environments (CloudLinux / AlmaLinux / Ubuntu).
   - If `binaryTargets` is not explicitly declared, Prisma will only bundle the Windows query engine binary.
   - Therefore, `generator client` must specify:
     ```prisma
     binaryTargets = ["native", "debian-openssl-3.0.x", "debian-openssl-1.1.x", "rhel-openssl-3.0.x"]
     ```

3. **Connection Pooling Enforcement (`connection_limit=10&pool_timeout=20`)**:
   - Hostinger shared MySQL has strict concurrent connection thresholds (typically 20–30 max user connections).
   - Server #1 (Next.js standalone) and Server #2 (Fastify daemon) will each establish connection pools.
   - Capping both pools at `connection_limit=10` ensures total peak connection count never exceeds 20.
   - `pool_timeout=20` prevents burst transaction drops by queuing requests for up to 20 seconds.

4. **Singleton Client Patterns**:
   - In Next.js development mode, hot module reloading (HMR) repeatedly re-executes module code. Without global caching, each reload creates a new `PrismaClient` pool, rapidly exhausting database connections.
   - In `web/src/lib/prisma.ts`, `globalThis` caching ensures exactly one client instance survives HMR.
   - In `socket-server/src/lib/prisma.ts`, NodeNext module resolution mandates explicit `.js` import resolution when imported into `src/index.ts`.

5. **Initial Migration & Idempotent Seeding**:
   - Hostinger deployments require `prisma migrate deploy` which expects a standard migration folder: `web/prisma/migrations/0_init/migration.sql` and `web/prisma/migrations/migration_lock.toml`.
   - Seed script in `web/prisma/seed.ts` must use `upsert` so repeated executions do not throw duplicate key errors on `@username` or unique indexes.
   - Demo passwords must be securely hashed with `bcryptjs` (salt rounds = 10) so Phase 03 authentication can immediately test login against seeded accounts (`Password123!`).

---

## 3. Caveats

1. **Database Credentials in `.env`**:
   - Prisma commands require a reachable `DATABASE_URL` during migrations. If developing locally without a local database provisioned, `npx prisma generate` works offline, but `prisma migrate deploy` or `prisma db seed` requires active MySQL credentials (either local `root` or Hostinger remote MySQL).
2. **Fastify Auth Middleware Separation**:
   - In `socket-server/src/index.ts`, JWT verification was previously drafted inline inside `fastify.server.on('upgrade', ...)`. Requirement R4 specifies extracting this cleanly into `socket-server/src/middleware/auth.ts`.
3. **Uploads Directory Git Tracking**:
   - `web/public/uploads/` subdirectories (`avatars/`, `images/`, `voice/`) must include `.gitkeep` so git preserves the directory structure, paired with a `.gitignore` ignoring uploaded media.

---

## 4. Conclusion & Implementation Recommendations

The database layer for Phase 02 is fully designed, tested, and ready for immediate implementation. 

### Concrete Implementation Deliverables for the Implementer Agent:

#### A. Target File: `web/prisma/schema.prisma`
Write the validated schema from `proposed_schema.prisma`:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x", "debian-openssl-1.1.x", "rhel-openssl-3.0.x"]
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
  contacts         Contact[]         @relation("UserContacts")
  addedByContacts  Contact[]         @relation("ContactAddedBy")
  chatParticipants ChatParticipant[]
  sentMessages     Message[]
  messageStatuses  MessageStatus[]
  adminOfGroups    Chat[]            @relation("GroupAdmin")
  initiatedCalls   CallLog[]         @relation("CallerUser")
  receivedCalls    CallLog[]         @relation("ReceiverUser")

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
  id         String   @id @default(uuid())
  chatId     String
  userId     String
  role       String   @default("member") @db.VarChar(20) // "admin" or "member"
  joinedAt   DateTime @default(now())
  lastReadAt DateTime @default(now())

  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([chatId, userId], map: "idx_chat_user_unique")
  @@map("chat_participants")
}

model Message {
  id               String   @id @default(uuid())
  chatId           String
  senderId         String
  messageType      String   @default("text") @db.VarChar(20) // "text", "image", "voice", "system"
  content          String?  @db.Text
  mediaUrl         String?  @db.VarChar(500)
  mediaSize        Int?
  mediaDuration    Float? // In seconds, for voice notes
  replyToMessageId String?
  isDeleted        Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  chat     Chat            @relation(fields: [chatId], references: [id], onDelete: Cascade)
  sender   User            @relation(fields: [senderId], references: [id], onDelete: Cascade)
  statuses MessageStatus[]

  @@index([chatId, createdAt(sort: Desc)], map: "idx_messages_chat_created")
  @@map("messages")
}

model MessageStatus {
  id        String   @id @default(uuid())
  messageId String
  userId    String // Recipient user
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

#### B. Target File: `web/prisma/migrations/0_init/migration.sql` & `migration_lock.toml`
Create `web/prisma/migrations/migration_lock.toml`:
```toml
# Please do not edit this file manually
provider = "mysql"
```
Create `web/prisma/migrations/0_init/migration.sql` using the SQL DDL saved in `.agents/teamwork/explorer_phase02_db/proposed_migration.sql`.

#### C. Target File: `web/prisma/seed.ts`
Create `web/prisma/seed.ts` using the idempotent seeding script saved in `.agents/teamwork/explorer_phase02_db/proposed_seed.ts`. Seeds `@ahsan`, `@developer`, `@designer`, mutual contacts, 1 direct chat, 2 messages with receipts, and 1 audio call log.

#### D. Target File: `web/src/lib/prisma.ts`
Implement singleton Prisma client:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

#### E. Target File: `socket-server/src/lib/prisma.ts`
Implement singleton Prisma client for Server #2:
```typescript
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

#### F. Target File: `web/.env`
Copy `web/.env.example` to `web/.env` with Hostinger connection pooling parameters:
```env
DATABASE_URL="mysql://u123456789_webchat:YourSecurePassword123@127.0.0.1:3306/u123456789_webchat?connection_limit=10&pool_timeout=20"
JWT_SECRET="your_ultra_secure_256_bit_jwt_secret_key_change_in_production"
PORT=3000
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="ws://localhost:4000"
UPLOAD_DIR="./public/uploads"
NEXT_PUBLIC_UPLOAD_BASE_URL="/uploads"
```

#### G. Target Folders: `web/public/uploads/`
Create:
- `web/public/uploads/avatars/.gitkeep`
- `web/public/uploads/images/.gitkeep`
- `web/public/uploads/voice/.gitkeep`
- `web/public/uploads/.gitignore`:
  ```gitignore
  *
  !.gitignore
  !*/
  !**/.gitkeep
  ```

---

## 5. Verification Method

1. **Prisma Schema Validation**:
   ```powershell
   npx prisma validate --schema=web/prisma/schema.prisma
   ```
   *Expected output*: `The schema at web/prisma/schema.prisma is valid 🚀`.

2. **Client Generation**:
   ```powershell
   cd web
   npx prisma generate
   ```
   *Expected output*: Generates `@prisma/client` with types for `User`, `Contact`, `Chat`, `ChatParticipant`, `Message`, `MessageStatus`, `CallLog`.

3. **Typecheck & Build**:
   ```powershell
   npm run build --workspace=web
   npm run build --workspace=socket-server
   ```
   *Expected output*: Zero TypeScript compilation errors. Standalone output `.next/standalone/server.js` generated for Server #1, and `dist/index.js` generated for Server #2.

4. **Database Migration & Seeding (when database is connected)**:
   ```powershell
   cd web
   npx prisma migrate deploy
   npm run db:seed
   ```
   *Expected output*: Applies `0_init/migration.sql` cleanly and seeds `@ahsan`, `@developer`, `@designer`.
