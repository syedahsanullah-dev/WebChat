# WhatsApp Web Clone: Technical Specification & Implementation Plan
## Hostinger Dual Node.js Architecture ($0 / Month Additional Cost) | 38-Phase Master Blueprint

---

## 1. Executive Summary & Core Architectural Decisions

This project is a modern web clone of **WhatsApp Web** built with **Next.js 15+ App Router**, **Fastify 4+ & Native `ws` (WebSockets)**, and **Prisma ORM**, customized to run entirely within an existing **Hostinger Web Hosting Plan** supporting Node.js applications at **$0.00 extra monthly cost**.

### Key Architectural Decisions & Constraints
1. **Identity System (Direct Authentication - No Phone Numbers, No OTP, No Verification Codes)**:
   - Users register, sign in, and discover each other using a **unique `@username`**, **email**, and **password**.
   - **Strictly NO OTP, NO SMS verification, NO phone numbers, and NO email verification codes.**
   - Frictionless authentication using secure HTTP-only JWT cookies and device session tracking.
2. **Dual-Server Hostinger Deployment**:
   - **Server #1 (Main Subdomain: `chat.yourdomain.com`)**: Next.js App Router standalone server handling UI, SSR, API routes, user auth, media uploads, PWA manifest, admin console, webhooks, and compliance exports.
   - **Server #2 (Socket Subdomain: `ws.yourdomain.com`)**: Dedicated 24/7 **Fastify + Native `ws`** server handling persistent WebSockets, real-time message broadcasting, online presence, typing states, live poll updates, global broadcasts, real-time socket kicks, and WebRTC audio call signaling.
3. **High-Performance Real-Time Engine (Fastify + Native `ws`)**:
   - Replaced Express + Socket.io with Fastify and the native `ws` WebSocket library.
   - **60%+ RAM Reduction**: Fastify + `ws` idles at **~25–35 MB RAM** (versus ~90–120 MB for Express + Socket.io), preventing out-of-memory restarts within Hostinger's CloudLinux container limits.
   - Managed via a clean, lightweight in-memory `RoomManager` and standard JSON envelopes (`WsEnvelope<T>`).
4. **Audio-Only Calling Service (No Video Streaming)**:
   - Video streaming has been completely removed to eliminate heavy CPU load and preserve bandwidth.
   - Uses peer-to-peer **WebRTC with Opus high-definition voice codec** (~32–48 kbps).
   - Fastify + `ws` on Server #2 handles call signaling (Offer / Answer / ICE candidates).
   - NAT traversal uses free Google STUN (`stun:stun.l.google.com:19302`) + free Metered.ca TURN relay (50 GB/month free tier), yielding **over 2,500+ hours of relayed audio calls per month** for free.
5. **Mobile Chrome App Installation (Progressive Web App - PWA)**:
   - Full Mobile Chrome PWA support allowing users to click "Install App" / "Add to Home Screen" directly from the browser.
   - Configured with Web App Manifest (`manifest.json`), service worker for offline fallback and caching, standalone display mode, and custom in-app install banner prompts.
6. **Security & Advanced Feature Extensions**:
   - **Multi-Device Session Management**: Track active devices (OS, browser, IP) with remote revocation and automatic password-change invalidation.
   - **Client-Side End-to-End Encryption (E2EE)**: Web Cryptography API (`SubtleCrypto` ECDH P-256 + AES-GCM-256) for 1-on-1 private messaging with 60-digit safety numbers.
   - **Broadcast Channels & Granular RBAC**: One-way announcement channels with Owner/Admin/Member permissions and read-only subscriber guards.
   - **Interactive Multi-Choice Polls**: Live animated progress bars and real-time voting tallies over WebSocket with voter roster drawer.
   - **Pinned & Starred Messages**: Pinned message header carousel with smooth-scroll jumps, and global starred bookmarks drawer.
   - **Document Sharing**: PDF preview, Excel, Word, Zip files up to 25MB on local storage.
   - **Markdown Code Blocks**: Syntax-highlighted code snippets with Prism.js dark tokens and one-click copy.
   - **Disappearing / Ephemeral Messages**: Auto-deletion timers (24h, 7d, 90d) with 24/7 background media and row cleanup.
   - **Background Web Push Notifications**: Open W3C VAPID protocol delivering notifications even when browser tabs are closed.
   - **Local-First Offline Sync**: IndexedDB message queue (`idb`) with automatic FIFO sync upon reconnection.
   - **Inbound/Outbound Webhooks & Bots**: Connect external systems (GitHub Actions, Jira, CI/CD) and custom slash commands (`/poll`, `/remind`, `/announce`).
   - **Audit Logging & Legal Hold**: Security audit logs, HTML/JSON chat export, and legal hold locks.
