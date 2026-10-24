# Phase 10: Advanced Chat Features (Replies, Reactions & Search)

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Build interactive chat capabilities matching WhatsApp Web: quoted message replies with jump-to-original navigation, hover emoji reaction pills with native WebSocket broadcasting, in-chat text search with keyword highlighting, and two-tier message deletion ("Delete for me" and "Delete for everyone").

---

## 2. Context & Prerequisites
- **Previous Phase**: [`09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md`](09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md) (Group messaging and individual conversations operational).
- **Environment**: Next.js 15, Prisma ORM, Fastify + Native `ws` `RoomManager`.
- **Data Rule**:
  - "Delete for everyone" preserves the message row in the database for consistency but updates `isDeleted = true` and replaces text with *"This message was deleted"*.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── QuotedReplyPreview.tsx   # Banner above input showing message being quoted
│   │   │   │   ├── QuotedMessageSnippet.tsx # Embedded reply box inside message bubble
│   │   │   │   ├── EmojiReactionPill.tsx    # Reaction counter badge at bubble corner
│   │   │   │   ├── ReactionHoverBar.tsx     # Floating WhatsApp quick emoji bar (👍, ❤️, 😂, 😮, 😢, 🙏)
│   │   │   │   ├── InChatSearchDrawer.tsx   # Slide-in search bar with match counter & chevrons
│   │   │   │   └── MessageContextMenu.tsx   # Dropdown menu: Reply, React, Copy, Delete
│   │   └── hooks/
│   │       ├── useReactions.ts              # Reaction toggling & ws synchronization
│   │       └── useInChatSearch.ts           # Keyword search & DOM highlight navigation
├── socket-server/
│   └── src/
│       └── handlers/
│           ├── reactionHandler.ts           # Native ws message:reaction envelope handler
│           └── deleteHandler.ts             # Native ws message:delete envelope handler
└── shared/
    └── src/
        └── events.ts                        # Reaction and deletion envelope schemas
```

---

## 4. Native WebSocket Envelope Contracts (`shared/src/events.ts`)

```typescript
// Reaction Event Envelope
export interface MessageReactionPayload {
  chatId: string;
  messageId: string;
  userId: string;
  emoji: string;
  action: 'add' | 'remove';
}

// Delete Event Envelope
export interface MessageDeletePayload {
  chatId: string;
  messageId: string;
  deleteType: 'everyone' | 'forMe';
  userId: string;
}
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Quoted Message Replies**:
  - Context menu / hover action: "Reply".
  - Sets `replyingToMessage` state in chat context.
  - Render `QuotedReplyPreview.tsx` above the text input:
    - Sender name, message content snippet (or thumbnail if image/voice), and close (`✕`) button.
  - When message is sent, attach `replyToMessageId`.
  - In `MessageBubble.tsx`:
    - If `replyToMessageId` exists, fetch or display quoted preview box with colored vertical bar.
    - Clicking the quoted box scrolls smoothly to the original message in the viewport and briefly flashes its background with a highlight.
- [ ] **2. Emoji Reaction Hover Bar (`ReactionHoverBar.tsx`)**:
  - When hovering a message bubble, display a floating pill above the bubble with quick emoji options:
    - 👍, ❤️, 😂, 😮, 😢, 🙏, and `+` (custom picker).
  - Clicking an emoji calls `useReactions.toggle(messageId, emoji)`:
    - Sends native envelope `{ type: 'message:reaction', payload: { ... } }` to Server #2.
    - Server persists reaction and calls `roomManager.broadcastToRoom(`chat:${chatId}`, envelope)`.
  - In `EmojiReactionPill.tsx`:
    - Renders at the bottom-right corner of the bubble showing active emojis and count.
    - Tooltip shows who reacted.
    - Clicking your own reaction removes it.
- [ ] **3. In-Chat Text Search (`InChatSearchDrawer.tsx`)**:
  - Pinned right-side search drawer triggered by the magnifying glass in the chat header.
  - Input with real-time text matching against the active chat's loaded messages.
  - Highlights matched terms in the conversation with yellow text highlighting (`<mark>`).
  - Chevron navigation controls (`▲` / `▼`) jumping between search matches with counter (*"2 of 7"*).
- [ ] **4. Message Deletion Workflow**:
  - Hover dropdown menu: "Delete Message".
  - Opens confirmation dialog:
    - **"Delete for me"**: Hides message locally on the current user's client.
    - **"Delete for everyone"** (available if current user is the sender):
      - Sends `{ type: 'message:delete', payload: { ...deleteType: 'everyone' } }`.
      - Server updates `isDeleted = true` in MySQL.
      - Broadcasts envelope to chat room via `roomManager`.
      - Replaces message content in UI with an italic grey notice: *"🚫 This message was deleted"*.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 10 complete, verify:
1. Replying to a message displays the quoted box in the sent message, and clicking it scrolls directly to the original message.
2. Hovering over a bubble reveals the 6 quick emojis; clicking ❤️ adds a heart pill that updates immediately on both sender and recipient screens.
3. In-chat search for a common word highlights all occurrences and chevrons correctly navigate to each one.
4. Clicking "Delete for everyone" transforms the message into *"This message was deleted"* on all connected clients.

---

## 7. Handoff to Phase 11
Phase 11 will implement Real-Time Audio Calling (WebRTC Voice via Fastify + Native `ws` signaling, Google STUN, Metered.ca TURN, audio stream constraints, ringing modals, and call logs).
