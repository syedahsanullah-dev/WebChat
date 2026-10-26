# Phase 17: Enterprise Document Sharing, Code Blocks & Ephemeral Messages

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Equip WebChat with enterprise file exchange and technical collaboration tools: Full document sharing (`.pdf`, `.docx`, `.xlsx`, `.zip`) with in-app PDF previewing, syntax-highlighted markdown code blocks with one-click copying, and Disappearing / Ephemeral Messages with automated server-side expiration and storage cleanup at **$0.00 extra monthly cost**.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`16_ENTERPRISE_CHANNELS_POLLS_AND_GOVERNANCE.md`](16_ENTERPRISE_CHANNELS_POLLS_AND_GOVERNANCE.md) (Channels, polls, and message governance complete).
- **Environment**: Next.js 15, PrismJS (bundle-optimized syntax highlighter), Hostinger NVMe storage (`/public/uploads/docs/`).
- **Storage Rule**: Files are saved directly to Hostinger disk with unique UUID filenames; expired ephemeral attachments are purged from disk automatically to conserve quota.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/api/
│   │   │   ├── upload/
│   │   │   │   └── doc/
│   │   │   │       └── route.ts         # POST /api/upload/doc (documents up to 25MB)
│   │   │   └── chats/[chatId]/
│   │   │       └── ephemeral/route.ts   # PATCH /api/chats/[chatId]/ephemeral (set timer)
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── DocumentBubble.tsx   # File card with type badge, size, and download button
│   │   │   │   ├── DocumentPreviewModal.tsx # In-browser viewer for PDFs and text documents
│   │   │   │   ├── CodeBlockBubble.tsx  # Syntax-highlighted code block with language & copy button
│   │   │   │   └── EphemeralNoticeBanner.tsx # "Disappearing messages are turned on (7 days)"
│   │   │   └── settings/
│   │   │       └── EphemeralSettingsModal.tsx # Options: Off, 24 Hours, 7 Days, 90 Days
│   │   └── lib/
│   │       ├── documentUtils.ts         # File type icons, MIME validators & formatters
│   │       └── codeHighlighter.ts       # PrismJS lightweight syntax highlighting engine
├── socket-server/
│   └── src/
│       └── jobs/
│           └── ephemeralCleanupJob.ts   # Background interval purging expired messages & files
└── shared/
    └── src/
        └── types.ts                     # Document metadata & EphemeralDuration types
```

---

## 4. Prisma Schema Additions (`web/prisma/schema.prisma`)

Add `documentName`, `documentType`, `expiresAt` fields to the `Message` and `Chat` models:

```prisma
// Extension to existing Chat model:
// model Chat {
//   ...
//   ephemeralDuration Int?   // null = disabled, or duration in seconds: 86400 (24h), 604800 (7d), 7776000 (90d)
// }

// Extension to existing Message model:
// model Message {
//   ...
//   documentName     String?  @db.VarChar(255) // Original filename e.g. "Q3_Financial_Report.pdf"
//   documentSize     Int?                      // Size in bytes
//   documentMime     String?  @db.VarChar(100) // "application/pdf", etc.
//   isCodeBlock      Boolean  @default(false)
//   codeLanguage     String?  @db.VarChar(30)  // "typescript", "python", "json", "sql"
//   expiresAt        DateTime?                 // Scheduled deletion timestamp
//   @@index([expiresAt], map: "idx_messages_expires_at")
// }
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Enterprise Document Upload Route (`POST /api/upload/doc`)**:
  - Validates file extensions (`.pdf`, `.docx`, `.xlsx`, `.pptx`, `.txt`, `.zip`, `.csv`).
  - Max file size limit: **25 MB** (enforced client-side and server-side).
  - Saves file into `public/uploads/docs/[uuid]-[sanitized-filename]`.
  - Computes SHA-256 checksum and returns `{ mediaUrl, documentName, documentSize, documentMime }`.
- [ ] **2. Document Message Bubble (`DocumentBubble.tsx`)**:
  - Sleek enterprise file card inside the message bubble:
    - **Color-coded file icon**:
      - 🔴 PDF: Red badge with Adobe PDF icon.
      - 🟢 Excel / CSV: Green badge with spreadsheet icon.
      - 🔵 Word / Docs: Blue badge with document icon.
      - 🟠 Zip / Archive: Orange badge with archive icon.
    - Displays original filename (truncated if > 30 chars), formatted size (*"4.2 MB"*), and upload timestamp.
    - Download button: Direct HTTPS download attribute.
    - "Preview" button: Enabled for `.pdf` and `.txt` files, opening `<DocumentPreviewModal />`.
- [ ] **3. In-Browser Document Preview Modal (`DocumentPreviewModal.tsx`)**:
  - Embedded full-screen modal allowing users to read multi-page PDFs directly within WebChat without opening external reader applications.
- [ ] **4. Syntax-Highlighted Code Blocks (`CodeBlockBubble.tsx`)**:
  - Automatically detect markdown fenced code blocks:
    ````markdown
    ```typescript
    const token = signToken({ id: user.id });
    ```
    ````
  - Integrated syntax highlighter supporting TypeScript, JavaScript, Python, SQL, HTML, CSS, JSON, Shell, and YAML.
  - Header displays:
    - Language tag (e.g. `TypeScript`).
    - One-click **"Copy Code"** button (changes to green checkmark *"Copied!"* for 2 seconds).
  - Dark terminal theme matching WhatsApp dark aesthetic.
- [ ] **5. Disappearing / Ephemeral Messages Engine**:
  - In Chat Info drawer: "Disappearing Messages" setting.
  - Options:
    - **Off** (default)
    - **24 Hours** (`86400` seconds)
    - **7 Days** (`604800` seconds)
    - **90 Days** (`7776000` seconds)
  - When enabled, incoming and outgoing messages compute:
    ```typescript
    expiresAt = new Date(Date.now() + chat.ephemeralDuration * 1000);
    ```
  - Displays clock timer icon next to message timestamp.
  - Inserts system bubble: *"Alex set messages to disappear after 7 days"*.
- [ ] **6. Automated Cleanup Job (`socket-server/src/jobs/ephemeralCleanupJob.ts`)**:
  - Scheduled timer running every 15 minutes:
    - Queries `messages` where `expiresAt <= NOW()`.
    - If message contains local files (`mediaUrl` in `/uploads/`), unlinks file from NVMe storage.
    - Deletes or sets `isDeleted = true` on expired message rows in MySQL.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 17 complete, verify:
1. Uploading a 10MB PDF renders the red PDF document card with accurate file size.
2. Clicking "Preview" opens the in-browser PDF reader without navigation errors.
3. Sending a markdown code block renders syntax coloring and clicking "Copy Code" successfully copies the raw snippet to clipboard.
4. Enabling "24 Hours" disappearing messages calculates `expiresAt` on new messages and displays the clock indicator.
5. The cleanup job successfully purges expired messages and deletes orphan files from disk.

---

## 7. Handoff to Phase 18
Phase 18 will implement Background Web Push Notifications (VAPID / Web Push API) and Local-First Offline Sync (IndexedDB queue with automatic conflict reconciliation).
