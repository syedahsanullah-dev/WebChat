# Phase 23: Content Moderation, Abuse Reporting & Automated DLP Filtering

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Safeguard the platform and maintain enterprise regulatory compliance. Implement a user-facing abuse reporting workflow ("Report Message" / "Report User"), an administrative Moderation Review Queue (`/admin/moderation`) with one-click resolution actions, and an automated Data Loss Prevention (DLP) regex filter blocking accidental leaks of credentials, API keys, and sensitive corporate data at **$0.00 additional monthly cost**.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`22_USER_MANAGEMENT_AND_ACCOUNT_MODERATION.md`](22_USER_MANAGEMENT_AND_ACCOUNT_MODERATION.md) (User management, suspensions, and real-time socket kicks operational).
- **Environment**: Next.js 15, Prisma ORM, Fastify Native `ws`.
- **Zero Cost Rule**: DLP filtering runs in-memory via high-performance regular expressions with zero paid external AI moderation APIs.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   │   └── moderation/
│   │   │   │       ├── page.tsx             # Moderation queue: pending reports & resolution history
│   │   │   │       └── dlp/
│   │   │   │           └── page.tsx         # Data Loss Prevention regex rules configuration
│   │   │   └── api/
│   │   │       ├── reports/
│   │   │       │   └── route.ts             # POST /api/reports (user submits report)
│   │   │       └── admin/
│   │   │           ├── moderation/
│   │   │           │   ├── route.ts         # GET /api/admin/moderation (pending queue)
│   │   │           │   └── [reportId]/
│   │   │           │       └── resolve/route.ts # POST resolution (delete msg, warn, mute, dismiss)
│   │   │           └── dlp/
│   │   │               └── route.ts         # GET/POST/PATCH DLP regex rules
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   └── ReportMessageModal.tsx   # User modal with reason selector & comments
│   │   │   └── admin/
│   │   │       ├── ModerationQueueTable.tsx # Admin queue with context snippet & action buttons
│   │   │       ├── ResolutionModal.tsx      # Action selector (Delete, Warn, Mute, Dismiss)
│   │   │       └── DlpRuleManager.tsx       # Pattern editor (API keys, Credit cards, Custom terms)
│   │   └── lib/
│   │       └── dlpFilter.ts                 # High-speed in-memory DLP scanner
├── socket-server/
│   └── src/
│       └── handlers/
│           └── dlpPreflight.ts              # Pre-broadcast DLP validation in WebSocket message handler
└── shared/
    └── src/
        └── types.ts                         # AbuseReport and DlpRule interfaces
```

---

## 4. Abuse Reporting & Moderation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Submitted: User reports message for Spam/Harassment
    Submitted --> UnderReview: Admin opens report in /admin/moderation
    UnderReview --> MessageDeleted: Admin selects "Delete Message & Warn User"
    UnderReview --> UserMuted: Admin selects "Mute User for 24 Hours"
    UnderReview --> Dismissed: Admin marks "False Alarm / Dismiss"
    MessageDeleted --> [*]
    UserMuted --> [*]
    Dismissed --> [*]
```

---

## 5. Prisma Schema Additions (`web/prisma/schema.prisma`)

```prisma
model AbuseReport {
  id              String    @id @default(uuid())
  reporterId      String
  reportedUserId  String
  messageId       String?
  chatId          String
  category        String    @db.VarChar(50)  // "SPAM", "HARASSMENT", "INAPPROPRIATE", "SECURITY_LEAK"
  reason          String    @db.VarChar(500)
  status          String    @default("PENDING") @db.VarChar(20) // "PENDING", "RESOLVED", "DISMISSED"
  resolvedById    String?
  resolutionAction String?  @db.VarChar(50)  // "MESSAGE_DELETED", "USER_WARNED", "USER_MUTED", "DISMISSED"
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
  name        String   @db.VarChar(100) // e.g. "AWS Secret Access Key"
  pattern     String   @db.Text         // Regex pattern
  category    String   @db.VarChar(50)  // "CREDENTIALS", "FINANCIAL", "CUSTOM"
  action      String   @default("BLOCK") @db.VarChar(20) // "BLOCK", "FLAG"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("dlp_rules")
}
```

---

## 6. Detailed Step-by-Step Implementation Tasks

- [ ] **1. User-Facing Abuse Reporting (`ReportMessageModal.tsx`)**:
  - Context menu item on all incoming messages and contact profiles: **"Report"**.
  - Modal form:
    - Reason category: Spam, Harassment, Inappropriate Media, Impersonation, Security Violation.
    - Additional context textarea (optional, max 500 chars).
  - Submits to `POST /api/reports`:
    - Stores report snapshot (including message content at time of report).
    - Returns confirmation toast: *"Thank you. Your report has been submitted to the moderation team."*
- [ ] **2. Administrative Moderation Queue (`/admin/moderation`)**:
  - Data grid displaying pending reports:
    - Reporter `@handle`, Reported user `@handle`, Category badge, Timestamp, Preview snippet.
  - Clicking a report opens `<ModerationResolutionModal />`:
    - Shows message in context (3 messages before and after for surrounding conversation clarity).
    - Resolution choices:
      - 🗑️ **Delete Message**: Erases content and sets `isDeleted = true`.
      - ⚠️ **Warn User**: Posts an official system warning banner to the user.
      - 🔇 **Mute User**: Temporarily disables sending permissions for 24h.
      - 🚫 **Suspend User**: Redirects to suspension dialog from Phase 22.
      - ✕ **Dismiss**: Closes report as non-violating.
    - Automatically updates report status and logs audit event.
- [ ] **3. In-Memory Data Loss Prevention Scanner (`dlpFilter.ts`)**:
  - Pre-compiled high-speed regular expressions:
    - **AWS Access Keys**: `\bAKIA[0-9A-Z]{16}\b`
    - **Generic API Keys / Private Keys**: `-----BEGIN PRIVATE KEY-----` / `\bghp_[a-zA-Z0-9]{36}\b`
    - **Credit Card Numbers**: Visa, MasterCard, Amex patterns matching Luhn checksum.
    - **Custom Forbidden Keywords**: Loaded from `dlp_rules` table.
- [ ] **4. Pre-Broadcast WebSocket DLP Enforcement (`dlpPreflight.ts`)**:
  - In `socket-server` message pipeline:
    - Run outgoing text content against active DLP rules before saving to MySQL.
    - If `action === "BLOCK"` and rule matches:
      - Abort message persistence.
      - Return error envelope to sender:
        ```typescript
        socket.send(JSON.stringify({
          type: 'error',
          payload: { code: 'DLP_VIOLATION', message: 'Message blocked by security policy (detected credentials/sensitive data).' }
        }));
        ```
    - If `action === "FLAG"`:
      - Allow message to send, but automatically generate an `AbuseReport` with `category: "SECURITY_LEAK"`.

---

## 7. Quality Gate & Verification Criteria

Before marking Phase 23 complete, verify:
1. Reporting a message creates a pending record in `abuse_reports`.
2. The Moderation Queue renders the report with conversation context.
3. Clicking "Delete Message" removes the message from the conversation and marks the report resolved.
4. Attempting to send a message containing a dummy AWS key (`AKIAIOSFODNN7EXAMPLE`) triggers an immediate block with a DLP security error.
5. Custom regex patterns configured in `/admin/moderation/dlp` are enforced in real time.

---

## 8. Handoff to Phase 24
Phase 24 will implement Global System Broadcasts, Maintenance Mode, and Emergency System Controls.
