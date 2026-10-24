# DISPATCH — worker_ui_layout

- **Role**: Frontend UI & Layout Engineer
- **Working Directory**: d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_ui_layout
- **Parent**: orchestrator_phase01
- **Domain Skill Path**: d:/MyGitHubProjects/WebChat/.agents/skills/webchat-coding-engineer/SKILL.md
- **Exclusive File Ownership**:
  - `web/src/components/ui/Avatar.tsx`
  - `web/src/components/ui/SearchInput.tsx`
  - `web/src/components/ui/DropdownMenu.tsx`
  - `web/src/components/ui/Modal.tsx`
  - `web/src/lib/audio.ts`
  - `web/public/sounds/sent.mp3`
  - `web/public/sounds/receive.mp3`
  - `web/public/sounds/ringtone.mp3`
  - `web/src/context/ThemeContext.tsx`
  - `web/src/app/layout.tsx`
  - `web/src/components/layout/Header.tsx`
  - `web/src/components/layout/Sidebar.tsx`
  - `web/src/components/layout/ChatArea.tsx`
  - `web/src/app/chat/layout.tsx`
  - `web/src/app/chat/page.tsx`
- **Inputs**:
  - `d:/MyGitHubProjects/WebChat/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY: read this first!)
  - `PROJECT.md`
  - `d:/MyGitHubProjects/WebChat/.agents/teamwork/explorer_survey_2/handoff.md` (Contains exact component blueprints, props, and accessibility specifications!)
  - `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`

- **Task**:
  Implement Milestones 2 and 3 in `web/`:
  1. **Notification Audio Assets & Helper**:
     - Generate valid, audible audio assets in `web/public/sounds/`: `sent.mp3`, `receive.mp3`, `ringtone.mp3` (Use Node.js script to synthesize or write valid standard MP3 byte streams). Verify file existence and non-zero size.
     - Implement `web/src/lib/audio.ts` with `playSentSound()`, `playReceiveSound()`, and `startRingtone()` looping helper, cleanly catching and handling browser autoplay restrictions.
  2. **Core UI Primitives (`web/src/components/ui/`)**:
     - `Avatar.tsx`: Circular avatar with size variants (`sm`, `md`, `lg`, `xl`), initials fallback generator (`getInitials`), and bottom-right online green indicator dot (`#00a884`) when `isOnline=true`.
     - `SearchInput.tsx`: Search bar with WhatsApp magnifying glass icon, clear button, and global `Ctrl + /` (and `Cmd + /`) keyboard shortcut listener that immediately focuses and selects the input.
     - `DropdownMenu.tsx`: Accessible three-dots vertical menu icon (`⋮`), popover positioning, outside-click and Escape key light dismiss.
     - `Modal.tsx`: Accessible backdrop overlay modal (`role="dialog"`), backdrop click dismiss, Escape key dismiss, and body scroll lock.
  3. **Theme System & Root Layout**:
     - `web/src/context/ThemeContext.tsx`: React Context providing `theme` (`'light' | 'dark'`), `toggleTheme()`, persistence in `localStorage.setItem('webchat_theme', ...)`, and multi-tab sync via `storage` event listener.
     - `web/src/app/layout.tsx`: Root Next.js layout incorporating inline `<script>` in `<head>` to prevent Flash of Unstyled Content (FOUC) and wrapping with `ThemeProvider`.
  4. **Responsive Layout Shell (`web/src/components/layout/` & `web/src/app/chat/`)**:
     - `Sidebar.tsx`: Search bar, header with user avatar, theme toggle button, 3-dots dropdown menu, and a mock list of recent conversations.
     - `ChatArea.tsx`: Top header with active chat contact avatar, name, status, call icons, three-dots menu; mobile back button (`←`) visible only on mobile screens; message area styled with `.wa-chat-bg`; empty state placeholder when no chat selected.
     - `web/src/app/chat/layout.tsx`: `h-[100dvh]` and `overscroll-behavior-y: contain`. Desktop: two columns (Sidebar ~35%, Chat Area ~65%). Mobile (< 768px): full-width sidebar when idle, smooth sliding transition (`transition-transform duration-300`) to full-width chat with working `←` back button when a conversation is active.
     - `web/src/app/chat/page.tsx`: Route page.
  5. **Verification**:
     - Run `npx tsc --noEmit` in `web/` to verify zero TypeScript errors.
     - Run `npm run build` in `web/` to verify clean Next.js build and creation of `.next/standalone/server.js`.

- **Mandatory Integrity Warning**:
  DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

- **Output**:
  Write handoff report to `d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_ui_layout/handoff.md` with:
  - Observation: files created, component APIs
  - Logic Chain: design decisions and accessibility compliance
  - Build/Test Results: `tsc --noEmit` and `npm run build` outputs (including confirmation of `.next/standalone/server.js`)
  - Verification commands


## 2026-10-24T19:15:32Z
Received dispatch from parent orchestrator:
Implement Milestones 2 & 3:
1. Generate valid audio notification files in web/public/sounds/: sent.mp3, receive.mp3, ringtone.mp3.
2. Implement web/src/lib/audio.ts with safe playback and autoplay catch.
3. Build UI primitives in web/src/components/ui/: Avatar.tsx (with initials fallback and online indicator dot), SearchInput.tsx (with WhatsApp magnifying glass, clear button, and global Ctrl + / keyboard shortcut listener), DropdownMenu.tsx (three-dots vertical icon with accessible popover and light dismiss), Modal.tsx (accessible dialog with focus management, backdrop dismiss, and Escape listener).
4. Implement Theme system: web/src/context/ThemeContext.tsx (with localStorage persistence and multi-tab sync) and web/src/app/layout.tsx (with FOUC prevention script).
5. Build WhatsApp Web 2-column layout shell: web/src/components/layout/Header.tsx, Sidebar.tsx (search bar, avatar, theme toggle, 3-dots menu, chat items), ChatArea.tsx (header with call icons, back button for mobile, chat doodle background .wa-chat-bg, empty state placeholder).
6. Implement web/src/app/chat/layout.tsx (h-[100dvh], overscroll-behavior-y: contain, responsive 2-column on desktop >=768px, sliding transition on mobile <768px with back arrow ←) and web/src/app/chat/page.tsx.
7. Run typecheck (npx tsc --noEmit) and build (npm run build) in web/. Verify that .next/standalone/server.js is generated!
8. Write your handoff report to d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_ui_layout/handoff.md and notify me when complete.
