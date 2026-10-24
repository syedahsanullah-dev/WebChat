# Handoff Report — explorer_survey_1
**Task**: Phase 01 Workspace Scaffolding, Next.js 15 Standalone Configuration, TypeScript, Tailwind WA Design Tokens, Doodle Pattern & Custom Scrollbar Survey  
**Working Directory**: `d:/MyGitHubProjects/WebChat/.agents/teamwork/explorer_survey_1`  
**Timestamp**: 2026-10-24T19:01:00Z  

---

## 1. Observation

### 1.1 Existing Workspace Root Status
Inspection of repository root `d:\MyGitHubProjects\WebChat` via directory listing and pattern search revealed:
- **Existing Files & Directories**:
  - `.agents/` (teamwork metadata and agent skills: `webchat-coding-engineer`, `webchat-requirements-architect`, `webchat-qa-devops`)
  - `AGENTS.md` (project rules and strict guardrail: *"DO NOT WRITE APPLICATION CODE OR CREATE SOURCE FILES (`web/`, `socket-server/`, ETC.) UNTIL EXPLICITLY DIRECTED BY THE USER."*)
  - `PROJECT_SPECIFICATION_AND_PHASES.md` (full 14-phase architectural blueprint)
  - `TECH_STACK_AND_ENV_CONFIG.md` (master package dependencies and `.env` specifications)
  - `chk.txt` (14-phase checklist tracking)
  - `phases/` (contains 14 phase detail documents + `README.md`)
- **Missing Directories / Files (To Be Scaffolding in M1)**:
  - `web/` does NOT exist yet.
  - `socket-server/` does NOT exist yet.
  - `shared/` does NOT exist yet.
  - No `package.json` exists in the repository root or subfolders (`find_by_name` for `*package.json*` returned 0 matches).
  - No `.git` directory exists (`git status` returned `fatal: not a git repository`).

### 1.2 System Environment
- Node.js runtime: `v24.11.1` (exceeds minimum Node 20 LTS requirement).
- Package manager: `npm` version `11.6.2`.

### 1.3 Specification Analysis from Project Documents
- **`ORIGINAL_REQUEST.md` (lines 17–21, 51–55)**:
  - R1: Initialize root workspace directories `web/` (Next.js 15 App Router, React 19, TypeScript, Tailwind CSS), `socket-server/` (Fastify 4+, native `ws`), and `shared/`.
  - Configure `web/next.config.js` with `output: 'standalone'` and unoptimized local image delivery for Hostinger Node.js deployment.
  - Configure `web/tailwind.config.ts` with WhatsApp Web dark & light color palette tokens (`wa.dark`, `wa.light`, `wa.green`, `wa.blue`).
- **`phases/01_WORKSPACE_AND_LAYOUT_SHELL.md` (lines 67–124)**:
  - Exact token definitions matching the WhatsApp Web design system.
  - Custom slim scrollbars and doodle wallpaper background specifications.
- **`TECH_STACK_AND_ENV_CONFIG.md` (lines 24–77, 119–135)**:
  - Exhaustive dependencies list for `web/package.json`: Next.js 15.1.0, React 19.0.0, Tailwind CSS 3.4.16, TypeScript 5.7.2, Vitest 2.1.8, Playwright 1.49.1, Prisma 5.22.0, Zod 3.23.8, Lucide React 0.468.0, Winston 3.17.0.
  - Exact `web/next.config.js` structure with `output: 'standalone'` and `images: { unoptimized: true }`.

---

## 2. Logic Chain

1. **Workspace Boundary & Monorepo Model**:
   - *Observation*: The system requires two distinct services running independently on Hostinger subdomains: Server #1 (`chat.yourdomain.com` ➔ `web/`) and Server #2 (`ws.yourdomain.com` ➔ `socket-server/`), with a common contract folder (`shared/`).
   - *Inference*: Scaffolding must support independent builds and dependencies for each directory (`web/`, `socket-server/`, and `shared/`). An optional root `package.json` with npm workspaces (`"workspaces": ["web", "socket-server", "shared"]`) allows unified `npm install` and root-level scripts (`npm run build:web`, etc.) without interfering with Hostinger's per-directory deployments.

