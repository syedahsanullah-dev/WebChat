# Phase 34: Sensitive Data Filter (DLP) Regex Scanner

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Build a Real-Time Sensitive Data Filter (DLP) Regex Scanner at **$0.00 additional monthly cost**. Outgoing messages sent over WebSockets are intercepted in memory by Server #2 and scanned against compiled regex patterns before broadcasting. Pre-configured rules detect and block accidental or malicious leaks of sensitive credentials: API Keys, RSA/SSH Private Keys, Credit Card numbers (with Luhn checksum validation), and National ID formats. Violations are immediately blocked, warned to the sender, and recorded in the audit trail.

> [!IMPORTANT]
> **Authentication Guardrail**: Strictly **NO OTP**, **NO SMS**, and **NO phone verification**. DLP policies are enforced automatically on message payloads in real time.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`33_ABUSE_REPORTING_AND_MODERATION_QUEUE.md`](33_ABUSE_REPORTING_AND_MODERATION_QUEUE.md) (Abuse reporting and moderation operational).
- **Environment**: Next.js 15, Fastify 4+ & Native `ws`, Hostinger MySQL via Prisma (`connection_limit=10`).
- **High Performance Standard**: In-memory regex execution executes in **< 1ms per message**, preserving Fastify's ultra-low latency and low RAM footprint (~25–35 MB).

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   │   └── dlp/
│   │   │   │       └── page.tsx             # Admin DLP Rule Manager & Regex Sandbox
│   │   │   └── api/
│   │   │       └── admin/
│   │   │           └── dlp/
│   │   │               ├── route.ts         # GET (list rules) & POST (create new regex rule)
│   │   │               └── [id]/
│   │   │                   └── route.ts     # PATCH (toggle/edit) & DELETE (remove rule)
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── DlpRulesTable.tsx        # Table of active DLP rules with trigger count
│   │   │   │   ├── CreateDlpRuleModal.tsx   # Modal: Name, Pattern, Category, Action (BLOCK/WARN/LOG)
│   │   │   │   └── DlpTesterWidget.tsx      # In-browser test bench to test regex against sample text
│   │   │   └── chat/
│   │   │       └── DlpBlockedToast.tsx      # Red client error banner when message is rejected
│   │   └── lib/
│   │       └── dlpPatterns.ts               # Core regex library (AWS keys, SSH keys, credit cards)
├── socket-server/
│   └── src/
│       └── middleware/
│           └── dlpScanner.ts                # In-memory Fastify WebSocket preflight scanner
└── shared/
    └── src/
        └── types.ts                         # DlpRuleDefinition, DlpViolationEvent interfaces
```

---

## 4. Real-Time DLP Scanning & Interception Flow

```mermaid
sequenceDiagram
    participant User as Alice (Sender)
    participant WS as Server #2 (Fastify + ws)
    participant Scanner as In-Memory DLP Engine
    participant DB as Hostinger MySQL
    participant Recipient as Bob (Recipient)

    User->>WS: Sends { type: "message:send", payload: { content: "Here is the key: AKIAIOSFODNN7EXAMPLE" } }
    WS->>Scanner: evaluateMessage(content)
    Scanner->>Scanner: Matches pattern /AKIA[0-9A-Z]{16}/ (AWS Secret Key)
    Scanner-->>WS: Match found! Action = "BLOCK", Category = "API_KEY"

    Note over WS,User: Transmission Blocked in < 1ms
    WS->>User: Sends { type: "error", code: "DLP_VIOLATION", message: "Message blocked: Contains sensitive credential (AWS Access Key)" }
    WS->>DB: Records AuditLog (DLP_VIOLATION_BLOCKED)
    Note over WS,Recipient: Message is NEVER broadcasted to Bob