7. **Administration & Operations Suite**:
   - **Admin Console (`/admin`)**: Real-time infrastructure metrics (Fastify RAM, active sockets, DB row counts) and storage analytics with orphan file cleaner.
   - **User Administration & Moderation**: User data grid with search, account suspension/ban with real-time socket termination, and role delegation.
   - **Content Moderation & Abuse Reporting**: User reporting queue with conversation context, one-click message purge, and automated regex sensitive data filter (DLP).
   - **Global Broadcasts & Maintenance Mode**: Instant global broadcast alert banners (`system:broadcast`), Maintenance Mode toggle with admin bypass, and on-demand DB backups.
8. **Real-Time Live & Current Location Sharing (Leaflet & OpenStreetMap)**:
   - WhatsApp-standard static and live GPS location sharing using browser Geolocation API, Leaflet.js, and free OpenStreetMap raster tiles ($0.00 / mo, no Google Maps / Mapbox billing).
   - Static reverse geocoding via OpenStreetMap Nominatim with server-side LRU caching.
   - Live location tracking over Server #2 WebSockets with battery-friendly throttling (8s / 10m displacement), countdown timers (15m, 1h, 8h), and multi-user collaborative group maps.
9. **Total Additional Monthly Cost**:
   - **$0.00 / month** (100% utilizes your existing Hostinger subscription and free-tier open-source tooling).
   - Technical & dependency details in [`TECH_STACK_AND_ENV_CONFIG.md`](TECH_STACK_AND_ENV_CONFIG.md).

---

## 2. System Architecture & Topology

```mermaid
graph TD
    ClientMobile["Mobile Chrome / Desktop Browser (Installed PWA)"]

    subgraph Hostinger_Infrastructure ["Hostinger Web Hosting Plan - 0 USD Extra"]
        subgraph Subdomain1 ["Server #1: chat.yourdomain.com (Next.js Standalone)"]
            NextApp["Next.js 15 App Router (UI & SSR)"]
            AuthEngine["JWT & Multi-Device Session Handler"]
            APIRoutes["REST Endpoints, Webhooks & Media Upload Handler"]
            PWAEngine["Service Worker & Manifest.json (PWA)"]
            AuditEngine["Security Audit Logger & Compliance Exporter"]
            AdminConsole["Admin Portal (/admin) & User Management"]
            PushServer["VAPID Web Push Dispatcher"]
        end

        subgraph Subdomain2 ["Server #2: ws.yourdomain.com (Fastify + Native ws)"]
            FastifyServer["Fastify 4+ & Native ws Daemon (~30 MB RAM)"]
            RoomManager["In-Memory RoomManager (Rooms & Direct Sockets)"]
            PresenceEngine["Online / Offline Tracker & Last Seen"]
            TypingEngine["Live Typing Indicator Dispatcher"]
            PollEngine["Live Poll Voting Dispatcher"]
            BroadcastEngine["Real-Time Global Broadcast & Kick Dispatcher"]
            AudioSignaling["WebRTC Audio Call Signaling: Offer/Answer/ICE"]
            CleanupJob["Ephemeral Message & File Cleanup Timer"]
        end

        subgraph HostingerDB ["Hostinger Database Engine"]
            MySQL[("Hostinger MySQL / MariaDB (Pool Max 10)")]
        end

        subgraph HostingerFS ["Hostinger NVMe Storage"]
            UploadsDir["/public/uploads/ (avatars, images, voice notes, docs)"]
        end
    end

    subgraph ExternalFreeServices ["Free External Services (0 USD)"]
        STUN["Google STUN Servers (Free)"]
        TURN["Metered.ca TURN Relay (50 GB/mo Free)"]
        Uptime["UptimeRobot (Free 5-min Keep-Alive)"]
        GitHubActions["GitHub Actions (Free CI/CD)"]
        BrowserPush["Browser Push Gateways: FCM / Apple APNs (Free)"]
    end

    ClientMobile -->|HTTPS: Page Loads, REST APIs, PWA & Admin| NextApp
    ClientMobile -->|WSS: Direct WebSocket Connection (ws)| FastifyServer
    ClientMobile -->|Direct HTTPS: Media Assets & Avatars| UploadsDir
    ClientMobile <-->|P2P WebRTC Opus Audio Stream (STUN/TURN)| ClientMobile

    NextApp -->|Prisma Client (Pool Max 10)| MySQL
    FastifyServer -->|Prisma Client (Pool Max 10)| MySQL
    NextApp -->|Save Uploaded Files| UploadsDir
    FastifyServer -->|Broadcast Envelopes & Messages| ClientMobile

    NextApp -->|Dispatch Push Notifications| BrowserPush
    BrowserPush -->|Wake Service Worker| ClientMobile

    FastifyServer <-->|Audio Call Signaling| AudioSignaling
    AudioSignaling -.->|Fallback Relay| TURN
    AudioSignaling -.->|Direct NAT Traversal| STUN

    Uptime -->|Ping every 5 mins to prevent sleep| NextApp
    Uptime -->|Ping every 5 mins to prevent sleep| FastifyServer
    GitHubActions -->|Automated SSH/FTPS Deploy on push| Hostinger_Infrastructure
```