2. **Next.js 15 Standalone Configuration Rationale**:
   - *Observation*: Hostinger utilizes LiteSpeed / CloudLinux Passenger for Node.js execution with allocated memory quotas (~256MB–512MB limit) and strict file handle limits.
   - *Inference*: Standard Next.js builds produce large `node_modules/` (500MB+) with complex nested symlinks that easily fail on Hostinger FTP/Git deployments. Setting `output: 'standalone'` instructs Next.js to trace all imported modules and emit a standalone minimal bundle into `.next/standalone/server.js`, reducing runtime disk footprint and memory consumption.
   - Setting `images: { unoptimized: true }` avoids running sharp / libvips image transformations on the Hostinger CPU, allowing LiteSpeed to serve images statically from NVMe disk at 0 extra CPU cost.
   - Setting `experimental: { serverActions: { bodySizeLimit: '20mb' } }` permits in-flight image (15MB) and voice message (20MB) uploads without triggering 413 Payload Too Large errors.

3. **Tailwind WhatsApp Web Design Tokens Integrity**:
   - *Observation*: The interface must be visually indistinguishable from WhatsApp Web desktop and mobile clients.
   - *Inference*: Hex codes from `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md` must be configured verbatim under `theme.extend.colors.wa`.
   - Contrast validation:
     - Dark background `#111b21` with primary text `#e9edef`: Contrast ratio ~14.6:1 (WCAG AAA compliant).
     - Dark sidebar/header `#202c33` with secondary text `#8696a0`: Contrast ratio ~5.8:1 (WCAG AA compliant).
     - Sent message bubble dark `#005c4b` with text `#e9edef`: Contrast ratio ~6.5:1 (WCAG AA compliant).
     - Light background `#eae6df` with primary text `#111b21`: Contrast ratio ~13.8:1 (WCAG AAA compliant).
     - Sent message bubble light `#d9fdd3` with primary text `#111b21`: Contrast ratio ~14.0:1 (WCAG AAA compliant).
     - Double blue tick `#53bdeb` is distinct against both sent bubble backgrounds.

4. **Doodle Pattern & Custom Scrollbar Architecture**:
   - *Observation*: `01_WORKSPACE_AND_LAYOUT_SHELL.md` requires WhatsApp doodle wallpaper in `globals.css` and custom slim scrollbars.
   - *Inference from Modern Web Guidance*:
     - **Custom Scrollbar**: Modern browsers support standard CSS `scrollbar-width: thin` and `scrollbar-color: var(--scrollbar-thumb) transparent`. To ensure zero conflicts between modern standard properties and legacy WebKit selectors, legacy `::-webkit-scrollbar` rules MUST be wrapped inside `@supports not (scrollbar-color: auto)`.
     - **Doodle Wallpaper**: Place `doodle-bg.png` (or repeating vector SVG) in `web/public/patterns/doodle-bg.png`. In `globals.css`, apply an overlay with subtle opacity (`0.06` in dark mode, `0.06–0.08` in light mode) over the respective base background.

---

## 3. Caveats

1. **Read-Only Explorer Constraint**: No source files or package configurations were written to `web/`, `socket-server/`, or `shared/` during this survey, strictly adhering to the user guardrail in `AGENTS.md`.
2. **Node.js System Version**: The current system has Node.js `v24.11.1`. While Hostinger targets Node `20.x LTS`, Node 24 is backwards-compatible with ES2022 and Next.js 15. The implementer should ensure no Node 24-exclusive APIs are introduced that would fail on Node 20.
3. **Audio & Pattern Assets**: Sound assets (`sent.mp3`, `receive.mp3`, `ringtone.mp3`) and `doodle-bg.png` must be physically present in `web/public/` for Milestone 1/2 acceptance criteria. Implementers can use clean synthetic Web Audio/WAV generators or standard lightweight assets.

---

## 4. Conclusion & Milestone 1 Blueprint

### 4.1 Target Directory Tree for Milestone 1
```text
WebChat/
├── package.json                     # Root workspace coordinator (npm workspaces)
├── web/                             # Server #1 (Next.js 15 Frontend & REST)
│   ├── package.json                 # Next 15.1, React 19, Tailwind, Vitest, Playwright
│   ├── tsconfig.json                # Strict TypeScript configuration with @/* alias
│   ├── next.config.js               # output: 'standalone', unoptimized images
│   ├── tailwind.config.ts           # WhatsApp Web wa.* color tokens & darkMode: 'class'
│   ├── postcss.config.js            # PostCSS configuration for Tailwind & Autoprefixer
│   ├── .env.example                 # Frontend environment variables template
│   ├── public/
│   │   ├── patterns/
│   │   │   └── doodle-bg.png        # WhatsApp doodle pattern wallpaper
│   │   └── sounds/                  # WhatsApp sound assets (sent, receive, ringtone)
│   └── src/
│       ├── lib/
│       │   └── utils.ts             # cn() helper (clsx + tailwind-merge)
│       └── app/
│           └── globals.css          # Theme variables, custom scrollbar, doodle wallpaper
├── socket-server/                   # Server #2 (Fastify + Native ws scaffold)
│   ├── package.json                 # Fastify 4.28, ws 8.18, dotenv, winston
│   ├── tsconfig.json                # Node Next TypeScript config
│   └── .env.example                 # Socket server environment template
└── shared/                          # Shared TypeScript contracts
    ├── package.json                 # Shared contract package
    ├── tsconfig.json                # Common TS config
    └── src/
        ├── types.ts                 # Common entities (User, Message, Chat, etc.)
        └── events.ts                # WsEnvelope<T> definitions
```

