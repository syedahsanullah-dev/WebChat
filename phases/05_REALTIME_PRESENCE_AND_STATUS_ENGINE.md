# Phase 05: Real-Time Presence & Status Engine (Server #2)

## 1. Phase Overview & Objectives
**Target Workspace**: `socket-server/` (Server #2) & `web/` (Server #1)  
**Primary Goal**: Build the real-time presence and status tracking engine using **Fastify & Native `ws`**. Track live online/offline states across persistent WebSockets, record and display "Last seen" timestamps in MySQL, and implement CPU-throttled typing indicators using the JSON envelope protocol.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md`](04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md) (User contacts and discovery active).
- **Environment**: Node.js Fastify + Native `ws` daemon (`socket-server/`), Next.js client `useWebSocket` hook (`web/`).
- **Performance Constraint**:
  - Typing events must be throttled to **2.5 seconds** client-side to prevent flooding Hostinger's CPU.
  - Presence updates must update MySQL asynchronously without blocking the WebSocket event loop.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── socket-server/
│   └── src/
│       ├── handlers/
│       │   ├── presenceHandler.ts   # On connect/disconnect updates and broadcasts
│       │   └── typingHandler.ts     # Throttled typing start/stop dispatching
│       └── router.ts                # WebSocket message envelope router (switch on envelope.type)
├── web/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts      # Native WebSocket manager with auto-reconnect
│   │   │   ├── usePresence.ts       # Subscribes to user online/offline envelopes
│   │   │   └── useTyping.ts         # Throttled typing emitter & listener
│   │   └── components/
│   │       ├── chat/
│   │       │   ├── ChatHeader.tsx   # Displays green "online", "typing...", or "last seen..."
│   │       │   └── TypingDots.tsx   # Animated 3-dot typing visualizer
│   │       └── sidebar/
│   │           └── ConversationSnippet.tsx # Displays green "typing..." text in sidebar preview
└── shared/
    └── src/
        └── events.ts                # WsEnvelope<T> definitions for presence & typing
```

---

## 4. Native WebSocket JSON Envelope Contracts (`shared/src/events.ts`)

```typescript
export interface WsEnvelope<T = any> {
  type: string;
  payload: T;
}

// Client to Server
export interface TypingStartPayload {
  chatId: string;
  recipientId: string;
}

export interface TypingStopPayload {
  chatId: string;
  recipientId: string;
}

// Server to Client
export interface UserOnlinePayload {
  userId: string;
}

export interface UserOfflinePayload {
  userId: string;
  lastSeen: string; // ISO date string
}

export interface UserTypingStatusPayload {
  chatId: string;
  userId: string;
  isTyping: boolean;
}
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Server #2 Presence Lifecycle (`socket-server/src/handlers/presenceHandler.ts`)**:
  - When a WebSocket connection opens:
    - Register socket in `roomManager.registerUser(socket.userId, socket)`.
    - Join user to personal room: `roomManager.join(`user:${socket.userId}`, socket)`.
    - Update `User.isOnline = true` in MySQL via Prisma.
    - Broadcast envelope to all active connections:
      ```typescript
      const envelope: WsEnvelope<UserOnlinePayload> = {
        type: 'user:online',
        payload: { userId: socket.userId },
      };
      roomManager.broadcastAll(envelope);
      ```
  - When socket disconnects:
    - Deregister from `roomManager.leaveAll(socket)`.
    - If user has no other active sockets:
      - Update `User.isOnline = false` and `User.lastSeen = new Date()` in MySQL.
      - Broadcast envelope:
        ```typescript
        const envelope: WsEnvelope<UserOfflinePayload> = {
          type: 'user:offline',
          payload: { userId: socket.userId, lastSeen: new Date().toISOString() },
        };
        roomManager.broadcastAll(envelope);
        ```
- [ ] **2. Server #2 Throttled Typing Dispatcher (`typingHandler.ts`)**:
  - Handle `typing:start`:
    - Dispatch `{ type: 'typing:start', payload: { chatId, userId: socket.userId, isTyping: true } }` specifically to `roomManager.sendToUser(recipientId, envelope)`.
  - Handle `typing:stop`:
    - Dispatch `{ type: 'typing:stop', payload: { chatId, userId: socket.userId, isTyping: false } }` to `roomManager.sendToUser(recipientId, envelope)`.
- [ ] **3. Frontend Native WebSocket Integration (`web/src/hooks/useWebSocket.ts`)**:
  - Open native `new WebSocket(process.env.NEXT_PUBLIC_SOCKET_URL)`.
  - Automatically reconnect with exponential backoff on drop.
  - Implement message subscriber registry allowing components to listen for specific `envelope.type`.
- [ ] **4. Frontend Typing Hook (`web/src/hooks/useTyping.ts`)**:
  - Implements a 2.5-second trailing debounce timer:
    - On keydown in chat textarea: send `typing:start` envelope only if 2.5 seconds have elapsed.
    - Set an idle timeout (3 seconds). If no keystroke occurs, send `typing:stop` envelope.
    - On sending a message: immediately send `typing:stop`.
- [ ] **5. Chat Header Status Component (`ChatHeader.tsx`)**:
  - Compute presence status for the active conversation recipient:
    - If typing: display animated green text *"typing..."*.
    - Else if `isOnline`: display green text *"online"*.
    - Else: format `lastSeen` into human-friendly string (*"last seen today at 10:45 AM"*, *"last seen yesterday at 8:20 PM"*).
- [ ] **6. Left Sidebar Live Typing Snippet**:
  - Temporarily replace the last message snippet with green animated italic text: *"typing..."* when a contact is typing.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 05 complete, verify:
1. Opening two browser tabs with different logged-in users (User A and User B):
   - User B's avatar shows a green online dot on User A's screen.
   - User B's chat header shows green *"online"* text on User A's screen.
2. Closing User B's tab:
   - Within 3 seconds, User A's screen updates to show *"last seen just now"*.
3. User B typing into the text input:
   - User A sees *"typing..."* in both the chat header and sidebar snippet.
   - Pausing typing for 3 seconds causes the typing indicator to disappear automatically.
4. Verify server logs confirm typing envelopes are sent at most once every 2.5 seconds.

---

## 7. Handoff to Phase 06
Phase 06 will implement the core 1-on-1 Direct Real-Time Messaging Engine over native WebSockets (message pipeline, optimistic UI, status receipts `✓`, `✓✓`, blue `✓✓`, and chat history pagination).
