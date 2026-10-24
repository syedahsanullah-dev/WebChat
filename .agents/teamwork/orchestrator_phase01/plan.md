# Phase 01 Execution Plan

## Objective
Deliver all Phase 01 deliverables defined in `ORIGINAL_REQUEST.md`, `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`, `TECH_STACK_AND_ENV_CONFIG.md`, and `chk.txt`.

## Milestones Breakdown

### M1: Monorepo Workspace & Next.js Standalone Configuration
- Initialize root workspace directories: `web/`, `socket-server/`, `shared/`
- Configure `web/package.json` with Next.js 15+ App Router, React 19, TypeScript, Tailwind CSS
- Configure `web/next.config.js` with `output: 'standalone'` and unoptimized local image delivery for Hostinger Node.js deployment
- Configure `web/tailwind.config.ts` with WhatsApp Web dark & light color palette tokens (`wa.dark`, `wa.light`, `wa.green`, `wa.blue`) per specification
- Configure `web/src/app/globals.css` with doodle pattern background, theme variables, and custom slim scrollbars

### M2: Core UI Primitives & Notification Audio
- Build reusable UI primitives matching WhatsApp Web design:
  - `Avatar`: Circular avatar with fallback initials and bottom-right online green indicator dot
  - `SearchInput`: Search input with WA magnifying glass icon, clear button, and global `Ctrl + /` (or `Cmd + /`) keyboard shortcut listener
  - `DropdownMenu`: Accessible three-dots vertical menu icon (`⋮`) with popover action items
  - `Modal`: Accessible backdrop overlay modal with escape key listener and focus management
- Provide notification audio assets in `web/public/sounds/`:
  - `sent.mp3` (message sent pop)
  - `receive.mp3` (notification chime)
  - `ringtone.mp3` (audio call ringing loop)

### M3: Responsive WhatsApp Web Two-Column Layout Shell
- Implement the split-screen layout in `web/src/app/chat/`:
  - Desktop: Left sidebar (~30–35% width) and right chat area (~65–70% flex-grow)
  - Mobile (< 768px): Full-width sidebar when no conversation is active; sliding full-width active chat view with back arrow button (`←`) when a conversation is opened
  - `h-[100dvh]` on layout containers to avoid mobile navigation bar height shifts, `overscroll-behavior-y: contain`
- Global dark/light theme support with toggle and `localStorage` persistence

### M4: Fastify + Native `ws` Socket Server Scaffolding
- Scaffold `socket-server/` with `package.json`, `tsconfig.json`, and dependencies per `TECH_STACK_AND_ENV_CONFIG.md` (`fastify`, `ws`, `@fastify/cors`, `@fastify/cookie`, `dotenv`, `winston`)
- In-memory `RoomManager` (`socket-server/src/lib/roomManager.ts`)
- TypeScript `WsEnvelope<T>` envelope definitions in `shared/` or `socket-server/src/types/`

### M5: Verification & Quality Gates
- Verify clean builds (`npm run build` generates `.next/standalone/server.js`)
- Verify TypeScript types & lint
- Verify responsive layout & shortcut
- Verify audio assets existence
- Update `chk.txt` marking Phase 1 items `[x]`

## Dispatch Strategy
1. Dispatch Explorers to map existing workspace structure, reference files, and exact token definitions.
2. Dispatch Worker for implementation per milestone.
3. Dispatch Reviewers, Challengers, and Forensic Auditor.
4. Gate check: pass all verification before marking done and reporting to Sentinel.