---

## 3. Technology Stack & Cost Breakdown

| Component | Technology / Tool | Role in Project | Hostinger / Tool Cost |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15+ (App Router, React 19, TypeScript)** | UI rendering, client state, routing, admin console | **$0 / mo** (Hostinger Node App #1) |
| **Realtime Engine** | **Fastify 4+ & Native `ws` (WebSockets)** | Ultra-lightweight persistent WebSocket connection (~30 MB RAM) | **$0 / mo** (Hostinger Node App #2) |
| **Database** | **Hostinger MySQL / MariaDB** | Relational persistence managed via Prisma ORM | **$0 / mo** (Included in hPanel) |
| **ORM / Data Access** | **Prisma ORM** | Type-safe migrations, queries, and connection pool management | **$0 / mo** (Open Source) |
| **Mobile Chrome Install** | **PWA (Manifest + Service Worker)** | "Install Website / Add to Home Screen" on Chrome mobile & desktop | **$0 / mo** (Native Web Standard) |
| **Audio Calling** | **WebRTC + Opus Codec** | Peer-to-peer real-time encrypted voice calls (NO video) | **$0 / mo** (Google STUN + Metered TURN) |
| **Multi-Device Security** | **User-Agent & Session Tokens** | Active device tracking, remote session revocation, direct auth | **$0 / mo** (In-house / Open Source) |
| **End-to-End Encryption**| **Web Cryptography API (SubtleCrypto)** | In-browser ECDH P-256 + AES-GCM-256 message encryption | **$0 / mo** (Native Browser Standard) |
| **Media & Doc Storage** | **Hostinger NVMe Disk (`/uploads`)** | Direct disk storage for avatars, images, voice notes, documents | **$0 / mo** (Hostinger disk space) |
| **Background Push** | **web-push (VAPID protocol)** | Background notifications when app is closed via FCM/APNs | **$0 / mo** (W3C Web Push Protocol) |
| **Offline Sync** | **IndexedDB (`idb`)** | Local-first message caching and offline pending queue | **$0 / mo** (Browser Standard) |
| **Admin Operations** | **Custom Next.js & Fastify Metrics** | Full system administration, moderation & global alerts | **$0 / mo** (In-house / Open Source) |
| **Geolocation & Maps** | **Leaflet.js + OpenStreetMap** | Client-side map rendering, live avatar pins & Nominatim reverse geocoding | **$0 / mo** (Open Source / Free Tiles) |
| **Automated Testing** | **Vitest + Playwright** | Unit tests for utilities/APIs and end-to-end browser chat flows | **$0 / mo** (Open Source) |
| **Load Simulator** | **k6 (Grafana open source)** | Virtual user load simulation (100–500 simulated users) | **$0 / mo** (Open Source local runner) |
| **CI/CD Deployment** | **GitHub Actions** | Automated lint, test, build, and SSH/FTPS deployment to Hostinger | **$0 / mo** (2,000 free mins/mo) |
| **Monitoring & Uptime** | **UptimeRobot + Winston Logger** | 24/7 process keep-alive pings and rotated error log files | **$0 / mo** (Free Tier) |
| **Database Backups** | **Hostinger Cron Job (`mysqldump`)** | Daily automated compressed database backup to disk | **$0 / mo** (Included in hPanel) |
| **Total Additional Cost** | — | — | **$0.00 / month** |

---

## 4. Complete Database Schema (Prisma Data Models)

Optimized for **MySQL on Hostinger** with indexed foreign keys, small connection footprints, and supporting the **38-Phase Suite**:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id               String    @id @default(uuid())
  username         String    @unique(map: "idx_users_username") @db.VarChar(30)
  email            String    @unique(map: "idx_users_email") @db.VarChar(255)
  passwordHash     String    @db.VarChar(255)
  displayName      String    @db.VarChar(100)
  avatarUrl        String?   @db.VarChar(500)
  about            String    @default("Hey there! I am using WebChat.") @db.VarChar(255)
  systemRole       String    @default("USER") @db.VarChar(20) // "SUPER_ADMIN", "ADMIN", "MODERATOR", "USER"
  isSuspended      Boolean   @default(false)
  suspendedAt      DateTime?
  suspensionReason String?   @db.VarChar(255)
  isOnline         Boolean   @default(false)
  lastSeen         DateTime  @default(now())
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  contacts            Contact[]          @relation("UserContacts")
  addedByContacts     Contact[]          @relation("ContactAddedBy")
  chatParticipants    ChatParticipant[]
  sentMessages        Message[]
  messageStatuses     MessageStatus[]
  adminOfGroups       Chat[]             @relation("GroupAdmin")
  initiatedCalls      CallLog[]          @relation("CallerUser")
  receivedCalls       CallLog[]          @relation("ReceiverUser")
  publicKey           UserPublicKey?
  sessions            UserSession[]
  pushSubscriptions   UserPushSubscription[]
  starredMessages     StarredMessage[]
  pollVotes           PollVote[]
  createdPolls        Poll[]             @relation("PollCreator")
  webhooks            Webhook[]          @relation("WebhookCreator")
  reminders           ScheduledReminder[]
  auditLogs           AuditLog[]
  reportsFiled        AbuseReport[]      @relation("ReportFiledBy")
  reportsAgainst      AbuseReport[]      @relation("ReportFiledAgainst")
  reportsResolved     AbuseReport[]      @relation("ReportResolvedBy")
  broadcasts          SystemBroadcast[]
  liveLocations       LiveLocation[]

  @@index([systemRole], map: "idx_users_system_role")
  @@index([isSuspended], map: "idx_users_suspended")
  @@map("users")
}

model UserPublicKey {
  id        String   @id @default(uuid())
  userId    String   @unique(map: "idx_user_public_key")
  publicKey String   @db.Text
  algorithm String   @default("ECDH-P256") @db.VarChar(50)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("user_public_keys")
}

model UserSession {
  id           String    @id @default(uuid())
  userId       String
  sessionToken String    @unique(map: "idx_sessions_token") @db.VarChar(255)
  ipAddress    String?   @db.VarChar(45)
  userAgent    String?   @db.Text
  deviceType   String    @default("DESKTOP") @db.VarChar(20) // "DESKTOP", "MOBILE", "TABLET"
  browser      String?   @db.VarChar(50)
  os           String?   @db.VarChar(50)
  lastActiveAt DateTime  @default(now())
  createdAt    DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, lastActiveAt(sort: Desc)], map: "idx_sessions_user_active")
  @@map("user_sessions")
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
  id                String   @id @default(uuid())
  isGroup           Boolean  @default(false)
  groupTitle        String?  @db.VarChar(100)
  groupDescription  String?  @db.VarChar(500)
  groupAvatarUrl    String?  @db.VarChar(500)
  groupAdminId      String?
  ephemeralDuration Int?     // Duration in seconds: 86400 (24h), 604800 (7d), 7776000 (90d), null = off
  isLegalHold       Boolean  @default(false)
  lastMessageId     String?
  lastMessageAt     DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  admin           User?             @relation("GroupAdmin", fields: [groupAdminId], references: [id], onDelete: SetNull)
  participants    ChatParticipant[]
  messages        Message[]
  callLogs        CallLog[]
  channelMetadata ChannelMetadata?
  pinnedMessages  PinnedMessage[]
  polls           Poll[]
  webhooks        Webhook[]
  reminders       ScheduledReminder[]
  reports         AbuseReport[]
  liveLocations   LiveLocation[]

  @@index([lastMessageAt(sort: Desc)], map: "idx_chats_last_message_at")
  @@map("chats")
}

