# Handoff Report — explorer_survey_2
**Task**: Comprehensive Requirements Analysis for R2 (Two-Column Responsive Layout Shell & Theme) & R3 (Core UI Primitives & Notification Audio)  
**Target Milestone**: Phase 01 Workspace & Layout Shell Scaffolding  
**Author**: `explorer_survey_2` (UI & Layout Investigator)  
**Recipient**: `orchestrator_phase01` (`1b05ab63-db30-4f14-ad7b-d073ca88e758`)  
**Date**: 2026-10-25  

---

## 1. Observation

### 1.1 Specification Citations from `ORIGINAL_REQUEST.md`
- **R2 Requirements** (lines 22–28):
  > "Implement the split-screen layout in `web/src/app/chat/`:
  > - Desktop: Left sidebar (~30–35% width) and right chat area (~65–70% flex-grow).
  > - Mobile (< 768px): Full-width sidebar when no conversation is active; sliding full-width active chat view with back arrow button (`←`) when a conversation is opened.
  > - Set `h-[100dvh]` on layout containers to avoid mobile navigation bar height shifts and `overscroll-behavior-y: contain` to prevent accidental pull-to-refresh.
  > - Global dark/light theme support with toggle and `localStorage` persistence.
  > - Add WhatsApp doodle wallpaper background in `globals.css` and custom slim scrollbars."

- **R3 Requirements** (lines 30–40):
  > "Build reusable UI primitives matching WhatsApp Web design:
  > - `Avatar`: Circular avatar with fallback initials and bottom-right online green indicator dot when active.
  > - `SearchInput`: Search input with WhatsApp magnifying glass icon, clear button, and global `Ctrl + /` (or `Cmd + /`) keyboard shortcut listener.
  > - `DropdownMenu`: Accessible three-dots vertical menu icon (`⋮`) with popover action items.
  > - `Modal`: Accessible backdrop overlay modal with escape key listener and focus management.
  > Provide notification audio assets in `web/public/sounds/`:
  > - `sent.mp3` (message sent pop)
  > - `receive.mp3` (notification chime)
  > - `ringtone.mp3` (audio call ringing loop)"

### 1.2 Layout & Component Directives from `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`
- Lines 40–48: Target UI component architecture:
  ```text
  web/src/components/layout/
  ├── Sidebar.tsx      # Left panel (~35% width, collapsible on mobile)
  ├── ChatArea.tsx     # Right panel (~65% width)
  └── Header.tsx       # Sidebar & Chat headers with action icons
  web/src/components/ui/
  ├── Avatar.tsx       # User avatar with online badge and fallback initials
  ├── SearchInput.tsx  # Search bar with clear button & Ctrl + / listener
  ├── DropdownMenu.tsx # WhatsApp three-dot dropdown
  └── Modal.tsx        # Accessible backdrop modal primitive
  ```
- Lines 140–155:
  - `Avatar.tsx`: Circular avatar with initials fallback; bottom-right green dot when `isOnline = true`.
  - `SearchInput.tsx`: Search bar with WA magnifying glass icon, clear button, and global `Ctrl + /` (or `Cmd + /`) listener that immediately focuses input.
  - `DropdownMenu.tsx`: Accessible three-dots vertical menu (`⋮`) with popover options (New Group, Profile, Settings, Log out).
  - `Modal.tsx`: Reusable backdrop overlay modal with escape key listener and focus management.
  - Sound assets: `web/public/sounds/` (`sent.mp3`, `receive.mp3`, `ringtone.mp3`).

### 1.3 Technical Constraints from `TECH_STACK_AND_ENV_CONFIG.md` & `AGENTS.md`
- Frontend dependencies: Next.js 15.1.0, React 19, Tailwind CSS 3.4.16, `lucide-react` 0.468.0, `clsx` 2.1.1, `tailwind-merge` 2.5.5.
- Zero added cost ($0.00 / mo): No paid component libraries, no external CDN subscriptions.
- System check: Node.js `v24.11.1` is installed. `ffmpeg` is not installed on system path; audio generation must therefore be binary-synthesized or script-generated via standard base64/PCM without third-party CLI dependencies.

