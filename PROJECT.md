# Project: WebChat — Phase 01: Workspace Scaffolding & Layout Shell

## Architecture
WebChat is a full-featured WhatsApp Web clone architected for zero-added-cost ($0.00/mo) deployment on Hostinger Web Hosting.
It employs a Dual-Server Node.js architecture:
- **Server #1 (`chat.yourdomain.com` ➔ `web/`)**: Next.js 15+ App Router, React 19, TypeScript, Tailwind CSS, Lucide icons. Configured with `output: 'standalone'` and unoptimized local image delivery for efficient static and SSR serving.
- **Server #2 (`ws.yourdomain.com` ➔ `socket-server/`)**: Fastify 4+ & native `ws` WebSocket daemon. In-memory `RoomManager` handling multi-tab user connections and room channels at ~25–35 MB idle RAM (60%+ memory reduction over Express + Socket.io).
- **Shared Contracts (`shared/`)**: Type-safe shared models and `WsEnvelope<T>` envelope definitions.

## Code Layout
```text
WebChat/
├── package.json                         # Monorepo root workspace coordinator
├── chk.txt                              # 14-phase SDLC checklist tracking
├── web/                                 # Server #1: Next.js 15 Standalone Web App
│   ├── package.json                     # Next.js 15.1, React 19, Tailwind, Vitest, Playwright
│   ├── tsconfig.json                    # Strict TypeScript with @/* path aliases
│   ├── next.config.js                   # output: 'standalone', images: { unoptimized: true }
│   ├── tailwind.config.ts               # Official WhatsApp Web color tokens (wa.dark, wa.light, etc.)
│   ├── postcss.config.js                # PostCSS with tailwindcss and autoprefixer
│   ├── .env.example                     # Web app environment template
│   ├── public/
│   │   ├── patterns/
│   │   │   └── doodle-bg.png            # WhatsApp doodle pattern wallpaper
│   │   └── sounds/                      # Audio notification assets
│   │       ├── sent.mp3                 # Message sent pop sound
│   │       ├── receive.mp3              # Message received chime sound
│   │       └── ringtone.mp3             # Audio call ringing loop sound
│   └── src/
│       ├── lib/
│       │   ├── utils.ts                 # cn() styling helper (clsx + tailwind-merge)
│       │   └── audio.ts                 # Safe sound playback helper with autoplay handling
│       ├── context/
│       │   └── ThemeContext.tsx         # Dark/light theme provider with localStorage sync
│       ├── components/
│       │   ├── ui/
│       │   │   ├── Avatar.tsx           # Circular avatar with initials fallback and online dot
│       │   │   ├── SearchInput.tsx      # Search bar with clear button & Ctrl+/ shortcut listener
│       │   │   ├── DropdownMenu.tsx     # WhatsApp 3-dots (⋮) popover menu with light dismiss
│       │   │   └── Modal.tsx            # Accessible backdrop dialog with focus trap & Esc listener
│       │   └── layout/
│       │       ├── Sidebar.tsx          # Responsive left sidebar panel (30–35% desktop, 100% mobile)
│       │       ├── ChatArea.tsx         # Responsive right chat panel with back button (←) for mobile
│       │       └── Header.tsx           # Sidebar & Chat area headers with WhatsApp action icons
│       └── app/
│           ├── layout.tsx               # Root layout with FOUC prevention theme script
│           ├── globals.css              # Slim scrollbars, theme variables, doodle background
│           └── chat/
│               ├── page.tsx             # Chat route entrypoint
│               └── layout.tsx           # Two-column split layout with mobile sliding transition
├── socket-server/                       # Server #2: Fastify 4+ Native ws Daemon
│   ├── package.json                     # Fastify 4.28, ws 8.18, dotenv, winston
│   ├── tsconfig.json                    # Node Next TypeScript configuration
│   ├── .env.example                     # Daemon environment template
│   └── src/
│       ├── index.ts                     # Fastify server bootstrap & WebSocket upgrade handler
│       ├── types/
│       │   └── index.ts                 # Socket server type definitions
│       └── lib/
│           ├── logger.ts                # Winston logging configuration
│           └── roomManager.ts           # In-memory RoomManager implementation
└── shared/                              # Shared TypeScript Types & Contracts
    ├── package.json                     # Shared contract package
    ├── tsconfig.json                    # Shared TypeScript configuration
    └── src/
        ├── index.ts                     # Re-export barrel
        ├── types.ts                     # Common domain entities
        └── events.ts                    # WsEnvelope<T> message contracts
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Root Workspace Setup | Root `package.json` with npm workspaces (`web`, `socket-server`, `shared`) | M1 | Survey |
| 2 | Next.js Standalone Mode | `output: 'standalone'` in `web/next.config.js` generating minimal `server.js` | M1 | Survey |
| 3 | Unoptimized Images | `images: { unoptimized: true }` in `web/next.config.js` for zero-cost LiteSpeed static delivery | M1 | Survey |
| 4 | Large Payload Upload Support | `serverActions.bodySizeLimit: '20mb'` for media messages | M1 | Survey |
| 5 | Tailwind WhatsApp Design Tokens | Comprehensive dark/light color palette (`wa.dark`, `wa.light`, `wa.green`, `wa.blue`) | M1 | Survey |
| 6 | Custom Slim Scrollbars | Standard CSS `scrollbar-width: thin` with legacy WebKit fallback in `globals.css` | M1 | Survey |
| 7 | WhatsApp Doodle Wallpaper | Pattern overlay in `globals.css` with dark/light mode opacity | M1 | Survey |
| 8 | Styling Utility Helper | `cn()` helper with `clsx` and `tailwind-merge` in `web/src/lib/utils.ts` | M1 | Survey |
| 9 | Avatar Primitive | Circular avatar with initials fallback and bottom-right online indicator dot | M2 | Survey |
| 10 | SearchInput & Shortcut | Search input with clear button and global `Ctrl + /` (or `Cmd + /`) shortcut focus listener | M2 | Survey |
| 11 | DropdownMenu Primitive | Three-dot vertical menu icon (`⋮`) with accessible action items and light dismiss | M2 | Survey |
| 12 | Modal Primitive | Accessible backdrop overlay dialog with focus management and `Escape` key listener | M2 | Survey |
| 13 | Notification Audio Assets | Audio files in `web/public/sounds/`: `sent.mp3`, `receive.mp3`, `ringtone.mp3` | M2 | Survey |
| 14 | Safe Audio Playback Helper | `web/src/lib/audio.ts` with browser autoplay policy exception handling | M2 | Survey |
| 15 | Responsive Two-Column Layout | Desktop split: Sidebar (~30–35%) and Chat Area (~65–70%) at `/chat` | M3 | Survey |
| 16 | Collapsible Mobile View | Sliding transition at <768px: 100% width sidebar when idle, 100% width chat with `←` when active | M3 | Survey |
| 17 | Dynamic Viewport Height | `h-[100dvh]` and `overscroll-behavior-y: contain` on layout roots | M3 | Survey |
| 18 | Global Theme Toggle | Dark/light mode switcher with `localStorage` persistence and FOUC prevention script | M3 | Survey |
| 19 | Fastify 4+ Daemon Scaffolding | `socket-server/` with Fastify 4.28, ws 8.18, cors, cookie, dotenv, winston | M4 | Survey |
| 20 | In-Memory RoomManager | `socket-server/src/lib/roomManager.ts` managing user sockets and room channels | M4 | Survey |
| 21 | WsEnvelope Protocol | Typed JSON WebSocket envelope `WsEnvelope<T>` supporting 17 event types | M4 | Survey |
| 22 | Standalone Server Verification | `web/.next/standalone/server.js` generation verified upon `npm run build` | M5 | Survey |
| 23 | TypeScript Verification | `tsc --noEmit` cleanly passes across `web/` and `socket-server/` | M5 | Survey |
| 24 | Checklist Synchronization | Mark lines 12–16 in `chk.txt` as completed (`[x]`) | M5 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Monorepo Workspace & Next.js Standalone | Root `package.json`, `web/`, `shared/`, `next.config.js`, `tailwind.config.ts`, `globals.css` | none | DONE |
| 2 | Core UI Primitives & Notification Audio | `Avatar`, `SearchInput`, `DropdownMenu`, `Modal`, `web/public/sounds/` (`sent.mp3`, `receive.mp3`, `ringtone.mp3`), `audio.ts` | M1 | DONE |
| 3 | Responsive Two-Column Layout & Theme | `web/src/app/chat/` layout and page, `Sidebar.tsx`, `ChatArea.tsx`, `ThemeContext.tsx`, mobile sliding view, `←` button | M1, M2 | DONE |
| 4 | Fastify + Native `ws` Socket Scaffolding | `socket-server/` scaffolding, `RoomManager`, `WsEnvelope<T>`, health check endpoint | M1 | DONE |
| 5 | Quality Gates Verification & chk.txt Sync | Build standalone, typechecks, responsive verification, and `chk.txt` Phase 1 updates | M1, M2, M3, M4 | DONE |

## Interface Contracts

### Component Contracts (`web/src/components/ui/`)
- `AvatarProps`: `{ src?: string | null; alt?: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; isOnline?: boolean; className?: string; onClick?: () => void; }`
- `SearchInputProps`: `{ value: string; onChange: (v: string) => void; onClear?: () => void; placeholder?: string; className?: string; autoFocus?: boolean; }`
- `DropdownMenuProps`: `{ trigger?: React.ReactNode; items: Array<{ id: string; label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean; divider?: boolean; disabled?: boolean; }>; align?: 'left' | 'right'; className?: string; }`
- `ModalProps`: `{ isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode; maxWidth?: 'sm' | 'md' | 'lg' | 'xl'; showCloseButton?: boolean; className?: string; }`

### Realtime Contracts (`shared/src/events.ts` & `socket-server/src/lib/roomManager.ts`)
- `WsEnvelope<T>`: `{ type: 'ping' | 'pong' | 'user:online' | 'user:offline' | 'typing:start' | 'typing:stop' | 'message:send' | 'message:new' | 'message:status' | 'message:reaction' | 'message:delete' | 'audio-call:invite' | 'audio-call:ring' | 'audio-call:accept' | 'audio-call:reject' | 'audio-call:ice-candidate' | 'audio-call:end'; payload: T; }`
- `AuthenticatedWebSocket`: `WebSocket & { userId: string; username: string; isAlive: boolean; rooms: Set<string>; }`
- `RoomManager`:
  - `join(room: string, socket: AuthenticatedWebSocket): void`
  - `leave(room: string, socket: AuthenticatedWebSocket): void`
  - `leaveAll(socket: AuthenticatedWebSocket): void`
  - `registerUser(userId: string, socket: AuthenticatedWebSocket): void`
  - `isUserOnline(userId: string): boolean`
  - `broadcastToRoom(room: string, data: any, excludeSocket?: AuthenticatedWebSocket): void`
  - `sendToUser(userId: string, data: any): void`
