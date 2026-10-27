# Phase 26: Chatbots & Slash Commands Engine

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Implement an interactive Chatbot and Slash Commands engine at **$0.00 additional monthly cost**. Users can type `/` in the chat input bar to access quick productivity commands: `/poll` for rapid poll generation, `/remind` for scheduled reminder messages delivered by an automated system bot, `/announce` for broadcast formatting, and `/help`. Reminders are processed by a lightweight 24/7 background scheduler on Server #2.

> [!IMPORTANT]
> **Authentication Guardrail**: Strictly **NO OTP**, **NO SMS**, and **NO phone verification**. Bot commands execute seamlessly within active chat sessions.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`25_INBOUND_AND_OUTBOUND_WEBHOOKS.md`](25_INBOUND_AND_OUTBOUND_WEBHOOKS.md) (Webhooks and bot message rendering established).
- **Environment**: Next.js 15, Fastify 4+ & Native `ws`, Hostinger MySQL via Prisma (`connection_limit=10`).
- **Memory Optimization**: Fastify background reminder interval runs every 30 seconds with minimal SQL query overhead (`take: 50`).

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/api/
│   │   │   └── commands/
│   │   │       ├── route.ts                 # POST /api/commands/execute (server-side slash command executor)
│   │   │       └── reminders/
│   │   │           └── route.ts             # GET /api/commands/reminders (fetch active reminders for user)
│   │   ├── components/
│   │   │   └── chat/
│   │   │       ├── SlashCommandPopover.tsx  # Interactive dropdown menu popping up when '/' is typed
│   │   │       ├── ReminderMessageBubble.tsx# Specialized clock card: "Reminder: Check server logs"
│   │   │       └── ChatInput.tsx            # Enhanced with slash command detection and keyboard navigation
│   │   └── lib/
│   │       ├── slashCommandParser.ts        # Parses /command arguments, flags, and natural language times
│   │       └── timeParser.ts                # Converts "10m", "2h", "tomorrow at 9am" into UTC timestamps
├── socket-server/
│   └── src/
│       └── jobs/
│           └── reminderSchedulerJob.ts      # Fastify interval running every 30s dispatching due reminders
└── shared/
    └── src/
        └── types.ts                         # SlashCommandDefinition, ScheduledReminderPayload interfaces
