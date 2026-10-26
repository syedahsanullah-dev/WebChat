# Phase 16: Enterprise Channels, Polls & Message Governance

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Equip WebChat with enterprise team communication tools: One-way Broadcast/Announcement Channels with granular Role-Based Access Control (RBAC), Interactive Multi-Choice Polls with live real-time voting tallies over native WebSockets, Pinned Messages banner management, and a personal Starred / Bookmarked Messages repository.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`15_ENTERPRISE_SECURITY_2FA_AND_E2EE.md`](15_ENTERPRISE_SECURITY_2FA_AND_E2EE.md) (Enterprise security, 2FA, and session management complete).
- **Environment**: Next.js 15, Prisma ORM, Fastify + Native `ws` `RoomManager`.
- **Zero Cost Rule**: All poll votes and channel broadcasts use standard Hostinger MySQL tables and existing in-memory WebSocket connections.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/api/
│   │   │   ├── channels/
│   │   │   │   ├── route.ts                 # POST /api/channels (create announcement channel)
│   │   │   │   └── [id]/permissions/route.ts # PATCH channel RBAC permissions
│   │   │   ├── polls/
│   │   │   │   ├── route.ts                 # POST /api/polls (create poll)
│   │   │   │   └── [pollId]/vote/route.ts   # POST /api/polls/[pollId]/vote
│   │   │   ├── chats/[chatId]/
│   │   │   │   └── pinned/route.ts          # POST/DELETE pinned messages
│   │   │   └── starred/route.ts             # GET /api/starred (all starred messages for user)
│   │   ├── components/
│   │   │   ├── channels/
│   │   │   │   ├── ChannelBanner.tsx        # "Only admins can send messages" read-only banner
│   │   │   │   └── ChannelSubscriberDrawer.tsx # Subscriber directory and permissions manager
│   │   │   ├── polls/
│   │   │   │   ├── CreatePollModal.tsx      # Modal to add question & 2–12 options
│   │   │   │   └── PollMessageCard.tsx      # Interactive card with live animated progress bars
│   │   │   ├── chat/
│   │   │   │   ├── PinnedMessagesHeader.tsx # Pinned message preview strip at top of chat
│   │   │   │   └── StarButton.tsx           # Star icon toggle on message hover
│   │   │   └── sidebar/
│   │   │       └── StarredMessagesDrawer.tsx# Personal bookmarks slide-over drawer
│   │   └── hooks/
│   │       ├── usePolls.ts                  # Real-time poll voting & tally state
│   │       └── usePinnedMessages.ts         # Pinned message management
├── socket-server/
│   └── src/
│       └── handlers/
│           ├── pollHandler.ts               # ws envelope handler for poll:vote broadcasts
│           └── pinHandler.ts                # ws envelope handler for chat:pin broadcasts
└── shared/
    └── src/
        └── events.ts                        # Poll and Pin event envelope schemas
```

---

## 4. Prisma Schema Additions (`web/prisma/schema.prisma`)

```prisma
model ChannelMetadata {
  id              String   @id @default(uuid())
  chatId          String   @unique
  isBroadcastOnly Boolean  @default(true) // Only admins/moderators can post
  subscriberCount Int      @default(0)
  publicSlug      String?  @unique @db.VarChar(50) // e.g. "engineering-announcements"

  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  @@map("channel_metadata")
}

model PinnedMessage {
  id        String   @id @default(uuid())
  chatId    String
  messageId String
  pinnedById String
  pinnedAt  DateTime @default(now())

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
  id             String       @id @default(uuid())
  chatId         String
  creatorId      String
  question       String       @db.VarChar(255)
  allowMultiple  Boolean      @default(false)
  isAnonymous    Boolean      @default(false)
  createdAt      DateTime     @default(now())

  chat      Chat         @relation(fields: [chatId], references: [id], onDelete: Cascade)
  creator   User         @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  options   PollOption[]
  votes     PollVote[]

  @@map("polls")
}

model PollOption {
  id        String     @id @default(uuid())
  pollId    String
  text      String     @db.VarChar(150)
  order     Int        @default(0)

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
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Broadcast / Announcement Channels**:
  - `POST /api/channels`: Creates a group conversation with `isBroadcastOnly = true` and optional `publicSlug`.
  - In `ChatArea.tsx`:
    - If `isBroadcastOnly = true` and the current user is NOT an Admin/Owner:
      - Replace chat input with `<ChannelBanner />`: *"📢 Only channel administrators can post messages to this channel."*
      - Retain reaction pills and poll voting permissions for regular subscribers.
- [ ] **2. Interactive Multi-Choice Polls Engine**:
  - `CreatePollModal.tsx`:
    - Question input (e.g. *"When should we deploy the Next.js update?"*).
    - Dynamic list of options (minimum 2, maximum 12) with drag-to-reorder.
    - Checkbox: *"Allow multiple answers"*.
    - Checkbox: *"Anonymous voting"*.
  - `PollMessageCard.tsx`:
    - Embedded in the chat feed like a message bubble.
    - Each option has a checkbox/radio, option label, live vote count, and animated progress bar showing percentage of total votes.
    - Avatar stack showing profile pictures of voters (unless `isAnonymous = true`).
  - Real-time Voting via Fastify `ws`:
    - On clicking an option, send envelope:
      ```typescript
      ws.send(JSON.stringify({
        type: 'poll:vote',
        payload: { pollId, optionId, action: 'toggle' }
      }));
      ```
    - Server #2 updates `poll_votes` in MySQL and calls `roomManager.broadcastToRoom(`chat:${chatId}`, { type: 'poll:update', payload: updatedTally })`.
- [ ] **3. Pinned Messages Strip (`PinnedMessagesHeader.tsx`)**:
  - Admins can hover any message and click "Pin to Chat" (max 5 pinned messages per conversation).
  - Pinned banner docked just below the chat header showing:
    - Pin icon (`📌`), sender name, message preview text, and count indicator (*"1 of 3 pinned messages"*).
    - Clicking the banner scrolls smoothly to the pinned message and highlights it.
    - Unpin button (`✕`) for admins.
- [ ] **4. Personal Starred / Bookmarked Messages Drawer**:
  - Any message can be starred by clicking the star icon in the message context menu.
  - Sidebar menu item: **"Starred Messages"** opening slide-over drawer:
    - Lists all bookmarked messages across all 1-on-1 chats and groups.
    - Displays sender name, conversation title, timestamp, and message snippet.
    - Clicking any item navigates directly to that conversation and jumps to the message.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 16 complete, verify:
1. Creating an Announcement Channel prevents regular members from seeing the text input while admins can post freely.
2. Creating a Poll renders correctly with dynamic options in the chat feed.
3. User A and User B clicking poll options immediately animates the progress bars and updates percentages in real-time on all screens.
4. Pinning a message displays the pinned banner at the top of the chat; clicking it jumps directly to the message.
5. Starred messages appear in the personal Starred Messages drawer and can be unstarred.

---

## 7. Handoff to Phase 17
Phase 17 will implement Enterprise Document Sharing (PDF preview, Excel, Word, Zip files), Syntax-Highlighted Code Blocks, and Disappearing / Ephemeral Messages.
