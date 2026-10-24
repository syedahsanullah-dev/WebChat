# WhatsApp Web Clone: Technical Specification & Implementation Plan
## Hostinger Dual Node.js Architecture ($0 / Month Additional Cost) | Fastify + Native `ws` & Mobile PWA

---

## 1. Executive Summary & Core Architectural Decisions

This project is a high-performance web clone of **WhatsApp Web** built with **Next.js 15+**, **Fastify + Native `ws` (WebSockets)**, and **Prisma ORM**, customized to run entirely within an existing **Hostinger Web Hosting Plan** supporting Node.js applications at **$0.00 extra monthly cost**.

### Key Architectural Decisions & Constraints
1. **Identity System (No Phone Numbers)**:
   - Users register, sign in, and discover each other using a **unique `@username`** and **verified Email address**.
   - Phone numbers are completely omitted from the database schemas, API contracts, and UI.
2. **Dual-Server Hostinger Deployment**:
   - **Server #1 (Main Subdomain: `chat.yourdomain.com`)**: Next.js App Router standalone server handling UI, SSR, API routes, user auth, media uploads, and PWA manifest.
   - **Server #2 (Socket Subdomain: `ws.yourdomain.com`)**: Dedicated 24/7 **Fastify + Native `ws`** server handling persistent WebSockets, real-time message broadcasting, online presence, typing states, and WebRTC audio call signaling.
3. **High-Performance Real-Time Engine (Fastify + Native `ws`)**:
   - Replaced Express + Socket.io with Fastify and the native `ws` WebSocket library.
   - **60%+ RAM Reduction**: Fastify + `ws` idles at **~25–35 MB RAM** (versus ~90–120 MB for Express + Socket.io), preventing out-of-memory restarts within Hostinger's CloudLinux container limits.
   - **Direct WebSocket Handshake**: Eliminates HTTP long-polling negotiation and sticky session bugs behind LiteSpeed reverse proxies.
   - **Room Management & Envelope Protocol**: Managed via a clean, lightweight in-memory `RoomManager` and standard JSON envelopes (`WsEnvelope<T>`).
4. **Audio-Only Calling Service (No Video Streaming)**:
   - Video streaming has been completely removed to drastically cut bandwidth, CPU load, and battery consumption.
   - Uses peer-to-peer **WebRTC with Opus high-definition voice codec** (~32–48 kbps).
   - Fastify + `ws` on Server #2 handles call signaling (Offer / Answer / ICE candidates).
   - NAT traversal uses free Google STUN (`stun:stun.l.google.com:19302`) + free Metered.ca TURN relay (50 GB/month free tier).
   - **Over 2,500+ hours of relayed audio calls per month** for free.
5. **Mobile Chrome App Installation (Progressive Web App - PWA)**:
   - Full Mobile Chrome PWA support allowing users to click "Install App" / "Add to Home Screen" directly from the browser.
   - Configured with Web App Manifest (`manifest.json`), service worker for offline fallback and caching, standalone display mode, and custom in-app install banner prompts.
6. **Database Layer & Hostinger NVMe Storage**:
   - Hostinger native **MySQL / MariaDB** database managed via **Prisma ORM** with connection pooling configured (`connection_limit = 10`) to respect Hostinger shared resource thresholds.
   - Local NVMe/SSD storage (`/public/uploads/`) served statically over HTTPS via LiteSpeed/Nginx for avatars, shared images, and voice notes.
7. **Full SDLC Integration at $0 Extra Cost**:
   - Automated testing suite (Vitest + Playwright) and user load simulation (k6 virtual users script).
   - Automated CI/CD pipeline via GitHub Actions deploying to Hostinger over SSH/FTPS.
   - Zero-cost monitoring, crash alerting, automated database cron backups, and UptimeRobot keep-alive pings.
8. **Total Additional Monthly Cost**:
   - **$0.00 / month** (100% utilizes your existing Hostinger subscription and free-tier open-source tooling).
   - Technical & dependency details in [`TECH_STACK_AND_ENV_CONFIG.md`](TECH_STACK_AND_ENV_CONFIG.md).

---

## 2. System Architecture & Topology

