# Phase 21: Super Admin Console, System Metrics & Storage Governance

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Build the central Enterprise Administrative Portal (`/admin`). Establish role-based admin route guards (`role: "SUPER_ADMIN" | "ADMIN"`), real-time infrastructure telemetry (Fastify memory usage, active WebSocket connections, MySQL database table row counts), Hostinger NVMe storage usage visualization by category (avatars, images, voice, docs), and an automated orphan file cleanup utility at **$0.00 additional monthly cost**.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`20_AUDIT_LOGGING_COMPLIANCE_AND_DATA_EXPORT.md`](20_AUDIT_LOGGING_COMPLIANCE_AND_DATA_EXPORT.md) (Audit logging, compliance export, and legal hold operational).
- **Environment**: Next.js 15 App Router, Prisma ORM, Fastify Native `ws`, Hostinger local disk APIs (`fs/promises`).
- **Access Control Rule**: Only authenticated users with `role: "SUPER_ADMIN"` or `role: "ADMIN"` may access `/admin/*` routes. Unprivileged users receive an immediate HTTP 403 Forbidden.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx               # Admin layout with sidebar navigation & security badge
│   │   │   │   ├── page.tsx                 # Metrics overview: active users, sockets, storage, chats
│   │   │   │   └── storage/
│   │   │   │       └── page.tsx             # Disk storage analytics & orphan file cleaner
│   │   │   └── api/
│   │   │       └── admin/
│   │   │           ├── metrics/route.ts     # GET /api/admin/metrics (telemetry aggregator)
│   │   │           └── storage/
│   │   │               ├── analytics/route.ts # GET /api/admin/storage/analytics
│   │   │               └── cleanup/route.ts   # POST /api/admin/storage/cleanup (purge orphans)
│   │   ├── components/
│   │   │   └── admin/
│   │   │       ├── AdminSidebar.tsx         # Navigation: Overview, Users, Moderation, Broadcasts, Settings
│   │   │       ├── MetricCard.tsx           # Telemetry stat widget with trend indicators
│   │   │       ├── StorageBarChart.tsx      # Breakdown: Avatars vs Images vs Voice vs Docs
│   │   │       └── OrphanFilesModal.tsx     # Preview & confirm deletion of unreferenced files
│   │   └── lib/
│   │       ├── adminAuth.ts                 # Middleware helper verifying admin permissions
│   │       └── storageScanner.ts            # Filesystem disk scanner & orphan detection
├── socket-server/
│   └── src/
│       └── routes/
│           └── adminStatsRoute.ts           # Internal Fastify endpoint exposing live socket count & RAM
└── shared/
    └── src/
        └── types.ts                         # SystemMetrics and StorageBreakdown interfaces