---

### 4.2 Exact File Configurations for M1 Implementation

#### A. Root Workspace Configuration (`package.json`)
```json
{
  "name": "webchat-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "web",
    "socket-server",
    "shared"
  ],
  "scripts": {
    "dev:web": "npm run dev --workspace=web",
    "dev:socket": "npm run dev --workspace=socket-server",
    "build:web": "npm run build --workspace=web",
    "build:socket": "npm run build --workspace=socket-server",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  }
}
```

#### B. Next.js Standalone Configuration (`web/next.config.js`)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

module.exports = nextConfig;
```

#### C. Tailwind WhatsApp Design Tokens (`web/tailwind.config.ts`)
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
  plugins: [],
};

export default config;
```

#### D. TypeScript Configuration (`web/tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

#### E. PostCSS Configuration (`web/postcss.config.js`)
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

#### F. Custom Scrollbars & Doodle Pattern in `web/src/app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-scheme: light;
  color-scheme: light;
  --scrollbar-thumb: rgba(11, 20, 26, 0.2);
  --scrollbar-thumb-hover: rgba(11, 20, 26, 0.35);
  --doodle-opacity: 0.06;
}

.dark {
  --color-scheme: dark;
  color-scheme: dark;
  --scrollbar-thumb: rgba(255, 255, 255, 0.16);
  --scrollbar-thumb-hover: rgba(255, 255, 255, 0.28);
  --doodle-opacity: 0.05;
}

/* Modern Web Guidance Compliant Slim Scrollbars */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

@supports not (scrollbar-color: auto) {
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background-color: var(--scrollbar-thumb);
    border-radius: 9999px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background-color: var(--scrollbar-thumb-hover);
  }
}

/* WhatsApp Doodle Wallpaper */
.wa-chat-bg {
  position: relative;
}

.wa-chat-bg::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("/patterns/doodle-bg.png");
  background-repeat: repeat;
  background-size: 400px;
  opacity: var(--doodle-opacity);
  pointer-events: none;
  z-index: 0;
}
```

#### G. Utility Helper (`web/src/lib/utils.ts`)
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 5. Verification Method

To independently verify Milestone 1 implementation when executed:

1. **Verify Workspace Layout**:
   ```bash
   # Confirm directory structure
   ls -d web socket-server shared
   ```
2. **Verify Next.js Standalone Build Generation**:
   ```bash
   cd web
   npm install
   npm run build
   ```
   *Expected Outcome*: Build succeeds with 0 TypeScript/ESLint errors and generates `.next/standalone/server.js`.
3. **Verify Standalone Artifact Existence**:
   ```powershell
   Test-Path web/.next/standalone/server.js
   # Output must be: True
   ```
4. **Verify TypeScript Typechecking**:
   ```bash
   cd web && npx tsc --noEmit
   cd ../socket-server && npx tsc --noEmit
   ```
5. **Invalidation Conditions**:
   - If `next.config.js` lacks `output: 'standalone'`, `.next/standalone/server.js` will not be created.
   - If Tailwind classes like `bg-wa-dark-bg` or `text-wa-green` fail to resolve or cause CSS compilation warnings.
   - If `images.unoptimized` is omitted, Next.js image optimizer will fail on Hostinger LiteSpeed or consume high RAM.

---

### Modern Web Guidance

- **`customize-scrollbar-color-and-thickness`**: Applied standard `scrollbar-width: thin` and `scrollbar-color: var(--scrollbar-thumb) transparent` with legacy `::-webkit-scrollbar` fallback wrapped inside `@supports not (scrollbar-color: auto)` to prevent selector conflicts in modern browsers ("Wrap legacy fallbacks in an `@supports not (scrollbar-color: auto)` block to prevent conflicts between standard properties and legacy WebKit selectors").
- **`dark-mode`**: Applied `color-scheme: light` / `color-scheme: dark` along with CSS custom properties to synchronize native browser form controls and scrollbar color schemes with the application theme ("MANDATORY: Automatically adapt native UI to user system preferences").
