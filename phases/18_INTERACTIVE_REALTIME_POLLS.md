# Phase 18: Interactive Real-Time Polls & Live Voting

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Build WhatsApp-style interactive multi-choice polls at **$0.00 additional monthly cost**. Users can create polls with multiple options in direct chats, group conversations, and announcement channels. Group members can vote in real-time, see live animated percentage bars update instantly over WebSockets, and open a voter roster drawer to inspect who voted for each option.

> [!IMPORTANT]
> **Authentication Guardrail**: Strictly **NO OTP**, **NO SMS**, and **NO phone verification**. Voting and poll creation are governed directly by active user sessions.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`17_BROADCAST_ANNOUNCEMENT_CHANNELS.md`](17_BROADCAST_ANNOUNCEMENT_CHANNELS.md) (Channels, groups, and message pipeline established).
- **Environment**: Next.js 15, Fastify 4+ & Native `ws` `RoomManager`, Prisma ORM with MySQL (`connection_limit=10`).
- **Real-Time Standard**: Uses `WsEnvelope<T>` envelope format (`poll:vote` and `poll:update`).

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/api/
│   │   │   └── polls/
│   │   │       ├── route.ts                 # POST /api/polls (create new poll)
│   │   │       └── [id]/
│   │   │           ├── vote/route.ts        # POST /api/polls/:id/vote (cast/toggle vote)
│   │   │           └── results/route.ts     # GET /api/polls/:id/results (voter roster breakdown)
│   │   ├── components/
│   │   │   ├── polls/
│   │   │   │   ├── CreatePollModal.tsx      # Modal with question, dynamic option inputs, multi-vote toggle
│   │   │   │   ├── PollMessageBubble.tsx    # Interactive chat bubble with live percentage bars
│   │   │   │   ├── PollOptionRow.tsx        # Individual option with checkbox/radio, bar animation, count
│   │   │   │   └── VoterRosterDrawer.tsx    # "View votes" drawer showing who voted for what
│   │   │   └── chat/
│   │   │       └── AttachmentMenu.tsx       # Adds "Poll" (bar chart icon) to attachment options
│   │   └── hooks/
│   │       └── usePollVote.ts               # Optimistic voting hook with socket dispatch
├── socket-server/
│   └── src/
│       └── handlers/
│           └── pollHandler.ts               # Handles poll:vote envelopes and broadcasts poll:update
└── shared/
    └── src/
        ├── types.ts                         # PollPayload, PollVoteEvent interfaces
        └── events.ts                        # poll:vote and poll:update envelope definitions
```

---

## 4. Real-Time Poll Voting Sequence

```mermaid
sequenceDiagram
    participant UserA as Alice (Voter)
    participant WS as Server #2 (Fastify + ws)
    participant DB as Hostinger MySQL
    participant GroupUsers as Group Participants (Bob, Charlie)

    UserA->>UserA: Clicks Option "React 19" in Poll Bubble
    UserA->>WS: Sends { type: "poll:vote", payload: { pollId, optionId } }
    WS->>DB: Upserts PollVote record (atomic transaction)
    WS->>DB: Re-calculates vote tallies for all options in poll
    WS->>GroupUsers: Broadcasts { type: "poll:update", payload: updatedTallies }
    GroupUsers->>GroupUsers: Smooth CSS animation updates green progress bars & vote count
    UserA->>UserA: Checkbox checks; option count increments instantly
```

---

## 5. Database Schema & Prisma Migrations (`web/prisma/schema.prisma`)

```prisma
// Extension to Chat model:
// model Chat {
//   ...
//   polls Poll[]
// }

