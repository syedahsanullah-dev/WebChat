# Phase 01: Workspace Scaffolding & WhatsApp Web Layout Shell

## 1. Phase Overview & Objectives
**Target Workspace**: Root & `web/` (Server #1)  
**Primary Goal**: Establish the dual-application monorepo structure, set up Next.js 15+ with Tailwind CSS matching WhatsApp Web design tokens, scaffold `socket-server/` with Fastify + native `ws`, and build the pixel-perfect, responsive two-column chat shell with UI primitives and audio assets.

---

## 2. Context & Prerequisites
- **Previous Phase**: None (Initial bootstrapping phase).
- **Environment**: Node.js 20 LTS, npm/pnpm.
- **Constraints**:
  - `web/next.config.js` must be configured with `output: 'standalone'` for Hostinger Node.js deployment.
  - Zero external paid UI component libraries (use Tailwind CSS + Lucide React + custom primitives).
  - All styling must replicate WhatsApp Web's desktop and mobile layouts.
  - Detailed dependencies and scripts in [`TECH_STACK_AND_ENV_CONFIG.md`](../TECH_STACK_AND_ENV_CONFIG.md).

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/                             # Server #1: Next.js 15+ App Router
│   ├── public/
│   │   ├── sounds/                  # WhatsApp audio assets
│   │   │   ├── sent.mp3             # Outgoing message pop
│   │   │   ├── receive.mp3          # Incoming message chime
│   │   │   └── ringtone.mp3         # Audio call ringing loop
│   │   └── patterns/
│   │       └── doodle-bg.png        # WhatsApp doodle pattern wallpaper
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Global root layout (Dark/Light provider)
│   │   │   ├── page.tsx             # Redirects to /chat or /login
│   │   │   └── chat/
│   │   │       ├── layout.tsx       # Main 2-column responsive layout wrapper
│   │   │       └── page.tsx         # Active chat area / empty state placeholder
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx      # Left panel (~35% width, collapsible on mobile)
│   │   │   │   ├── ChatArea.tsx     # Right panel (~65% width)
│   │   │   │   └── Header.tsx       # Sidebar & Chat headers with action icons
│   │   │   └── ui/
│   │   │       ├── Avatar.tsx       # User avatar with online badge and fallback initials
│   │   │       ├── SearchInput.tsx  # Search bar with clear button & `Ctrl + /` listener
│   │   │       ├── DropdownMenu.tsx # WhatsApp three-dot dropdown
│   │   │       └── Modal.tsx        # Accessible backdrop modal primitive
│   │   ├── styles/
│   │   │   └── globals.css          # Doodle wallpaper pattern, scrollbar styles
│   │   └── lib/
│   │       └── utils.ts             # Tailwind class merging (`clsx`, `tailwind-merge`)
│   ├── next.config.js               # output: 'standalone'
│   ├── tailwind.config.ts           # WhatsApp Web design tokens
│   ├── tsconfig.json
│   └── package.json
├── socket-server/                   # Server #2: Fastify + Native ws scaffold
│   ├── package.json                 # Fastify 4+, ws, @fastify/cors, dotenv
│   └── tsconfig.json
└── shared/                          # Shared TypeScript types & contracts
    └── src/
        └── types.ts
```

---

## 4. WhatsApp Web Design System Tokens (Tailwind CSS)

Configure `web/tailwind.config.ts` with these exact hex color tokens:

```typescript
// web/tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wa: {
          dark: {
            bg: '#111b21',
            sidebar: '#202c33',
            header: '#202c33',
            border: '#222e35',
            input: '#2a3942',
            sent: '#005c4b',
            received: '#202c33',
            hover: '#202c33',
            active: '#2a3942',
            text: {
              primary: '#e9edef',
              secondary: '#8696a0',
              muted: '#667781',
            },
          },
          light: {
            bg: '#eae6df',
            sidebar: '#ffffff',
            header: '#f0f2f5',
            border: '#e9edef',
            input: '#f0f2f5',
            sent: '#d9fdd3',
            received: '#ffffff',
            hover: '#f5f6f6',
            active: '#ebebeb',
            text: {
              primary: '#111b21',
              secondary: '#667781',
              muted: '#8696a0',
            },
          },
          green: {
            DEFAULT: '#00a884',
            light: '#25d366',
            dark: '#008069',
          },
          blue: {
            tick: '#53bdeb',
          },
        },
      },
    },
  },
};
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Monorepo & Directory Scaffolding**:
  - Create root workspace with `web/`, `socket-server/`, and `shared/`.
  - Initialize `web/` with Next.js 15+ App Router, React 19, TypeScript, and Tailwind CSS.
  - Initialize `socket-server/` with Fastify 4+ and native `ws` (see `TECH_STACK_AND_ENV_CONFIG.md`).
  - Set `output: 'standalone'` in `web/next.config.js`.
- [ ] **2. WhatsApp Web Theme & Global Styles**:
  - Populate `web/tailwind.config.ts` with custom `wa` color tokens.
  - Add dark/light mode toggle with theme persistence in `localStorage`.
  - In `globals.css`, add the subtle dark CSS doodle background pattern for the active chat area.
  - Customize scrollbars to match WhatsApp's slim, semi-transparent scrollbar.
- [ ] **3. Responsive Two-Column Layout Shell**:
  - Implement `web/src/app/chat/layout.tsx`:
    - Desktop: Split screen (Left: 30%–35% fixed width, Right: 65%–70% flex-grow).
    - Mobile (`< 768px`): Dynamic single-column view using URL state or active chat selection. When no conversation is open, show the sidebar full-width; when a conversation is open, slide in the chat area full-width with a back arrow button (`←`).
    - Use `100dvh` for all layout heights to avoid Android/iOS Chrome navigation bar jumping.
- [ ] **4. Core UI Primitives**:
  - `Avatar.tsx`: Circular avatar displaying image with fallback uppercase initials; includes bottom-right online green indicator dot when `isOnline = true`.
  - `SearchInput.tsx`: Search bar with WhatsApp magnifying glass icon, clear button, and global `Ctrl + /` (or `Cmd + /`) keyboard shortcut listener that focuses the input.
  - `DropdownMenu.tsx`: Accessible three-dots vertical menu icon (`⋮`) with popup options (New Group, Profile, Settings, Log out).
  - `Modal.tsx`: Reusable backdrop overlay modal with escape key listener and focus trap.
- [ ] **5. Audio & Asset Setup**:
  - Place synthesized or standard WhatsApp Web notification sounds into `web/public/sounds/`:
    - `sent.mp3` (subtle pop for message sent)
    - `receive.mp3` (standard notification chime)
    - `ringtone.mp3` (ringing sound loop for incoming voice calls)

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 01 complete, verify:
1. `npm run dev` in `web/` starts cleanly on `http://localhost:3000`.
2. Accessing `http://localhost:3000/chat` renders the two-column WhatsApp layout.
3. Resizing the browser window to mobile width (`375px`):
   - The sidebar takes 100% width.
   - Clicking a mock chat item smoothly transitions to the chat view with a working back arrow (`←`).
4. Pressing `Ctrl + /` immediately focuses the search bar.
5. `npm run build` in `web/` completes with zero TypeScript errors and generates `.next/standalone/server.js`.

---

## 7. Handoff to Phase 02
Phase 02 will connect the layout to Hostinger's MySQL database via Prisma ORM, create all 7 database models, and initialize the Fastify 4+ & Native `ws` daemon (Server #2) with the in-memory `RoomManager` in `socket-server/`.
