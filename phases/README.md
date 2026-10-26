# WebChat Implementation Phases Master Index
## Autonomous Multi-Agent Vibe Coding Guide (25-Phase Master Enterprise Blueprint)

This directory contains the self-contained phase specifications for developing the WhatsApp Web clone on Hostinger ($0 / month added cost) using **Next.js 15 Standalone** and **Fastify 4+ & Native `ws`**, scaled up to full **Enterprise Standards**.

Each phase file is authored so an autonomous agent needs **only the current phase file and the immediately preceding phase file** to execute its task with full context.

---

## 1. Multi-Agent Team Execution Protocol

When multiple autonomous agents (e.g. Antigravity Team Preview Agents) work on this project:

1. **Sequential Progression**: Phases must be executed in order (01 ➔ 25).
2. **Context Window Optimization**:
   - When an agent is assigned to **Phase N**, it should read:
     1. [`phases/README.md`](README.md) (This file, for global rules).
     2. `phases/{N-1}_*.md` (The previous phase, to understand existing state and handoff).
     3. `phases/{N}_*.md` (The active phase to execute).
   - **Do not read all 25 files at once** — this preserves the agent's context window for high-quality code generation.
3. **Quality Gate Verification**:
   - An agent must verify all items in the phase's **Quality Gate & Verification Criteria** before marking tasks complete.