### 1.4 Modern Web Standards Insights (`modern-web-guidance`)
- **`light-dismiss-a-dialog`**: In accessible modal dialogs, light dismiss (clicking backdrop) must be handled cleanly. When using custom backdrop or `<dialog>`, distinguish clicks on the backdrop from clicks on the dialog content (`rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width`).
- **`dark-mode-toggle`**: To prevent Flash of Unstyled Content (FOUC), an inline script in `<head>` must resolve the stored `localStorage` value or system preference before initial paint. Multi-tab synchronization is achieved via `window.addEventListener('storage', ...)`.

---

## 2. Logic Chain

### 2.1 Responsive Layout Geometry & Mobile View Sliding (< 768px)
1. **Desktop Behavior (>= 768px / `md` breakpoint)**:
   - Sidebar is allocated `w-[35%] lg:w-[30%] min-w-[320px] max-w-[500px]` with right border `border-r border-wa-light-border dark:border-wa-dark-border`.
   - ChatArea occupies remaining viewport with `flex-1 min-w-0`.
   - When no chat is selected (`activeChatId === null`), ChatArea displays the empty state placeholder (WhatsApp Web computer icon, end-to-end encrypted lock badge).
2. **Mobile Behavior (< 768px)**:
   - Screen width is insufficient for side-by-side rendering.
   - Dual-state sliding container architecture:
     - State A (`activeChatId === null`): Sidebar occupies `w-full`, ChatArea is hidden or shifted offscreen.
     - State B (`activeChatId !== null`): ChatArea slides into view occupying `w-full`, Sidebar is hidden or shifted offscreen.
   - Using CSS transform transitions (`transition-transform duration-300 ease-in-out -translate-x-full md:translate-x-0` vs `translate-x-0`) provides hardware-accelerated 60fps sliding on mobile Chrome.
3. **Back Button (`←`)**:
   - Resides in `ChatArea` header.
   - Classes: `inline-flex md:hidden mr-2 p-1.5 rounded-full hover:bg-wa-dark-hover text-wa-dark-text-secondary`.
   - On click, triggers `onBack()` callback which sets `activeChatId = null` (or navigates to `/chat`), smoothly sliding mobile viewport back to Sidebar.
4. **Mobile Height Jumps & Refresh Prevention**:
   - `h-[100dvh]` dynamically adapts to mobile browser bottom/top navigation bars, eliminating vertical jumps common with `100vh`.
   - `overscroll-behavior-y: contain` placed on layout root prevents unwanted pull-to-refresh gestures when scrolling message lists.

### 2.2 Dark/Light Theme Architecture & Persistence
1. Tailwind `darkMode: 'class'` allows class-driven styling on `<html>`.
2. Storage key: `'webchat_theme'` with values `'dark' | 'light'`.
3. FOUC prevention: In `web/src/app/layout.tsx`, an inline non-blocking blocking script inside `<head>` reads `localStorage.getItem('webchat_theme')` or checks `window.matchMedia('(prefers-color-scheme: dark)').matches` and applies the `'dark'` class to `document.documentElement` before hydration.
4. React `ThemeContext` provides `theme`, `toggleTheme()`, and registers a `storage` event listener to sync state across browser tabs.

### 2.3 UI Primitives Architecture
1. **`Avatar.tsx`**:
   - Circular wrapper with size variants (`sm`: 32px, `md`: 40px, `lg`: 48px, `xl`: 80px).
   - Generates 1–2 uppercase initials from name/username if `src` is missing or fails to load.
   - Online indicator: Green dot (`#00a884`) positioned at `bottom-0 right-0` with ring border (`ring-2 ring-wa-light-header dark:ring-wa-dark-header`).