model ChannelMetadata {
  id              String   @id @default(uuid())
  chatId          String   @unique
  isBroadcastOnly Boolean  @default(true)
  subscriberCount Int      @default(0)
  publicSlug      String?  @unique @db.VarChar(50)

  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  @@map("channel_metadata")
}

model ChatParticipant {
  id         String    @id @default(uuid())
  chatId     String
  userId     String
  role       String    @default("member") @db.VarChar(20)
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
  messageType        String   @default("text") @db.VarChar(20) // "text", "image", "voice", "document", "system_bot"
  content            String?  @db.Text
  isE2EE             Boolean  @default(false)
  e2eeIv             String?  @db.VarChar(50)
  mediaUrl           String?  @db.VarChar(500)
  mediaSize          Int?
  mediaDuration      Float?
  documentName       String?  @db.VarChar(255)
  documentSize       Int?
  documentMime       String?  @db.VarChar(100)
  isCodeBlock        Boolean  @default(false)
  codeLanguage       String?  @db.VarChar(30)
  latitude           Float?
  longitude          Float?
  locationAddress    String?  @db.VarChar(255)
  liveLocationId     String?
  replyToMessageId   String?
  isDeleted          Boolean  @default(false)
  expiresAt          DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  chat            Chat             @relation(fields: [chatId], references: [id], onDelete: Cascade)
  sender          User             @relation(fields: [senderId], references: [id], onDelete: Cascade)
  liveLocation    LiveLocation?    @relation(fields: [liveLocationId], references: [id], onDelete: SetNull)
  statuses        MessageStatus[]
  pinnedIn        PinnedMessage[]
  starredBy       StarredMessage[]
  reports         AbuseReport[]

  @@index([chatId, createdAt(sort: Desc)], map: "idx_messages_chat_created")
  @@index([expiresAt], map: "idx_messages_expires_at")
  @@map("messages")
}

