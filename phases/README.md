# WebChat Implementation Phases Master Index
## Autonomous Multi-Agent Vibe Coding Guide

This directory contains the self-contained phase specifications for developing the WhatsApp Web clone on Hostinger ($0 / month added cost) using **Next.js 15 Standalone** and **Fastify 4+ & Native `ws`**.

Each phase file is authored so an autonomous agent needs **only the current phase file and the immediately preceding phase file** to execute its task with full context.

---

## 1. Multi-Agent Team Execution Protocol

When multiple autonomous agents (e.g. Antigravity Team Preview Agents) work on this project:

1. **Sequential Progression**: Phases must be executed in order (01 ➔ 14).
2. **Context Window Optimization**:
   - When an agent is assigned to **Phase N**, it should read:
     1. [`phases/README.md`](README.md) (This file, for global rules).
     2. `phases/{N-1}_*.md` (The previous phase, to understand existing state and handoff).
     3. `phases/{N}_*.md` (The active phase to execute).
   - **Do not read all 14 files at once** — this preserves the agent's context window for high-quality code generation.
3. **Quality Gate Verification**:
   - An agent must verify all items in the phase's **Quality Gate & Verification Criteria** before marking tasks complete.
4. **Strict Architectural Constraints**:
   - **$0.00 Additional Cost**: Hostinger native features, open-source libraries, free STUN, and Metered.ca free TURN only.
   - **Identity**: `@username` and `email` only. **Never introduce phone numbers.**
   - **Calling**: High-definition WebRTC Opus **Audio Calling only**. **No video.**
   - **Deployment**: Dual-Server (Server #1 Next.js App Router standalone on `chat.yourdomain.com`, Server #2 Fastify + Native `ws` on `ws.yourdomain.com`).
   - **Performance**: Server #2 uses **Fastify + Native `ws`** (~25–35 MB RAM idle) with the `RoomManager` pattern and standard JSON envelope protocol.
   - **Mobile**: Progressive Web App (PWA) with Mobile Chrome "Install App" support.

---

## 2. Master Phase Directory

| Phase | File | Primary Responsibility | Target Server |
| :---: | :--- | :--- | :---: |
| **01** | [`01_WORKSPACE_AND_LAYOUT_SHELL.md`](01_WORKSPACE_AND_LAYOUT_SHELL.md) | Monorepo structure, Tailwind WhatsApp design tokens, responsive 2-column layout shell | Server #1 (`web/`) |
| **02** | [`02_DATABASE_AND_DUAL_SERVER_SETUP.md`](02_DATABASE_AND_DUAL_SERVER_SETUP.md) | Hostinger MySQL, Prisma migrations, Fastify + Native `ws` daemon, RoomManager | Server #1 & #2 |
| **03** | [`03_AUTHENTICATION_AND_PROFILE.md`](03_AUTHENTICATION_AND_PROFILE.md) | Username + email registration, dual login, HTTP-only JWT cookies, profile drawer | Server #1 (`web/`) |
| **04** | [`04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md`](04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md) | Fast `@username` prefix search API, contact book drawer, add/block contacts | Server #1 (`web/`) |
| **05** | [`05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md`](05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md) | Online/offline tracking, last seen timestamps, throttled typing indicator (2.5s) via `ws` | Server #2 (`socket-server/`) |
| **06** | [`06_ONE_TO_ONE_MESSAGING_ENGINE.md`](06_ONE_TO_ONE_MESSAGING_ENGINE.md) | Real-time text transmission, auto-scrolling viewport, ticks (`✓`, `✓✓`, blue `✓✓`) | Server #1 & #2 |
| **07** | [`07_MEDIA_SHARING_AND_ATTACHMENTS.md`](07_MEDIA_SHARING_AND_ATTACHMENTS.md) | Canvas WebP image compression, local Hostinger NVMe storage, lightbox viewer | Server #1 (`web/`) |
| **08** | [`08_VOICE_NOTES_AND_AUDIO_MESSAGING.md`](08_VOICE_NOTES_AND_AUDIO_MESSAGING.md) | MediaRecorder audio capture (Opus), waveform peak visualizer, variable speed player | Server #1 (`web/`) |
| **09** | [`09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md`](09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md) | Multi-user conversations, group creation modal, RoomManager group broadcasting | Server #1 & #2 |
| **10** | [`10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md`](10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md) | Quoted replies, emoji reaction hover pill, in-chat text search, message deletion | Server #1 & #2 |
| **11** | [`11_AUDIO_CALLING_WEBRTC_VOICE.md`](11_AUDIO_CALLING_WEBRTC_VOICE.md) | WebRTC 1-on-1 voice calling, STUN/TURN signaling via `ws`, call controls, call logs | Server #2 & Client |
| **12** | [`12_PWA_AND_MOBILE_CHROME_INSTALLATION.md`](12_PWA_AND_MOBILE_CHROME_INSTALLATION.md) | `manifest.json`, service worker, Mobile Chrome `beforeinstallprompt` banner, 100dvh | Server #1 (`web/`) |
| **13** | [`13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md`](13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md) | Vitest unit/integration tests, Playwright E2E chat flow, k6 100–500 user load simulator | Tooling / QA |
| **14** | [`14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md`](14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md) | GitHub Actions CI/CD to Hostinger, Fastify health check, Winston log rotation, cron backup | DevOps / Ops |

---

## 3. Global Architecture & Environmental Defaults

- **Server #1 URL**: `https://chat.yourdomain.com` (Next.js 15 App Router, Node 20 LTS standalone)
- **Server #2 URL**: `wss://ws.yourdomain.com` (Fastify 4+ & Native `ws` 24/7 daemon, ~30 MB RAM)
- **Database**: Hostinger MySQL / MariaDB via Prisma ORM (`connection_limit=10`)
- **Media Storage Path**: `web/public/uploads/` (`avatars/`, `images/`, `voice/`)
- **STUN Server**: `stun:stun.l.google.com:19302`
- **TURN Server**: `turn:relay.metered.ca:80` (Metered.ca free tier, 50 GB/mo)
- **Technical Reference**: Full npm dependencies and `.env` specifications are located in [`TECH_STACK_AND_ENV_CONFIG.md`](../TECH_STACK_AND_ENV_CONFIG.md).