```

---

## 4. Prisma Schema Additions (`web/prisma/schema.prisma`)

Add `systemRole` to the `User` model:

```prisma
// Extension to existing User model:
// model User {
//   ...
//   systemRole   String   @default("USER") @db.VarChar(20) // "SUPER_ADMIN", "ADMIN", "MODERATOR", "USER"
//   isSuspended  Boolean  @default(false)
//   suspendedAt  DateTime?
//   suspensionReason String? @db.VarChar(255)
//   @@index([systemRole], map: "idx_users_system_role")
//   @@index([isSuspended], map: "idx_users_suspended")
// }
```

---

## 5. API Contracts & Telemetry Specifications

### 1. System Metrics (`GET /api/admin/metrics`)
- **Authorization**: Requires `systemRole in ["SUPER_ADMIN", "ADMIN"]`.
- **Response (`200 OK`)**:
  ```json
  {
    "users": {
      "total": 1240,
      "online": 182,
      "suspended": 3,
      "newToday": 14
    },
    "messaging": {
      "totalMessages": 89420,
      "messagesToday": 4120,
      "totalChats": 640,
      "activeCalls": 2
    },
    "systemHealth": {
      "server1UptimeSeconds": 864200,
      "server2MemoryMB": 31,
      "server2ActiveSockets": 194,
      "databaseConnectionPool": "healthy",
      "timestamp": "2026-10-27T00:30:00.000Z"
    }
  }
  ```

### 2. Storage Analytics (`GET /api/admin/storage/analytics`)
- **Response (`200 OK`)**:
  ```json
  {
    "totalStorageBytes": 2147483648, // 2.0 GB
    "totalStorageFormatted": "2.0 GB",
    "categories": {
      "avatars": { "bytes": 104857600, "formatted": "100 MB", "fileCount": 1240 },
      "images": { "bytes": 1288490188, "formatted": "1.2 GB", "fileCount": 3840 },
      "voice": { "bytes": 322122547, "formatted": "307 MB", "fileCount": 1520 },
      "docs": { "bytes": 432013313, "formatted": "412 MB", "fileCount": 410 }
    },
    "orphanFilesCount": 12,
    "orphanBytes": 14680064 // 14 MB
  }
  ```

---

## 6. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Admin Authentication & Route Protection (`adminAuth.ts`)**:
  - Implement `verifyAdminRole(request)` helper:
    - Reads session JWT from cookies.
    - Queries `User.systemRole` from MySQL.
    - Throws 403 Forbidden if user is not `SUPER_ADMIN` or `ADMIN`.
  - Next.js Edge Middleware route matcher protecting all `/admin/*` and `/api/admin/*` paths.
- [ ] **2. Fastify Internal Telemetry API (`socket-server/src/routes/adminStatsRoute.ts`)**:
  - Secret-protected internal endpoint: `GET /internal/stats` (requires `X-Internal-Secret` matching `JWT_SECRET`).
  - Returns:
    ```typescript
    {
      memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      activeSockets: roomManager.getActiveSocketCount(),
      activeRooms: roomManager.getRoomCount(),
      uptimeSeconds: Math.floor(process.uptime()),
    }
    ```
- [ ] **3. System Metrics Aggregator (`GET /api/admin/metrics`)**:
  - Combines:
    - Prisma counts: `prisma.user.count()`, `prisma.message.count()`.
    - Internal fetch to Server #2 `/internal/stats`.
    - Hostinger database connection pool check.
- [ ] **4. Super Admin Console Layout & Overview (`/admin`)**:
  - `AdminSidebar.tsx`:
    - WhatsApp dark-green themed enterprise navigation:
      - 📊 Overview (`/admin`)
      - 👥 Users (`/admin/users`)
      - 🛡️ Moderation (`/admin/moderation`)
      - 📢 Broadcasts (`/admin/broadcasts`)
      - 💾 Storage (`/admin/storage`)
      - ⚙️ Settings (`/admin/settings`)
    - "Back to Chat" quick button.
  - `page.tsx`:
    - Grid of `<MetricCard />` widgets (Total Users, Active Sockets, Messages Today, Memory).
    - Status pill: *"Fastify Daemon: Healthy (28 MB RAM)"*.
- [ ] **5. Hostinger Storage Analytics & Orphan File Cleaner (`storageScanner.ts`)**:
  - Recursively scans `/public/uploads/` (`avatars/`, `images/`, `voice/`, `docs/`).
  - Computes exact disk size using `fs.stat()`.
  - Orphan detection:
    - Gathers all file paths on disk.
    - Queries MySQL `User.avatarUrl`, `Message.mediaUrl`.
    - Identifies files on disk that have no matching database record.
  - `POST /api/admin/storage/cleanup`:
    - Deletes orphan files safely with dry-run support.
    - Logs audit log event `admin.storage.cleanup`.

---

## 7. Quality Gate & Verification Criteria

Before marking Phase 21 complete, verify:
1. Accessing `/admin` as a standard user (`systemRole: "USER"`) returns HTTP 403 Forbidden.
2. Setting `systemRole: "SUPER_ADMIN"` on a user account grants full access to `/admin`.
3. The Admin Overview page accurately reflects active WebSocket connection counts and memory usage reported by Server #2.
4. Storage analytics calculates the file counts and sizes across avatars, images, voice notes, and documents.
5. The Orphan File Cleaner identifies test files unreferenced in the database and safely unlinks them from disk.

---

## 8. Handoff to Phase 22
Phase 22 will implement User Management, Account Moderation, and Real-Time Session Enforcement (searchable user table, user suspension/ban, role delegation, and real-time socket disconnection).