model MessageStatus {
  id        String   @id @default(uuid())
  messageId String
  userId    String
  status    String   @default("sent") @db.VarChar(20)
  updatedAt DateTime @updatedAt

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId], map: "idx_message_user_status_unique")
  @@map("message_statuses")
}

model PinnedMessage {
  id         String   @id @default(uuid())
  chatId     String
  messageId  String
  pinnedById String
  pinnedAt   DateTime @default(now())

  chat     Chat    @relation(fields: [chatId], references: [id], onDelete: Cascade)
  message  Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  pinnedBy User    @relation(fields: [pinnedById], references: [id], onDelete: Cascade)

  @@unique([chatId, messageId], map: "idx_chat_pinned_unique")
  @@map("pinned_messages")
}

model StarredMessage {
  id        String   @id @default(uuid())
  userId    String
  messageId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@unique([userId, messageId], map: "idx_user_starred_unique")
  @@map("starred_messages")
}

model Poll {
  id            String       @id @default(uuid())
  chatId        String
  creatorId     String
  question      String       @db.VarChar(255)
  allowMultiple Boolean      @default(false)
  isAnonymous   Boolean      @default(false)
  createdAt     DateTime     @default(now())

  chat    Chat         @relation(fields: [chatId], references: [id], onDelete: Cascade)
  creator User         @relation("PollCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  options PollOption[]
  votes   PollVote[]

  @@map("polls")
}

model PollOption {
  id     String     @id @default(uuid())
  pollId String
  text   String     @db.VarChar(150)
  order  Int        @default(0)

  poll  Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes PollVote[]

  @@map("poll_options")
}

model PollVote {
  id        String   @id @default(uuid())
  pollId    String
  optionId  String
  userId    String
  createdAt DateTime @default(now())

  poll   Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  option PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  user   User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([pollId, optionId, userId], map: "idx_poll_user_vote_unique")
  @@map("poll_votes")
}

model CallLog {
  id         String    @id @default(uuid())
  chatId     String
  callerId   String
  receiverId String
  callType   String    @default("audio") @db.VarChar(20)
  status     String    @db.VarChar(20)
  duration   Int       @default(0)
  startedAt  DateTime  @default(now())
  endedAt    DateTime?

  chat     Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  caller   User @relation("CallerUser", fields: [callerId], references: [id], onDelete: Cascade)
  receiver User @relation("ReceiverUser", fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([chatId, startedAt(sort: Desc)], map: "idx_call_logs_chat_started")
  @@map("call_logs")
}

model UserPushSubscription {
  id        String   @id @default(uuid())
  userId    String
  endpoint  String   @unique(map: "idx_push_endpoint") @db.VarChar(500)
  p256dh    String   @db.VarChar(255)
  auth      String   @db.VarChar(255)
  userAgent String?  @db.VarChar(255)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId], map: "idx_push_user")
  @@map("user_push_subscriptions")
}

model Webhook {
  id        String   @id @default(uuid())
  chatId    String
  creatorId String
  name      String   @db.VarChar(100)
  token     String   @unique @db.VarChar(64)
  secret    String?  @db.VarChar(64)
  avatarUrl String?  @db.VarChar(500)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  chat    Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  creator User @relation("WebhookCreator", fields: [creatorId], references: [id], onDelete: Cascade)

  @@index([chatId], map: "idx_webhooks_chat")
  @@map("webhooks")
}

model ScheduledReminder {
  id          String   @id @default(uuid())
  userId      String
  chatId      String
  message     String   @db.VarChar(500)
  remindAt    DateTime
  isDelivered Boolean  @default(false)
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@index([remindAt, isDelivered], map: "idx_reminders_pending")
  @@map("scheduled_reminders")
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String   @db.VarChar(50)
  resource  String   @db.VarChar(100)
  ipAddress String   @db.VarChar(45)
  userAgent String?  @db.Text
  metadata  String?  @db.Text
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([action, createdAt(sort: Desc)], map: "idx_audit_action_created")
  @@index([userId, createdAt(sort: Desc)], map: "idx_audit_user_created")
  @@map("audit_logs")
}

model SystemSetting {
  id          String   @id @default(uuid())
  key         String   @unique @db.VarChar(50)
  value       String   @db.Text
  description String?  @db.VarChar(255)
  updatedAt   DateTime @updatedAt

  @@map("system_settings")
}

model AbuseReport {
  id              String    @id @default(uuid())
  reporterId      String
  reportedUserId  String
  messageId       String?
  chatId          String
  category        String    @db.VarChar(50)
  reason          String    @db.VarChar(500)
  status          String    @default("PENDING") @db.VarChar(20)
  resolvedById    String?
  resolutionAction String?  @db.VarChar(50)
  resolutionNotes String?   @db.Text
  createdAt       DateTime  @default(now())
  resolvedAt      DateTime?

  reporter     User     @relation("ReportFiledBy", fields: [reporterId], references: [id], onDelete: Cascade)
  reportedUser User     @relation("ReportFiledAgainst", fields: [reportedUserId], references: [id], onDelete: Cascade)
  resolvedBy   User?    @relation("ReportResolvedBy", fields: [resolvedById], references: [id], onDelete: SetNull)
  chat         Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  message      Message? @relation(fields: [messageId], references: [id], onDelete: SetNull)

  @@index([status, createdAt(sort: Desc)], map: "idx_reports_status_created")
  @@map("abuse_reports")
}