```mermaid
graph TD
    ClientMobile["Mobile Chrome / Desktop Browser (Installed PWA)"]

    subgraph Hostinger_Infrastructure ["Hostinger Web Hosting Plan - 0 USD Extra"]
        subgraph Subdomain1 ["Server #1: chat.yourdomain.com (Next.js Standalone)"]
            NextApp["Next.js 15 App Router"]
            AuthEngine["JWT / Cookie Auth Handler"]
            APIRoutes["REST Endpoints & Media Upload Handler"]
            PWAEngine["Service Worker & Manifest.json (PWA)"]
        end

        subgraph Subdomain2 ["Server #2: ws.yourdomain.com (Fastify + Native ws)"]
            FastifyServer["Fastify 4+ & Native ws Daemon (~30 MB RAM)"]
            RoomManager["In-Memory RoomManager (Rooms & Direct Sockets)"]
            PresenceEngine["Online / Offline Tracker & Last Seen"]
            TypingEngine["Live Typing Indicator Dispatcher"]
            AudioSignaling["WebRTC Audio Call Signaling: Offer/Answer/ICE"]
        end

        subgraph HostingerDB ["Hostinger Database Engine"]
            MySQL[("Hostinger MySQL / MariaDB (Pool Max 10)")]
        end

        subgraph HostingerFS ["Hostinger NVMe Storage"]
            UploadsDir["/public/uploads/ (avatars, images, voice notes)"]
        end
    end

    subgraph ExternalFreeServices ["Free External Services (0 USD)"]
        STUN["Google STUN Servers (Free)"]
        TURN["Metered.ca TURN Relay (50 GB/mo Free)"]
        Uptime["UptimeRobot (Free 5-min Keep-Alive)"]
        GitHubActions["GitHub Actions (Free CI/CD)"]
    end

    ClientMobile -->|HTTPS: Page Loads, REST APIs & PWA Assets| NextApp
    ClientMobile -->|WSS: Direct WebSocket Connection (ws)| FastifyServer
    ClientMobile -->|Direct HTTPS: Media Assets & Avatars| UploadsDir
    ClientMobile <-->|P2P WebRTC Opus Audio Stream (STUN/TURN)| ClientMobile

    NextApp -->|Prisma Client (Pool Max 10)| MySQL
    FastifyServer -->|Prisma Client (Pool Max 10)| MySQL
    NextApp -->|Save Uploaded Files| UploadsDir
    FastifyServer -->|Broadcast Events & Messages| ClientMobile

    FastifyServer <-->|Audio Call Signaling| AudioSignaling
    AudioSignaling -.->|Fallback Relay| TURN
    AudioSignaling -.->|Direct NAT Traversal| STUN

    Uptime -->|Ping every 5 mins to prevent sleep| NextApp
    Uptime -->|Ping every 5 mins to prevent sleep| FastifyServer
    GitHubActions -->|Automated SSH/FTPS Deploy on push| Hostinger_Infrastructure
```

---

## 3. Technology Stack & Zero-Cost Breakdown