2. **`SearchInput.tsx`**:
   - Magnifying glass icon (`Search` from `lucide-react`) and dynamic clear button (`X`).
   - Global keyboard shortcut: `window.addEventListener('keydown', (e) => (e.ctrlKey || e.metaKey) && e.key === '/')` prevents default and calls `inputRef.current?.focus()`.
   - Clean cleanup on unmount prevents listener leaks.
3. **`DropdownMenu.tsx`**:
   - Accessible three-dots vertical icon button (`MoreVertical`).
   - Floating popover menu positioned absolutely with WhatsApp elevation (`shadow-2xl`).
   - Light dismiss on outside click and `Escape` key dismiss.
4. **`Modal.tsx`**:
   - Accessible overlay dialog with `fixed inset-0 bg-black/70 backdrop-blur-xs z-50`.
   - Traps focus and locks body scroll (`document.body.style.overflow = 'hidden'`).
   - Closes on `Escape` key press and on clicking the backdrop outside dialog box.

### 2.4 Notification Audio Assets Provisioning
1. Required files:
   - `web/public/sounds/sent.mp3` (~8 KB): Crisp high-frequency pop.
   - `web/public/sounds/receive.mp3` (~16 KB): Two-tone melodic chime.
   - `web/public/sounds/ringtone.mp3` (~48 KB): Repeating audio call ringing tone.
2. Binary Delivery Strategy:
   - Because `ffmpeg` is not pre-installed on the host OS, generating these audio assets via a self-contained Node script writing base64-encoded valid MP3 buffers directly to `web/public/sounds/` guarantees 100% portability, zero external dependencies, and immediate browser playability.
3. Audio Client Helper (`web/src/lib/audio.ts`):
   - Encapsulates `HTMLAudioElement` creation and playback.
   - Handles browser autoplay policy restrictions gracefully: catches `NotAllowedError` without uncaught promise rejection.

---

## 3. Caveats

1. **Autoplay Policy on Mobile Chrome**: Browsers do not permit unmuted audio playback until the user has performed at least one interaction (tap/click) with the document. `web/src/lib/audio.ts` must catch and swallow autoplay rejection promises.
2. **Next.js 15 Client vs Server Components**: Layout containers with `localStorage` or keyboard listeners and UI primitives with state must be designated `'use client'`.
3. **No External Icon Fonts**: Exclusively use `lucide-react` for UI icons to eliminate external HTTP font dependencies.

---

## 4. Conclusion & Component Blueprint

### 4.1 Component Contracts & Exact Props

#### A. `web/src/components/ui/Avatar.tsx`
```typescript
export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
  onClick?: () => void;
}
```
- **Size mappings**:
  - `'sm'`: Container `w-8 h-8 text-xs`, indicator `w-2.5 h-2.5`
  - `'md'`: Container `w-10 h-10 text-sm`, indicator `w-3 h-3`
  - `'lg'`: Container `w-12 h-12 text-base`, indicator `w-3.5 h-3.5`
  - `'xl'`: Container `w-20 h-20 text-xl`, indicator `w-5 h-5`
- **Fallback logic**:
  ```typescript
  export function getInitials(name: string): string {
    const clean = name.trim().replace(/^@/, '');
    if (!clean) return '?';
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }
  ```

#### B. `web/src/components/ui/SearchInput.tsx`
```typescript
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}
```
- **Keyboard listener**:
  ```typescript
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  ```

#### C. `web/src/components/ui/DropdownMenu.tsx`
```typescript
export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger?: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}
```
- **Accessibility & Dismissal**:
  - `role="menu"` on popover, `role="menuitem"` on actions.
  - Closes on click outside via `pointerdown` listener and on `Escape` key.

#### D. `web/src/components/ui/Modal.tsx`
```typescript
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}
```
- **Accessibility & Dismissal**:
  - `role="dialog"`, `aria-modal="true"`.
  - Body scroll lock during open state.
  - Closes on `Escape` key and backdrop boundary click.

