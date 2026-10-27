# Phase 24: Local-First Offline Sync & IndexedDB Message Queue

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Build a resilient local-first architecture using browser **IndexedDB** (via the lightweight `idb` library) at **$0.00 additional monthly cost**. When users lose internet connection (e.g. mobile elevator, tunnel, or unstable Wi-Fi), messages can still be typed and queued locally with a clock icon (`🕒`). Once connectivity resumes, an automatic FIFO reconciliation queue transmits pending messages over WebSockets, replaces temporary client IDs with permanent server IDs, and restores normal delivery tick status.

> [!IMPORTANT]
> **Authentication Guardrail**: Strictly **NO OTP**, **NO SMS**, and **NO phone verification**. Offline state synchronization relies purely on local-first storage and WebSocket reconnection.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`23_BACKGROUND_WEB_PUSH_NOTIFICATIONS.md`](23_BACKGROUND_WEB_PUSH_NOTIFICATIONS.md) (Push notifications and service worker operational).
- **Environment**: Next.js 15, Browser IndexedDB (`idb` `^8.0.0`), Fastify + Native `ws`.
- **Performance Rule**: IndexedDB reads are instant (0ms latency), allowing the chat UI to render previous messages instantly before any network requests complete.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── OfflineStatusBar.tsx     # Yellow top bar: "Computer not connected to the internet"
│   │   │   │   └── PendingClockIcon.tsx     # Clock icon rendered on pending offline message bubbles
│   │   │   └── ui/
│   │   │       └── ConnectionToast.tsx      # Green toast: "Connected to internet. Syncing 3 messages..."
│   │   ├── hooks/
│   │   │   ├── useNetworkStatus.ts          # Window online/offline event listener & ping checker
│   │   │   └── useOfflineSync.ts            # FIFO queue processor monitoring socket reconnection
│   │   └── lib/
│   │       └── db/
│   │           ├── index.ts                 # idb openDB initialization (stores: messages, chats, outbox)
│   │           ├── messageStore.ts          # Local message cache operations (putMessage, getRecentMessages)
│   │           └── outboxStore.ts           # Pending queue operations (enqueue, dequeue, getAllPending)
├── socket-server/
│   └── src/
│       └── handlers/
│           └── messageHandler.ts            # Acknowledges client temporary IDs with server UUIDs
└── shared/
    └── src/
        └── types.ts                         # OutboxMessage, MessageAckEnvelope interfaces
```

---

## 4. Offline Enqueue & FIFO Reconnection Reconciliation

```mermaid
sequenceDiagram
    participant User as Alice (Device in Subway)
    participant UI as Chat Viewport (React)
    participant IDB as Local IndexedDB (idb)
    participant WS as Server #2 (Fastify + ws)

    Note over User,WS: Step 1: Internet Connection Lost
    User->>User: Network drops (navigator.onLine = false)
    UI->>UI: Displays yellow banner: "Connecting to phone / Waiting for network"
    
    User->>UI: Types "See you in 10 minutes" -> Clicks Send
    UI->>IDB: Saves message with tempId: "temp-9842", status: "pending"
    UI->>IDB: Pushes into outbox queue table
    UI->>UI: Renders message bubble with clock icon (🕒)

    Note over User,WS: Step 2: Network Reconnected
    User->>User: Network returns (navigator.onLine = true)
    WS->>WS: WebSocket re-establishes authenticated connection
    
    UI->>IDB: Fetches all pending messages from outbox ordered by timestamp
    loop For each queued message in FIFO order
        UI->>WS: Sends { type: "message:send", payload: { tempId: "temp-9842", content, chatId } }
        WS->>WS: Inserts Message into MySQL with permanent server ID "uuid-5512"
        WS-->>UI: Sends { type: "message:ack", payload: { tempId: "temp-9842", permanentId: "uuid-5512", status: "sent" } }
        UI->>IDB: Updates tempId to permanentId; removes from outbox
        UI->>UI: Bubble updates: Clock (🕒) transitions to single grey tick (✓)
    end