| Component | Technology / Tool | Role in Project | Hostinger / Tool Cost |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15+ (App Router, React 19, TypeScript)** | UI rendering, client state, routing, server actions | **$0 / mo** (Hostinger Node App #1) |
| **Realtime Engine** | **Fastify 4+ & Native `ws` (WebSockets)** | Ultra-lightweight persistent WebSocket connection (~30 MB RAM) | **$0 / mo** (Hostinger Node App #2) |
| **Database** | **Hostinger MySQL / MariaDB** | Relational persistence for users, contacts, chats, messages, call logs | **$0 / mo** (Included in hPanel) |
| **ORM / Data Access** | **Prisma ORM** | Type-safe migrations, queries, and connection pool management | **$0 / mo** (Open Source) |
| **Mobile Chrome Install** | **PWA (Manifest + Service Worker)** | "Install Website / Add to Home Screen" on Chrome mobile & desktop | **$0 / mo** (Native Web Standard) |
| **Audio Calling** | **WebRTC + Opus Codec** | Peer-to-peer real-time encrypted voice calls (NO video) | **$0 / mo** (Google STUN + Metered TURN) |
| **Media Storage** | **Hostinger NVMe Disk (`/uploads`)** | Direct disk storage for user avatars, compressed images, voice notes | **$0 / mo** (Hostinger disk space) |
| **Automated Testing** | **Vitest + Playwright** | Unit tests for utilities/APIs and end-to-end browser chat flows | **$0 / mo** (Open Source) |
| **Load Simulator** | **k6 (Grafana open source)** | Virtual user load simulation (100–500 simulated users) | **$0 / mo** (Open Source local runner) |
| **CI/CD Deployment** | **GitHub Actions** | Automated lint, test, build, and SSH/FTPS deployment to Hostinger | **$0 / mo** (2,000 free mins/mo) |
| **Monitoring & Uptime** | **UptimeRobot + Winston Logger** | 24/7 process keep-alive pings and rotated error log files | **$0 / mo** (Free Tier) |
| **Database Backups** | **Hostinger Cron Job (`mysqldump`)** | Daily automated compressed database backup to disk | **$0 / mo** (Included in hPanel) |
| **Total Additional Cost** | — | — | **$0.00 / month** |

---

## 4. Complete Database Schema (Prisma Data Models)

Optimized for **MySQL on Hostinger** with indexed foreign keys, small connection footprints, and supporting the **Audio Call Log** and **Username & Email** identity system:

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
  mediaDuration      Float?   // In seconds, for voice recordings
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
  callType   String    @default("audio") @db.VarChar(20) // "audio"
  status     String    @db.VarChar(20) // "missed", "completed", "rejected", "busy"
  duration   Int       @default(0) // Duration in seconds
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

## 5. Implementation Roadmap (Full SDLC)

> [!IMPORTANT]
> **DEVELOPMENT RULE**: **DO NOT START CODING APPLICATION FILES UNTIL EXPLICITLY INSTRUCTED BY THE USER.**
> Each phase below is authored as a standalone guide inside [`phases/`](phases/).

- **Phase 01**: [`phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`](phases/01_WORKSPACE_AND_LAYOUT_SHELL.md)
  - Monorepo scaffold (`web/`, `socket-server/`, `shared/`), Next.js 15 standalone, Tailwind WhatsApp design tokens, 2-column layout.
- **Phase 02**: [`phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md`](phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md)
  - Hostinger MySQL setup, Prisma migrations, Fastify + native `ws` daemon bootstrap, RoomManager, uploads dir.
- **Phase 03**: [`phases/03_AUTHENTICATION_AND_PROFILE.md`](phases/03_AUTHENTICATION_AND_PROFILE.md)
  - Username + email registration, dual login, HTTP-only JWT cookies, Next.js auth middleware, profile drawer.
- **Phase 04**: [`phases/04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md`](phases/04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md)
  - Prefix search API for `@username`, contact cards, adding contacts, starting direct conversations.
- **Phase 05**: [`phases/05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md`](phases/05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md)
  - Live presence over `ws`, last seen timestamps, throttled typing indicator (2.5s).
- **Phase 06**: [`phases/06_ONE_TO_ONE_MESSAGING_ENGINE.md`](phases/06_ONE_TO_ONE_MESSAGING_ENGINE.md)
  - 1-on-1 text messaging, optimistic UI, auto-scroll, delivery receipts (`✓`, `✓✓`, blue `✓✓`).
- **Phase 07**: [`phases/07_MEDIA_SHARING_AND_ATTACHMENTS.md`](phases/07_MEDIA_SHARING_AND_ATTACHMENTS.md)
  - Client-side WebP image compression, uploads to Hostinger NVMe, fullscreen image lightbox.
- **Phase 08**: [`phases/08_VOICE_NOTES_AND_AUDIO_MESSAGING.md`](phases/08_VOICE_NOTES_AND_AUDIO_MESSAGING.md)
  - MediaRecorder audio capture (Opus), Web Audio API peak visualizer, WhatsApp voice note player with speed toggles.
- **Phase 09**: [`phases/09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md`](phases/09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md)
  - Multi-user groups, RoomManager group broadcasting, admin privileges, system event pills.
- **Phase 10**: [`phases/10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md`](phases/10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md)
  - Quoted message replies, hover emoji reaction pill, in-chat text search, message deletion.
- **Phase 11**: [`phases/11_AUDIO_CALLING_WEBRTC_VOICE.md`](phases/11_AUDIO_CALLING_WEBRTC_VOICE.md)
  - Audio-only WebRTC call signaling over `ws`, Google STUN, Metered.ca TURN, active call controls, call logs.
- **Phase 12**: [`phases/12_PWA_AND_MOBILE_CHROME_INSTALLATION.md`](phases/12_PWA_AND_MOBILE_CHROME_INSTALLATION.md)
  - Mobile Chrome PWA install banner, manifest.json, service worker caching, `100dvh` viewport ergonomics.
- **Phase 13**: [`phases/13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md`](phases/13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md)
  - Vitest unit/integration tests, Playwright E2E chat flow, k6 load simulator (100–500 virtual users).
- **Phase 14**: [`phases/14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md`](phases/14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md)
  - GitHub Actions CI/CD to Hostinger, Fastify health checks, `.htaccess` proxy, Winston log rotation, daily DB cron backup.

---

## 6. Capacity, Concurrency & Bandwidth Analysis

### 1. Simulated / Concurrent Users (Boosted by Fastify + Native `ws`)
- **Idle Connected Users**: **~1,000 to 2,000 concurrent WebSocket connections** supported on Server #2 (due to Fastify's ~30 MB idle RAM footprint versus Socket.io's ~90 MB).
- **Active Messaging / Simulated Users**: **~300 to 600 active simulated users** continuously exchanging messages, presence updates, and typing states before reaching Hostinger's standard CloudLinux CPU limits.
- **Database Connection Safety**: Prisma `connection_limit=10` on each server ensures total active MySQL connections never exceed 20, comfortably below Hostinger's limit (50–100 connections).

### 2. Audio-Only Calling Capacity
- **Audio Bitrate**: Opus codec configured at **~32 kbps** (~4 KB/s per client).
- **Direct P2P Calls (via Google STUN)**: **Zero server bandwidth consumed**; unlimited minutes between peers.
- **Relayed Calls (via Metered.ca TURN 50 GB/mo Free Tier)**: **~2,000 to 2,500 hours of relayed audio calls per month** for free.
- **Hostinger Server Impact**: WebRTC audio streaming flows directly between user devices; Fastify Server #2 only passes small JSON signaling envelopes (~200 bytes per event), putting virtually 0% load on Hostinger CPU/bandwidth.