#### E. `web/src/lib/audio.ts`
```typescript
export const SOUND_PATHS = {
  sent: '/sounds/sent.mp3',
  receive: '/sounds/receive.mp3',
  ringtone: '/sounds/ringtone.mp3',
} as const;

export function playSound(path: string, volume = 0.7): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  try {
    const audio = new Audio(path);
    audio.volume = volume;
    audio.play().catch(() => {
      // Swallows mobile browser autoplay policy rejections cleanly
    });
    return audio;
  } catch {
    return null;
  }
}

export const playSentSound = () => playSound(SOUND_PATHS.sent, 0.6);
export const playReceiveSound = () => playSound(SOUND_PATHS.receive, 0.8);
export const startRingtone = () => {
  const audio = playSound(SOUND_PATHS.ringtone, 1.0);
  if (audio) {
    audio.loop = true;
  }
  return () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };
};
```

### 4.2 Two-Column Layout Shell Architecture

#### Structure of `web/src/app/chat/layout.tsx`
```tsx
'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import ChatArea from '@/components/layout/ChatArea';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-wa-light-bg dark:bg-wa-dark-bg text-wa-light-text-primary dark:text-wa-dark-text-primary overscroll-y-contain relative">
      {/* Sidebar Panel */}
      <div
        className={`h-full w-full md:w-[35%] lg:w-[30%] min-w-[320px] max-w-[500px] flex-shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          activeChatId ? '-translate-x-full absolute md:relative' : 'translate-x-0 relative'
        }`}
      >
        <Sidebar onSelectChat={(id) => setActiveChatId(id)} activeChatId={activeChatId} />
      </div>

      {/* Chat Area Panel */}
      <div
        className={`h-full flex-1 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          activeChatId ? 'translate-x-0 relative w-full' : 'translate-x-full absolute md:relative w-full'
        }`}
      >
        <ChatArea activeChatId={activeChatId} onBack={() => setActiveChatId(null)}>
          {children}
        </ChatArea>
      </div>
    </div>
  );
}
```

---

## 5. Verification Method

To independently verify R2 and R3 implementation:

1. **Responsive Viewport Test**:
   - In Chrome DevTools, toggle device mode:
     - Set width to `1024px`: verify two columns (Sidebar ~35%, Chat Area ~65%) render simultaneously.
     - Set width to `375px` (Mobile): verify Sidebar fills 100% width. Click a chat item: verify Chat Area slides in with the `←` back button visible. Click `←`: verify Sidebar is restored.
2. **Keyboard Shortcut Test**:
   - In any focused state on `/chat`, press `Ctrl + /` (or `Cmd + /` on macOS).
   - Verify the SearchInput immediately receives DOM focus and selects any existing text.
3. **Theme Toggle & Persistence Test**:
   - Click the theme toggle icon in Sidebar header.
   - Inspect `document.documentElement.classList`: verify `'dark'` class toggles on/off.
   - Verify `localStorage.getItem('webchat_theme')` records `'dark'` or `'light'`.
   - Reload the page: verify the chosen theme persists without flashing the opposite scheme.
4. **Modal & Dropdown Dismissal Test**:
   - Open Modal: press `Escape` or click outside dialog content box: verify modal closes.
   - Open DropdownMenu: press `Escape` or click outside: verify menu closes.
5. **Sound Asset Verification**:
   - Verify files exist on disk:
     - `web/public/sounds/sent.mp3`
     - `web/public/sounds/receive.mp3`
     - `web/public/sounds/ringtone.mp3`
   - Trigger `playSentSound()` in browser console: verify no unhandled promise rejection occurs.

---

### Modern Web Guidance
- **`light-dismiss-a-dialog`**: Applied backdrop boundary checks (`rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width`) preventing accidental dismissal when clicking inside modal borders ("Check if the click coordinates fall within the dialog's content box").
- **`dark-mode-toggle`**: Implemented inline `<head>` script and storage event sync avoiding flash of unthemed content and keeping tabs synchronized ("Persist the override in localStorage; remove the entry when returning to the system default").
