# Phase 20: Enterprise Audit Logging, Compliance Data Export & Legal Hold

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Satisfy enterprise corporate governance, legal compliance (GDPR / HIPAA alignment), and administrative observability at **$0.00 additional monthly cost**. Build an immutable Security Audit Log capturing all critical events, a Compliance Chat Export engine generating standalone offline HTML and JSON `.zip` archives, and a Legal Hold governance lock that overrides message deletion policies during audits.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`19_WEBHOOKS_BOTS_AND_EXTERNAL_INTEGRATIONS.md`](19_WEBHOOKS_BOTS_AND_EXTERNAL_INTEGRATIONS.md) (Webhooks and bot system complete).
- **Environment**: Next.js 15, Prisma ORM, Archiver (native zip creation), Hostinger NVMe storage.
- **Compliance Rule**: Audit logs must be append-only (no update or delete operations permitted). Legal hold chats must block physical deletion of messages and media.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   │   ├── audit-logs/
│   │   │   │   │   └── page.tsx         # Searchable enterprise audit log viewer
│   │   │   │   └── compliance/
│   │   │   │       └── page.tsx         # Compliance export & legal hold management
│   │   │   └── api/
│   │   │       ├── admin/
│   │   │       │   ├── audit-logs/route.ts # GET /api/admin/audit-logs (filtered query)
│   │   │       │   └── legal-hold/route.ts # POST/PATCH legal hold toggle
│   │   │       ├── export/
│   │   │       │   ├── chat/[chatId]/route.ts # POST /api/export/chat/[chatId] (generates .zip)
│   │   │       │   └── my-data/route.ts # POST /api/export/my-data (GDPR export)
│   │   │       └── user/
│   │   │           └── delete-account/route.ts # POST /api/user/delete-account
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AuditLogTable.tsx    # Filterable data grid with export to CSV
│   │   │   │   └── LegalHoldModal.tsx   # Lock conversation against message deletions
│   │   │   └── export/
│   │   │       └── ExportChatModal.tsx  # Format selector (HTML or JSON) & date range picker
│   │   └── lib/
│   │       ├── auditLogger.ts           # Centralized audit logging helper
│   │       └── complianceExporter.ts    # HTML transcript generator & zip packager
└── shared/
    └── src/
        └── types.ts                     # AuditLogEvent and ExportOptions interfaces
```

---

## 4. Prisma Schema Additions (`web/prisma/schema.prisma`)

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?  // Nullable for system actions or failed logins
  action    String   @db.VarChar(50)  // "auth.login", "auth.failed", "2fa.enable", "group.create", "member.remove", "webhook.create", "legal_hold.enable"
  resource  String   @db.VarChar(100) // e.g. "Chat:uuid-123" or "User:uuid-456"
  ipAddress String   @db.VarChar(45)
  userAgent String?  @db.Text
  metadata  String?  @db.Text         // JSON string with detailed context
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([action, createdAt(sort: Desc)], map: "idx_audit_action_created")
  @@index([userId, createdAt(sort: Desc)], map: "idx_audit_user_created")
  @@map("audit_logs")
}

// Extension to Chat model:
// model Chat {
//   ...
//   isLegalHold Boolean @default(false) // If true, overrides all message deletion & ephemeral timers
// }
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Centralized Audit Logger (`web/src/lib/auditLogger.ts`)**:
  - Implements immutable recording:
    ```typescript
    export async function logAuditEvent({
      userId,
      action,
      resource,
      ipAddress,
      userAgent,
      metadata,
    }: AuditEventParams) {
      return prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          ipAddress,
          userAgent,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    }
    ```
  - Instruments key system events:
    - `auth.login.success`, `auth.login.failure`, `auth.logout`
    - `auth.2fa.enabled`, `auth.2fa.disabled`
    - `chat.group.created`, `chat.member.added`, `chat.member.removed`, `chat.role.changed`
    - `message.delete_for_everyone`
    - `webhook.created`, `webhook.deleted`
    - `compliance.legal_hold.toggled`
- [ ] **2. Searchable Audit Log Console (`AuditLogTable.tsx`)**:
  - Clean administrative data table:
    - Columns: Timestamp, Action Type badge, Initiated By (`@username` or IP), Target Resource, IP Address.
    - Quick filters: Date range, Action category (Auth, Governance, Security), Username search.
    - Export button: Downloads filtered audit log as a CSV file.
- [ ] **3. Legal Hold Governance Lock (`LegalHoldModal.tsx`)**:
  - Setting available to Enterprise Admins and Compliance Officers:
    - Toggle "Legal Hold" on any group or 1-on-1 chat.
    - When `isLegalHold = true`:
      - Disappearing/ephemeral timers are suspended; messages are preserved.
      - "Delete for everyone" action is disabled; attempting deletion returns an explanatory error: *"This conversation is under a compliance legal hold and messages cannot be deleted."*
      - Pinned banner displayed: *"⚖️ Legal Hold Active: Message retention is enforced for compliance."*
- [ ] **4. Compliance Chat Export Engine (`complianceExporter.ts`)**:
  - `POST /api/export/chat/[chatId]`:
    - Options: Date range (start date, end date), Format (`HTML` or `JSON`), Include media files (`true`/`false`).
    - Generates standalone, responsive HTML transcript mimicking the WhatsApp UI with inline message timestamps, sender names, status ticks, and media thumbnails.
    - Packages HTML file, shared media assets, and a `manifest.json` metadata checksum into a compressed `.zip` archive using `archiver`.
    - Streams download directly to the client browser.
- [ ] **5. GDPR "Download My Data" & Account Deletion**:
  - User Settings > Privacy > "Download My Account Data":
    - Generates `.zip` with user profile, contact list, and full chat export.
  - User Settings > Privacy > "Delete My Account":
    - Prompts for password and 2FA confirmation.
    - Anonymizes sent messages or executes cascading deletion based on organization policy.
    - Records audit log event `user.account.deleted`.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 20 complete, verify:
1. Performing sensitive actions (login, 2FA setup, member removal) automatically writes corresponding records to the `audit_logs` table.
2. The Audit Log Admin Table renders all events with filtering and CSV export functional.
3. Enabling Legal Hold on a chat successfully blocks "Delete for everyone" and halts ephemeral message expiration.
4. Exporting a chat generates a downloadable `.zip` file containing a self-contained, beautifully formatted HTML transcript with media files.
5. "Download My Data" generates a valid GDPR-compliant export archive.

---

## 7. Master Enterprise Blueprint Sign-Off
With Phase 20 complete, the WebChat platform satisfies all consumer and enterprise communication standards:
- **Phases 01–14**: Core WhatsApp Web Clone & Production Deployment.
- **Phases 15–20**: Enterprise Security, 2FA, E2EE, Channels, Polls, Documents, Web Push, Offline Sync, Webhooks, Bots, and Compliance Governance.