model DlpRule {
  id          String   @id @default(uuid())
  name        String   @db.VarChar(100)
  pattern     String   @db.Text
  category    String   @db.VarChar(50)
  action      String   @default("BLOCK") @db.VarChar(20)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("dlp_rules")
}

model SystemBroadcast {
  id        String    @id @default(uuid())
  creatorId String
  severity  String    @default("INFO") @db.VarChar(20)
  message   String    @db.VarChar(500)
  isActive  Boolean   @default(true)
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  creator User @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  @@map("system_broadcasts")
}

model LiveLocation {
  id         String    @id @default(uuid())
  chatId     String
  userId     String
  latitude   Float
  longitude  Float
  heading    Float?    // Direction in degrees (0–360)
  speed      Float?    // Speed in m/s
  accuracy   Float?    // Accuracy in meters
  comment    String?   @db.VarChar(255)
  isActive   Boolean   @default(true)
  startedAt  DateTime  @default(now())
  expiresAt  DateTime
  updatedAt  DateTime  @updatedAt

  chat     Chat      @relation(fields: [chatId], references: [id], onDelete: Cascade)
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([chatId, isActive], map: "idx_live_location_chat")
  @@index([expiresAt, isActive], map: "idx_live_location_expires")
  @@map("live_locations")
}
```

---

## 5. Master 38-Phase Implementation Roadmap

> [!IMPORTANT]
> **DEVELOPMENT RULE**: **DO NOT START CODING APPLICATION FILES UNTIL EXPLICITLY INSTRUCTED BY THE USER.**
> Each phase below is authored as a standalone guide inside [`phases/`](phases/).

### Part I: Core Production Platform (Phases 01 – 14)
- **Phase 01**: [`phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`](phases/01_WORKSPACE_AND_LAYOUT_SHELL.md) — Monorepo scaffold (`web/`, `socket-server/`, `shared/`), Next.js 15 standalone, Tailwind WhatsApp design tokens, 2-column layout. **(COMPLETED)**
- **Phase 02**: [`phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md`](phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md) — Hostinger MySQL setup, Prisma migrations, Fastify + native `ws` daemon bootstrap, RoomManager, uploads dir.
- **Phase 03**: [`phases/03_AUTHENTICATION_AND_PROFILE.md`](phases/03_AUTHENTICATION_AND_PROFILE.md) — Username + email registration, dual login, HTTP-only JWT cookies, Next.js auth middleware, profile drawer.
- **Phase 04**: [`phases/04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md`](phases/04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md) — Prefix search API for `@username`, contact cards, adding contacts, starting direct conversations.
- **Phase 05**: [`phases/05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md`](phases/05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md) — Live presence over `ws`, last seen timestamps, throttled typing indicator (2.5s).
- **Phase 06**: [`phases/06_ONE_TO_ONE_MESSAGING_ENGINE.md`](phases/06_ONE_TO_ONE_MESSAGING_ENGINE.md) — 1-on-1 text messaging, optimistic UI, auto-scroll, delivery receipts (`✓`, `✓✓`, blue `✓✓`).
- **Phase 07**: [`phases/07_MEDIA_SHARING_AND_ATTACHMENTS.md`](phases/07_MEDIA_SHARING_AND_ATTACHMENTS.md) — Client-side WebP image compression, uploads to Hostinger NVMe, fullscreen image lightbox.
- **Phase 08**: [`phases/08_VOICE_NOTES_AND_AUDIO_MESSAGING.md`](phases/08_VOICE_NOTES_AND_AUDIO_MESSAGING.md) — MediaRecorder audio capture (Opus), Web Audio API peak visualizer, WhatsApp voice note player with speed toggles.
- **Phase 09**: [`phases/09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md`](phases/09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md) — Multi-user groups, RoomManager group broadcasting, admin privileges, system event pills.
- **Phase 10**: [`phases/10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md`](phases/10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md) — Quoted message replies, hover emoji reaction pill, in-chat text search, message deletion.
- **Phase 11**: [`phases/11_AUDIO_CALLING_WEBRTC_VOICE.md`](phases/11_AUDIO_CALLING_WEBRTC_VOICE.md) — Audio-only WebRTC call signaling over `ws`, Google STUN, Metered.ca TURN, active call controls, call logs.
- **Phase 12**: [`phases/12_PWA_AND_MOBILE_CHROME_INSTALLATION.md`](phases/12_PWA_AND_MOBILE_CHROME_INSTALLATION.md) — Mobile Chrome PWA install banner, manifest.json, service worker caching, `100dvh` viewport ergonomics.
- **Phase 13**: [`phases/13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md`](phases/13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md) — Vitest unit/integration tests, Playwright E2E chat flow, k6 load simulator (100–500 virtual users).
- **Phase 14**: [`phases/14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md`](phases/14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md) — GitHub Actions CI/CD to Hostinger, Fastify health checks, `.htaccess` proxy, Winston log rotation, daily DB cron backup.

### Part II: Security, Data & Communications (Phases 15 – 22)
- **Phase 15**: [`phases/15_DEVICE_SESSIONS_AND_MULTI_DEVICE_SECURITY.md`](phases/15_DEVICE_SESSIONS_AND_MULTI_DEVICE_SECURITY.md) — Active session tracking, User-Agent & IP detection, remote session revocation, password change invalidation.
- **Phase 16**: [`phases/16_CLIENT_SIDE_END_TO_END_ENCRYPTION_E2EE.md`](phases/16_CLIENT_SIDE_END_TO_END_ENCRYPTION_E2EE.md) — Client-side E2EE (SubtleCrypto ECDH P-256 + AES-GCM-256), IndexedDB private key store, Safety Numbers.
- **Phase 17**: [`phases/17_BROADCAST_ANNOUNCEMENT_CHANNELS.md`](phases/17_BROADCAST_ANNOUNCEMENT_CHANNELS.md) — Broadcast announcement channels, public slugs, subscriber management, read-only subscriber guard.
- **Phase 18**: [`phases/18_INTERACTIVE_REALTIME_POLLS.md`](phases/18_INTERACTIVE_REALTIME_POLLS.md) — Multi-choice interactive polls, live WebSocket voting tallies, animated percentage bars, voter roster.
- **Phase 19**: [`phases/19_PINNED_AND_STARRED_MESSAGES.md`](phases/19_PINNED_AND_STARRED_MESSAGES.md) — Pinned message header banner carousel with click-to-jump, global starred message bookmarks drawer.
- **Phase 20**: [`phases/20_ENTERPRISE_DOCUMENT_SHARING.md`](phases/20_ENTERPRISE_DOCUMENT_SHARING.md) — Document sharing (PDF, Excel, Word, Zip up to 25MB), local storage, in-app PDF preview.
- **Phase 21**: [`phases/21_MARKDOWN_CODE_BLOCKS_AND_SYNTAX_HIGHLIGHTING.md`](phases/21_MARKDOWN_CODE_BLOCKS_AND_SYNTAX_HIGHLIGHTING.md) — Syntax-highlighted code blocks with Prism.js dark tokens, language badges, one-click copy button.
- **Phase 22**: [`phases/22_EPHEMERAL_AND_DISAPPEARING_MESSAGES.md`](phases/22_EPHEMERAL_AND_DISAPPEARING_MESSAGES.md) — Chat auto-deletion timers (24h, 7d, 90d), clock badges, Fastify 24/7 background media & row purge.

### Part III: Offline Resilience & Developer Integrations (Phases 23 – 26)
- **Phase 23**: [`phases/23_BACKGROUND_WEB_PUSH_NOTIFICATIONS.md`](phases/23_BACKGROUND_WEB_PUSH_NOTIFICATIONS.md) — Background Web Push (W3C VAPID protocol, `web-push`), Service Worker background listener, notification settings.
- **Phase 24**: [`phases/24_LOCAL_FIRST_OFFLINE_SYNC_AND_INDEXEDDB.md`](phases/24_LOCAL_FIRST_OFFLINE_SYNC_AND_INDEXEDDB.md) — Local-first message caching via `idb`, offline outbox queue (clock icon), automatic FIFO reconnect sync.
- **Phase 25**: [`phases/25_INBOUND_AND_OUTBOUND_WEBHOOKS.md`](phases/25_INBOUND_AND_OUTBOUND_WEBHOOKS.md) — Inbound/Outbound webhooks (CI/CD alerts), HMAC SHA-256 signature verification, `BOT` badges, webhook drawer.
- **Phase 26**: [`phases/26_CHATBOTS_AND_SLASH_COMMANDS.md`](phases/26_CHATBOTS_AND_SLASH_COMMANDS.md) — In-chat slash commands (`/poll`, `/remind`, `/announce`, `/help`), popover autocomplete, scheduled reminder daemon.

### Part IV: Compliance & Data Management (Phases 27 – 28)
- **Phase 27**: [`phases/27_IMMUTABLE_SECURITY_AUDIT_LOGGING.md`](phases/27_IMMUTABLE_SECURITY_AUDIT_LOGGING.md) — Security audit logs, event interceptors, searchable audit console (`/admin/audit`), CSV export.
- **Phase 28**: [`phases/28_COMPLIANCE_DATA_EXPORT_AND_LEGAL_HOLD.md`](phases/28_COMPLIANCE_DATA_EXPORT_AND_LEGAL_HOLD.md) — Legal Hold lock, data `.zip` export with styled offline HTML and JSON transcripts via `archiver`.

### Part V: Administration & Operations (Phases 29 – 34)
- **Phase 29**: [`phases/29_ADMIN_CONSOLE_AND_SYSTEM_METRICS.md`](phases/29_ADMIN_CONSOLE_AND_SYSTEM_METRICS.md) — Admin portal layout (`/admin`), Fastify RAM metrics (MB), active socket count, MySQL row counts.
- **Phase 30**: [`phases/30_STORAGE_GOVERNANCE_AND_ORPHAN_CLEANER.md`](phases/30_STORAGE_GOVERNANCE_AND_ORPHAN_CLEANER.md) — Storage analytics (Avatars, Images, Voice, Docs), orphan file scanner, safe disk purger.
- **Phase 31**: [`phases/31_USER_ADMINISTRATION_AND_ROLE_DELEGATION.md`](phases/31_USER_ADMINISTRATION_AND_ROLE_DELEGATION.md) — User administration data grid with multi-column filters, role hierarchy (`USER` to `SUPER_ADMIN`), user details.
- **Phase 32**: [`phases/32_ACCOUNT_MODERATION_BANS_AND_SOCKET_KICKS.md`](phases/32_ACCOUNT_MODERATION_BANS_AND_SOCKET_KICKS.md) — Account suspension and ban workflows, mandatory reason audit, real-time WebSocket kicks (`user:kick`).
- **Phase 33**: [`phases/33_ABUSE_REPORTING_AND_MODERATION_QUEUE.md`](phases/33_ABUSE_REPORTING_AND_MODERATION_QUEUE.md) — User abuse reporting workflow, admin review queue (`/admin/moderation`), context view, message deletion.
- **Phase 34**: [`phases/34_REALTIME_DLP_REGEX_SCANNER.md`](phases/34_REALTIME_DLP_REGEX_SCANNER.md) — In-memory regex sensitive data filter (DLP), preflight blocking of credit cards & API keys, admin rule manager.

### Part VI: Platform Reliability & Emergency Operations (Phases 35 – 36)
- **Phase 35**: [`phases/35_REALTIME_GLOBAL_BROADCASTS.md`](phases/35_REALTIME_GLOBAL_BROADCASTS.md) — Real-time global broadcast alert banners (`system:broadcast`), severity levels (INFO/WARNING/CRITICAL), audio chime.
- **Phase 36**: [`phases/36_MAINTENANCE_MODE_AND_EMERGENCY_BACKUPS.md`](phases/36_MAINTENANCE_MODE_AND_EMERGENCY_BACKUPS.md) — Maintenance Mode switch with admin bypass, public countdown splash, on-demand `mysqldump` backup trigger.

### Part VII: Advanced Geolocation & Mobility (Phases 37 – 38)
- **Phase 37**: [`phases/37_CURRENT_STATIC_LOCATION_SHARING.md`](phases/37_CURRENT_STATIC_LOCATION_SHARING.md) — Static GPS location sharing, Leaflet map card, OpenStreetMap Nominatim reverse geocoding with server LRU cache.
- **Phase 38**: [`phases/38_REALTIME_LIVE_LOCATION_TRACKING.md`](phases/38_REALTIME_LIVE_LOCATION_TRACKING.md) — Real-time live GPS streaming (15m, 1h, 8h), battery throttling (8s / 10m displacement), collaborative group maps.

---

## 6. Capacity, Concurrency & Bandwidth Analysis

### 1. Simulated / Concurrent Users (Fastify + Native `ws`)
- **Idle Connected Users**: **~1,000 to 2,000 concurrent WebSocket connections** supported on Server #2 (due to Fastify's ~30 MB idle RAM footprint versus Socket.io's ~90 MB).
- **Active Messaging / Simulated Users**: **~300 to 600 active simulated users** continuously exchanging messages, presence updates, and typing states before reaching Hostinger's standard CloudLinux CPU limits.
- **Database Connection Safety**: Prisma `connection_limit=10` on each server ensures total active MySQL connections never exceed 20, comfortably below Hostinger's limit (50–100 connections).

### 2. Audio-Only Calling Capacity
- **Audio Bitrate**: Opus codec configured at **~32 kbps** (~4 KB/s per client).
- **Direct P2P Calls (via Google STUN)**: **Zero server bandwidth consumed**; unlimited minutes between peers.
- **Relayed Calls (via Metered.ca TURN 50 GB/mo Free Tier)**: **~2,000 to 2,500 hours of relayed audio calls per month** for free.
- **Hostinger Server Impact**: WebRTC audio streaming flows directly between user devices; Fastify Server #2 only passes small JSON signaling envelopes (~200 bytes per event), putting virtually 0% load on Hostinger CPU/bandwidth.