4. **Strict Architectural Constraints**:
   - **$0.00 Additional Cost**: Hostinger native features, open-source libraries, free STUN, and Metered.ca free TURN only.
   - **Identity**: `@username` and `email` only. **Never introduce phone numbers.**
   - **Calling**: High-definition WebRTC Opus **Audio Calling only**. **No video.**
   - **Deployment**: Dual-Server (Server #1 Next.js App Router standalone on `chat.yourdomain.com`, Server #2 Fastify + Native `ws` on `ws.yourdomain.com`).
   - **Performance**: Server #2 uses **Fastify + Native `ws`** (~25–35 MB RAM idle) with the `RoomManager` pattern and standard JSON envelope protocol (`WsEnvelope<T>`).
   - **Mobile**: Progressive Web App (PWA) with Mobile Chrome "Install App" support.

---

## 2. Master Phase Directory (25 Phases)

### Part I: Core Production Platform (Phases 01 – 14)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **01** | [`01_WORKSPACE_AND_LAYOUT_SHELL.md`](01_WORKSPACE_AND_LAYOUT_SHELL.md) | Monorepo structure, Tailwind WhatsApp design tokens, responsive 2-column layout shell | Server #1 (`web/`) | **COMPLETED** |
| **02** | [`02_DATABASE_AND_DUAL_SERVER_SETUP.md`](02_DATABASE_AND_DUAL_SERVER_SETUP.md) | Hostinger MySQL, Prisma migrations, Fastify + Native `ws` daemon, RoomManager | Server #1 & #2 | Pending |
| **03** | [`03_AUTHENTICATION_AND_PROFILE.md`](03_AUTHENTICATION_AND_PROFILE.md) | Username + email registration, dual login, HTTP-only JWT cookies, profile drawer | Server #1 (`web/`) | Pending |
| **04** | [`04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md`](04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md) | Fast `@username` prefix search API, contact book drawer, add/block contacts | Server #1 (`web/`) | Pending |
| **05** | [`05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md`](05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md) | Online/offline tracking, last seen timestamps, throttled typing indicator (2.5s) via `ws` | Server #2 (`socket-server/`) | Pending |
| **06** | [`06_ONE_TO_ONE_MESSAGING_ENGINE.md`](06_ONE_TO_ONE_MESSAGING_ENGINE.md) | Real-time text transmission, auto-scrolling viewport, ticks (`✓`, `✓✓`, blue `✓✓`) | Server #1 & #2 | Pending |
| **07** | [`07_MEDIA_SHARING_AND_ATTACHMENTS.md`](07_MEDIA_SHARING_AND_ATTACHMENTS.md) | Canvas WebP image compression, local Hostinger NVMe storage, lightbox viewer | Server #1 (`web/`) | Pending |
| **08** | [`08_VOICE_NOTES_AND_AUDIO_MESSAGING.md`](08_VOICE_NOTES_AND_AUDIO_MESSAGING.md) | MediaRecorder audio capture (Opus), waveform peak visualizer, variable speed player | Server #1 (`web/`) | Pending |
| **09** | [`09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md`](09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md) | Multi-user groups, RoomManager group broadcasting, admin privileges, system events | Server #1 & #2 | Pending |
| **10** | [`10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md`](10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md) | Quoted replies, emoji reaction hover pill, in-chat text search, message deletion | Server #1 & #2 | Pending |
| **11** | [`11_AUDIO_CALLING_WEBRTC_VOICE.md`](11_AUDIO_CALLING_WEBRTC_VOICE.md) | WebRTC 1-on-1 voice calling, STUN/TURN signaling via `ws`, call controls, call logs | Server #2 & Client | Pending |
| **12** | [`12_PWA_AND_MOBILE_CHROME_INSTALLATION.md`](12_PWA_AND_MOBILE_CHROME_INSTALLATION.md) | `manifest.json`, service worker, Mobile Chrome `beforeinstallprompt` banner, 100dvh | Server #1 (`web/`) | Pending |
| **13** | [`13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md`](13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md) | Vitest unit/integration tests, Playwright E2E chat flow, k6 100–500 user load simulator | Tooling / QA | Pending |
| **14** | [`14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md`](14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md) | GitHub Actions CI/CD to Hostinger, Fastify health check, Winston log rotation, cron backup | DevOps / Ops | **COMPLETED** |

---

### Part II: Enterprise Suite & Compliance (Phases 15 – 20)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **15** | [`15_ENTERPRISE_SECURITY_2FA_AND_E2EE.md`](15_ENTERPRISE_SECURITY_2FA_AND_E2EE.md) | 2FA (RFC 6238 TOTP), device session revocation, client-side E2EE (SubtleCrypto ECDH + AES-GCM) | Server #1 & Client | Pending |
| **16** | [`16_ENTERPRISE_CHANNELS_POLLS_AND_GOVERNANCE.md`](16_ENTERPRISE_CHANNELS_POLLS_AND_GOVERNANCE.md) | Broadcast announcement channels, live WebSocket polls, pinned messages strip, starred bookmarks | Server #1 & #2 | Pending |
| **17** | [`17_DOCUMENT_SHARING_CODE_BLOCKS_AND_EPHEMERAL.md`](17_DOCUMENT_SHARING_CODE_BLOCKS_AND_EPHEMERAL.md) | Enterprise document sharing (PDF, Excel, Word), syntax-highlighted code blocks, disappearing messages | Server #1 & #2 | Pending |
| **18** | [`18_BACKGROUND_WEB_PUSH_AND_OFFLINE_SYNC.md`](18_BACKGROUND_WEB_PUSH_AND_OFFLINE_SYNC.md) | Background Web Push (VAPID protocol), local-first offline message queue (IndexedDB idb) | Server #1 & Service Worker | Pending |
| **19** | [`19_WEBHOOKS_BOTS_AND_EXTERNAL_INTEGRATIONS.md`](19_WEBHOOKS_BOTS_AND_EXTERNAL_INTEGRATIONS.md) | Inbound/Outbound webhooks (CI/CD alerts), bot message badges, slash commands (`/poll`, `/remind`, `/announce`) | Server #1 & #2 | Pending |
| **20** | [`20_AUDIT_LOGGING_COMPLIANCE_AND_DATA_EXPORT.md`](20_AUDIT_LOGGING_COMPLIANCE_AND_DATA_EXPORT.md) | Immutable security audit logs, compliance chat export (.zip with HTML transcripts), legal hold lock | Server #1 & Admin Console | Pending |

---

### Part III: Enterprise Administration & Operations (Phases 21 – 24)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **21** | [`21_ADMIN_CONSOLE_AND_SYSTEM_METRICS.md`](21_ADMIN_CONSOLE_AND_SYSTEM_METRICS.md) | Super Admin Console (`/admin`), Fastify RAM telemetry, MySQL row counts, NVMe storage analytics, orphan file cleaner | Server #1 & #2 | Pending |
| **22** | [`22_USER_MANAGEMENT_AND_ACCOUNT_MODERATION.md`](22_USER_MANAGEMENT_AND_ACCOUNT_MODERATION.md) | User administration data grid, account suspension/ban, real-time WebSocket kicks, role elevation, invite codes | Server #1 & #2 | Pending |
| **23** | [`23_CONTENT_MODERATION_AND_ABUSE_REPORTING.md`](23_CONTENT_MODERATION_AND_ABUSE_REPORTING.md) | Abuse reporting workflow, admin moderation review queue, in-memory regex Data Loss Prevention (DLP) scanner | Server #1 & #2 | Pending |
| **24** | [`24_GLOBAL_BROADCASTS_AND_MAINTENANCE_MODE.md`](24_GLOBAL_BROADCASTS_AND_MAINTENANCE_MODE.md) | Real-time global broadcast alert banners (`system:broadcast`), Maintenance Mode switch, emergency DB backup trigger | Server #1 & #2 | Pending |

---

### Part IV: Advanced Geolocation & Mobility (Phase 25)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **25** | [`25_LIVE_AND_CURRENT_LOCATION_SHARING.md`](25_LIVE_AND_CURRENT_LOCATION_SHARING.md) | Current location sharing (OSM geocoded), real-time live location tracking (Leaflet, WebSockets, countdown), collaborative group maps | Server #1 & #2 | Pending |

---

## 3. Global Architecture & Environmental Defaults

- **Server #1 URL**: `https://chat.yourdomain.com` (Next.js 15 App Router, Node 20 LTS standalone)
- **Server #2 URL**: `wss://ws.yourdomain.com` (Fastify 4+ & Native `ws` 24/7 daemon, ~30 MB RAM)
- **Database**: Hostinger MySQL / MariaDB via Prisma ORM (`connection_limit=10`)
- **Media Storage Path**: `web/public/uploads/` (`avatars/`, `images/`, `voice/`, `docs/`)
- **STUN Server**: `stun:stun.l.google.com:19302`
- **TURN Server**: `turn:relay.metered.ca:80` (Metered.ca free tier, 50 GB/mo)
- **Technical Reference**: Full npm dependencies and `.env` specifications are located in [`TECH_STACK_AND_ENV_CONFIG.md`](../TECH_STACK_AND_ENV_CONFIG.md).