```

---

## 5. Local IndexedDB Schema Definition (`lib/db/index.ts`)

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface WebChatDB extends DBSchema {
  messages: {
    key: string; // messageId
    value: {
      id: string;
      chatId: string;
      senderId: string;
      content: string | null;
      messageType: string;
      mediaUrl?: string | null;
      status: 'pending' | 'sent' | 'delivered' | 'read';
      createdAt: string;
      isDeleted: boolean;
    };
    indexes: { 'by-chat': string; 'by-created': string };
  };
  outbox: {
    key: string; // tempId
    value: {
      tempId: string;
      chatId: string;
      content: string;
      messageType: string;
      queuedAt: number;
    };
  };
  chats: {
    key: string; // chatId
    value: {
      id: string;
      name?: string | null;
      isGroup: boolean;
      lastMessageSnippet?: string;
      updatedAt: string;
    };
  };
}

export async function getLocalDB(): Promise<IDBPDatabase<WebChatDB>> {
  return openDB<WebChatDB>('webchat_local_cache', 1, {
    upgrade(db) {
      const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
      msgStore.createIndex('by-chat', 'chatId');
      msgStore.createIndex('by-created', 'createdAt');

      db.createObjectStore('outbox', { keyPath: 'tempId' });
      db.createObjectStore('chats', { keyPath: 'id' });
    },
  });
}
```

---

## 6. Step-by-Step Implementation Tasks

- [ ] **1. Network Connectivity Monitoring (`useNetworkStatus.ts`)**:
  - Listen to browser events: `window.addEventListener('online')` and `window.addEventListener('offline')`.
  - Monitor WebSocket connection state (`readyState === WebSocket.OPEN`).
  - Return `{ isOnline, isSocketConnected }`.
- [ ] **2. Offline Notification Banner (`OfflineStatusBar.tsx`)**:
  - Render WhatsApp Web style yellow top banner across chat window when disconnected:
    - Background: `#f59e0b` / `#d97706` text: `#111b21` font-medium.
    - Icon: Exclamation triangle or disconnected plug icon.
    - Message: *"Computer not connected. Make sure you have an active Internet connection."*
- [ ] **3. Local Message Caching on Load (`messageStore.ts`)**:
  - Whenever messages are fetched via REST or received over WebSocket:
    - Upsert into IndexedDB `messages` store in the background.
  - When opening a chat:
    - Load cached messages from IndexedDB immediately (instant rendering, 0ms latency).
    - Concurrently fetch latest updates from Server #1 REST API to reconcile any delta.
- [ ] **4. Offline Message Enqueueing (`outboxStore.ts`)**:
  - When user sends a message while offline or socket is disconnected:
    - Generate unique client temporary ID: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`.
    - Create optimistic message in IndexedDB with `status: "pending"`.
    - Add to `outbox` store with timestamp.
    - Render in chat bubble with clock icon `<PendingClockIcon />` (🕒).
- [ ] **5. Automatic FIFO Reconnection Sync (`useOfflineSync.ts`)**:
  - Triggered whenever `isOnline === true` and WebSocket enters `OPEN` state:
    - Read all items from `outbox` sorted by `queuedAt ASC`.
    - Sequentially emit `{ type: 'message:send', payload: item }`.
    - Wait for server acknowledgment `{ type: 'message:ack', payload: { tempId, permanentId } }`.
    - Delete processed item from `outbox`.
    - Update cached message in IndexedDB and UI state with permanent ID and status `sent`.
    - Display brief green notification toast: *"Synced [N] offline messages"*.

---

## 7. Quality Gate & Verification Criteria

1. Disconnecting network (or Chrome DevTools "Offline" preset) renders the yellow warning banner.
2. Typing and sending a message while offline immediately appends the message to the chat view with a clock icon (`🕒`).
3. Refreshing the browser while offline still shows the message in the chat timeline (loaded from IndexedDB).
4. Restoring network automatically transmits all queued messages in the exact order they were typed.
5. Server #2 persists the messages to MySQL and returns permanent UUIDs.
6. The clock icon seamlessly transitions to a single grey tick (`✓`) without page reload.

---

## 8. Autonomous Multi-Agent Handoff Instructions
The next phase is [`25_INBOUND_AND_OUTBOUND_WEBHOOKS.md`](25_INBOUND_AND_OUTBOUND_WEBHOOKS.md). That agent will implement inbound and outbound webhooks for connecting third-party developer platforms (GitHub, Jira, CI/CD) and automated group alerts.