```

---

## 4. Slash Command Execution & Reminder Scheduling Flow

```mermaid
sequenceDiagram
    participant User as Alice
    participant UI as ChatInput (React)
    participant NextAPI as Server #1 (Command API)
    participant DB as Hostinger MySQL
    participant Scheduler as Server #2 Reminder Daemon
    participant WS as Server #2 (Fastify + ws)

    User->>UI: Types "/remind 15m Review pull request"
    UI->>NextAPI: POST /api/commands/execute { chatId, text: "/remind 15m Review pull request" }
    NextAPI->>NextAPI: Parses "15m" -> Computes remindAt = NOW + 15 mins
    NextAPI->>DB: Inserts ScheduledReminder record
    NextAPI-->>UI: Returns { success: true, feedback: "Reminder set for 02:45 PM" }
    UI->>UI: Clears input; displays confirmation toast

    Note over Scheduler,DB: 15 Minutes Later (Server #2 Cron)
    Scheduler->>DB: Query ScheduledReminder where remindAt <= NOW() and isTriggered = false
    Scheduler->>DB: Updates isTriggered = true
    Scheduler->>DB: Inserts Message (messageType: "system_bot", content: "⏰ Reminder: Review pull request")
    Scheduler->>WS: Broadcasts { type: "message:new", payload: reminderMessage } to room
    WS->>User: Renders ReminderMessageBubble with audio chime in Alice's chat
```

---

## 5. Database Schema & Prisma Migrations (`web/prisma/schema.prisma`)

```prisma
// Extension to Chat model:
// model Chat {
//   ...
//   reminders ScheduledReminder[]
// }

model ScheduledReminder {
  id           String    @id @default(uuid())
  chatId       String
  userId       String
  reminderText String    @db.VarChar(500)
  remindAt     DateTime
  isTriggered  Boolean   @default(false)
  triggeredAt  DateTime?
  createdAt    DateTime  @default(now())

  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([remindAt, isTriggered], map: "idx_reminders_trigger")
  @@map("scheduled_reminders")
}
```

---

## 6. Step-by-Step Implementation Tasks

- [ ] **1. Slash Command Autocomplete Popover (`SlashCommandPopover.tsx`)**:
  - In `ChatInput.tsx`, watch input value:
    - If input starts with `/`, render `<SlashCommandPopover />` anchored above the input bar.
    - Supported commands list:
      1. `/poll <question> | <opt1> | <opt2>`: Create a quick poll.
      2. `/remind <time> <text>`: Set an automated reminder (e.g. `10m`, `1h`, `tomorrow 9am`).
      3. `/announce <text>`: Post bold channel broadcast (admins only).
      4. `/help`: View command cheat-sheet.
    - Full keyboard navigation: Up/Down arrow keys highlight item; `Enter` or `Tab` auto-completes command into input.
- [ ] **2. Natural Time Parser Helper (`timeParser.ts`)**:
  - Implement zero-dependency duration and time parser:
    - Relative formats: `10m` / `10min` (+10 minutes), `2h` (+2 hours), `1d` (+1 day).
    - Natural keywords: `tomorrow at 9am`, `monday at 10am`.
    - Returns exact calculated JavaScript `Date` in UTC.
- [ ] **3. Command Executor API Route (`/api/commands/execute`)**:
  - `POST /api/commands/execute`:
    - Authenticate user session.
    - Parse command prefix:
      - **Case `/remind`**:
        - Extract time string and reminder text.
        - Calculate `remindAt`.
        - Insert into `ScheduledReminder` table.
        - Return confirmation response: `"Reminder scheduled for [formatted time]"`.
      - **Case `/poll`**:
        - Split arguments by `|`.
        - Automatically create `Poll` and `PollOption` records and inject into chat.
      - **Case `/announce`**:
        - Verify user is channel/group admin.
        - Create styled broadcast message.
- [ ] **4. Reminder Bubble UI (`ReminderMessageBubble.tsx`)**:
  - Rendered when `messageType === 'system_bot'` and content starts with reminder tag:
    - Card layout with alarm clock icon.
    - Header: *"Scheduled Reminder for @[username]"*.
    - Body text: The reminder description.
    - Subtle audio chime played upon arrival.
- [ ] **5. Fastify 24/7 Background Scheduler (`reminderSchedulerJob.ts`)**:
  - Server #2 recurring interval running every 30 seconds (`30,000 ms`):
    - Query due reminders:
      ```typescript
      const dueReminders = await prisma.scheduledReminder.findMany({
        where: { remindAt: { lte: new Date() }, isTriggered: false },
        include: { user: { select: { displayName: true, username: true } } },
        take: 50,
      });
      ```
    - For each reminder:
      - Create system bot message in target `chatId`:
        `content: "⏰ **Reminder for @${r.user.username}**: ${r.reminderText}"`.
      - Update `ScheduledReminder.isTriggered = true` and `triggeredAt = new Date()`.
      - Broadcast over WebSocket using `roomManager.broadcastToRoom('chat:${chatId}', envelope)`.

---

## 7. Quality Gate & Verification Criteria

1. Typing `/` in the chat input opens the command autocomplete popup with keyboard navigation.
2. Typing `/remind 1m Check staging build` inserts a reminder record scheduled 1 minute ahead.
3. Chat input immediately shows confirmation feedback.
4. Exactly 1 minute later, Fastify Server #2 background job triggers, posts the bot reminder message to the chat room, and plays an alert chime.
5. Typing `/poll Lunch? | Pizza | Sushi` creates a fully functional poll card directly in the chat.
6. Triggered reminders are marked `isTriggered = true` and are never fired twice.

---

## 8. Autonomous Multi-Agent Handoff Instructions
The next phase is [`27_IMMUTABLE_SECURITY_AUDIT_LOGGING.md`](27_IMMUTABLE_SECURITY_AUDIT_LOGGING.md). That agent will build security audit logging capturing all authentication and administrative events.