```

---

## 5. Database Schema & Prisma Migrations (`web/prisma/schema.prisma`)

```prisma
model DlpRule {
  id          String   @id @default(uuid())
  name        String   @db.VarChar(100)
  pattern     String   @db.Text
  category    String   @db.VarChar(50)  // "CREDENTIALS", "FINANCIAL", "IDENTITY", "CUSTOM"
  action      String   @default("BLOCK") @db.VarChar(20) // "BLOCK", "WARN", "LOG"
  isActive    Boolean  @default(true)
  matchCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("dlp_rules")
}
```

---

## 6. Step-by-Step Implementation Tasks

- [ ] **1. Pre-Configured DLP Regex Library (`dlpPatterns.ts`)**:
  - Pre-configure industry-standard regex patterns:
    1. **AWS Access Key ID**: `/(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/`
    2. **SSH / RSA Private Keys**: `/-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END/`
    3. **Credit Card Numbers (with Luhn check)**:
       `/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/`
    4. **Social Security Number (US)**: `/\b\d{3}-\d{2}-\d{4}\b/`
    5. **Generic Secret API Key assignment**: `/(?:api_key|apikey|secret_key|private_key)\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}["']?/i`
- [ ] **2. Fastify In-Memory WebSocket Preflight Scanner (`dlpScanner.ts`)**:
  - Load active `DlpRule` list from MySQL into memory on startup; refresh every 5 minutes.
  - Compile regexes into an active rules array.
  - In `messageHandler.ts`, intercept `message:send` envelope before writing to database or calling `roomManager.broadcastToRoom()`:
    - Loop through compiled regexes:
      - If pattern tests positive:
        - If `rule.action === 'BLOCK'`:
          - Reject message immediately.
          - Emit error envelope to sender:
            ```json
            {
              "type": "error",
              "code": "DLP_BLOCKED",
              "message": "Message blocked: Contains sensitive credential or financial data."
            }
            ```
          - Asynchronously record audit log in background: `DLP_VIOLATION_BLOCKED`.
          - Increment `DlpRule.matchCount` in database.
          - Abort broadcast execution (`return`).
- [ ] **3. Admin DLP Management API (`/api/admin/dlp`)**:
  - `GET /api/admin/dlp`: Fetch all DLP rules with match counters.
  - `POST /api/admin/dlp`: Create custom rule with regex validation (checks `new RegExp(pattern)` to prevent server crash).
  - `PATCH /api/admin/dlp/:id`: Toggle `isActive` or change action (`BLOCK` vs `WARN` vs `LOG`).
  - `DELETE /api/admin/dlp/:id`: Remove custom rule.
- [ ] **4. Admin DLP Management UI (`admin/dlp/page.tsx`)**:
  - Header: Shield icon with title *"Data Loss Prevention (DLP)"*.
  - Stat cards: Total Active Rules, Blocked Leaks Count, Top Category.
  - `<DlpRulesTable />`: Lists rule name, regex pattern snippet, category badge, action dropdown, match count, and active toggle switch.
  - "Add Custom Rule" button opening `<CreateDlpRuleModal />`.
- [ ] **5. In-Browser Regex Tester Widget (`DlpTesterWidget.tsx`)**:
  - Interactive sandbox inside the admin page:
    - Textarea to paste test strings (e.g. `test = "AKIA1111111111111111"`).
    - Highlights matching text in red and displays which DLP rule triggered.
- [ ] **6. Client-Side Violation Toast (`DlpBlockedToast.tsx`)**:
  - When the sender's client receives a `DLP_BLOCKED` error:
    - Display prominent red banner: *"Your message was not sent because it contains sensitive data (e.g. credentials, API keys, or financial numbers)."*
    - Message text is retained in the input bar so the user can redact the sensitive part without losing their typed content.

---

## 7. Quality Gate & Verification Criteria

1. Typing and sending a message containing an AWS key (e.g. `AKIAIOSFODNN7EXAMPLE`) is instantly blocked.
2. The sender receives `<DlpBlockedToast />` explaining the block, and the typed text remains in the input bar for editing.
3. The recipient device receives zero message envelopes and sees nothing in their chat.
4. An event is recorded in the `audit_logs` table: `DLP_VIOLATION_BLOCKED`.
5. The rule match counter increments by 1 in the DLP rules table.
6. Admin can disable a rule or create a custom pattern, which takes effect without restarting the server.

---

## 8. Autonomous Multi-Agent Handoff Instructions
The next phase is [`35_REALTIME_GLOBAL_BROADCASTS.md`](35_REALTIME_GLOBAL_BROADCASTS.md). That agent will build real-time global system broadcast announcements (`system:broadcast`) with sliding in-app alert banners and audio chimes.