model Poll {
  id              String       @id @default(uuid())
  chatId          String
  creatorId       String
  question        String       @db.VarChar(500)
  allowMultiple   Boolean      @default(false)
  isClosed        Boolean      @default(false)
  createdAt       DateTime     @default(now())

  chat    Chat         @relation(fields: [chatId], references: [id], onDelete: Cascade)
  creator User         @relation("PollCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  options PollOption[]
  votes   PollVote[]

  @@index([chatId, createdAt(sort: Desc)], map: "idx_polls_chat_created")
  @@map("polls")
}

model PollOption {
  id        String     @id @default(uuid())
  pollId    String
  text      String     @db.VarChar(255)
  orderIdx  Int        @default(0)

  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes     PollVote[]

  @@map("poll_options")
}

model PollVote {
  id        String     @id @default(uuid())
  pollId    String
  optionId  String
  userId    String
  createdAt DateTime   @default(now())

  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  option    PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([pollId, optionId, userId], map: "idx_poll_option_user_unique")
  @@map("poll_votes")
}
```

---

## 6. Step-by-Step Implementation Tasks

- [ ] **1. Poll Attachment Trigger in Chat (`AttachmentMenu.tsx`)**:
  - Add yellow/gold bar chart icon button (**"Poll"**) to the chat attachment drawer menu.
  - Clicking "Poll" opens `<CreatePollModal />`.
- [ ] **2. Poll Creation Modal (`CreatePollModal.tsx`)**:
  - Modal title: *"Create Poll"*.
  - Input field for **Question** (e.g. *"What day should we schedule the release?"*).
  - Dynamic list of **Options** (min 2, max 12):
    - Input fields with drag handles for re-ordering.
    - Automatic new empty option input when the previous option is typed into.
    - Delete button (trash can) on hover.
  - Toggle switch: *"Allow multiple answers"* (Single choice vs Multi-select).
  - Green "Create Poll" button at the bottom.
  - Submits to `POST /api/polls`, creates records in MySQL, and broadcasts new message over WebSocket.
- [ ] **3. Poll Message Bubble (`PollMessageBubble.tsx`)**:
  - WhatsApp Web styling for poll cards:
    - Card background: `#202c33` with rounded corners.
    - Top header: Bold question text + Subtitle (*"Select one"* or *"Select one or more"*).
    - List of option rows via `<PollOptionRow />`:
      - Left: Circular radio button (if single choice) or square checkbox (if multi-choice).
      - Center: Option text with smooth background progress bar (`bg-[#00a884]/20`) matching vote percentage.
      - Right: Vote count and voter avatars summary (small overlapping circle avatars for voters).
    - Bottom link: *"View votes"* button opening the voter roster drawer.
- [ ] **4. Real-Time Voting Engine (`usePollVote.ts` & `pollHandler.ts`)**:
  - Client handles click on an option:
    - Optimistically toggles option state and recalculates local percentage bars.
    - Sends WebSocket envelope:
      ```typescript
      {
        type: 'poll:vote',
        payload: {
          pollId: 'poll-uuid',
          optionId: 'opt-uuid'
        }
      }
      ```
  - Fastify Server #2 `pollHandler.ts`:
    - Validates socket user session.
    - In single-choice polls: Deletes any previous vote by this user for other options in the poll, then inserts new vote.
    - In multi-choice polls: Toggles vote (inserts if missing, deletes if already present).
    - Calculates new total votes and option breakdown.
    - Broadcasts updated tallies via `roomManager.broadcastToRoom('chat:${chatId}', { type: 'poll:update', payload: { pollId, options } })`.
- [ ] **5. Voter Roster Breakdown Drawer (`VoterRosterDrawer.tsx`)**:
  - Slide-over drawer listing all options.
  - Under each option, shows the exact list of users who voted:
    - User avatar, `@username`, and display name.
    - Relative timestamp of vote (e.g. *"Today at 02:15 PM"*).

---

## 7. Quality Gate & Verification Criteria

1. Clicking "Poll" in the attachment menu opens the creation modal.
2. User can add up to 6 custom options and toggle "Allow multiple answers".
3. Poll message bubble renders correctly in the chat timeline for all participants.
4. Clicking an option casts a vote; Server #2 updates the tally and broadcasts to other participants.
5. All connected clients observe the green percentage bar animate in real time without refreshing.
6. Clicking "View votes" accurately displays the voter identities for each option.

---

## 8. Autonomous Multi-Agent Handoff Instructions
The next phase is [`19_PINNED_AND_STARRED_MESSAGES.md`](19_PINNED_AND_STARRED_MESSAGES.md). That agent will build pinned message header strips with fast-scroll navigation and a global starred message bookmarks drawer.