# WebChat Implementation Phases Master Index
## Autonomous Multi-Agent Vibe Coding Guide (38-Phase Master Enterprise Blueprint)

This directory contains the self-contained phase specifications for developing the WhatsApp Web clone on Hostinger ($0 / month added cost) using **Next.js 15 Standalone** and **Fastify 4+ & Native `ws`**, scaled up to full **Enterprise Standards**.

Each phase file is authored so an autonomous agent needs **only the current phase file and the immediately preceding phase file** to execute its task with full context.

---

## 1. Multi-Agent Team Execution Protocol

When multiple autonomous agents (e.g. Antigravity Team Preview Agents) work on this project:

1. **Sequential Progression**: Phases must be executed in order (01 ➔ 38).
2. **Context Window Optimization**:
   - When an agent is assigned to **Phase N**, it should read:
     1. [`phases/README.md`](README.md) (This file, for global rules).
     2. `phases/{N-1}_*.md` (The previous phase, to understand existing state and handoff).
     3. `phases/{N}_*.md` (The active phase to execute).
   - **Do not read all 38 files at once** — this preserves the agent's context window for high-quality code generation.
3. **Quality Gate Verification**:
   - An agent must verify all items in the phase's **Quality Gate & Verification Criteria** before marking tasks complete.
4. **Strict Architectural Constraints**:
   - **$0.00 Additional Cost**: Hostinger native features, open-source libraries, free STUN, and Metered.ca free TURN only.
   - **Identity (Zero Friction)**: `@username`, `email`, and `password` only. **Strictly NO OTP, NO SMS, NO phone verification, and NO email verification codes.**
   - **Calling**: High-definition WebRTC Opus **Audio Calling only**. **No video.**
   - **Deployment**: Dual-Server (Server #1 Next.js App Router standalone on `chat.yourdomain.com`, Server #2 Fastify + Native `ws` on `ws.yourdomain.com`).
   - **Performance**: Server #2 uses **Fastify + Native `ws`** (~25–35 MB RAM idle) with the `RoomManager` pattern and standard JSON envelope protocol (`WsEnvelope<T>`).
   - **Mobile**: Progressive Web App (PWA) with Mobile Chrome "Install App" support.

---

## 2. Master Phase Directory (38 Phases)

> **Overall Progress: 37 / 38 Phases Completed (97.4%)**
> - **Completed**: Phases 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38
> - **Pending**: Phase 33

### Part I: Core Production Platform (Phases 01 – 14)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **01** | [`01_WORKSPACE_AND_LAYOUT_SHELL.md`](01_WORKSPACE_AND_LAYOUT_SHELL.md) | Monorepo structure, Tailwind WhatsApp design tokens, responsive 2-column layout shell | Server #1 (`web/`) | **COMPLETED** |
| **02** | [`02_DATABASE_AND_DUAL_SERVER_SETUP.md`](02_DATABASE_AND_DUAL_SERVER_SETUP.md) | Hostinger MySQL, Prisma migrations, Fastify + Native `ws` daemon, RoomManager | Server #1 & #2 | **COMPLETED** |
| **03** | [`03_AUTHENTICATION_AND_PROFILE.md`](03_AUTHENTICATION_AND_PROFILE.md) | Username + email registration, dual login, HTTP-only JWT cookies, profile drawer | Server #1 (`web/`) | **COMPLETED** |
| **04** | [`04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md`](04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md) | Fast `@username` prefix search API, contact book drawer, add/block contacts | Server #1 (`web/`) | **COMPLETED** |
| **05** | [`05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md`](05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md) | Online/offline tracking, last seen timestamps, throttled typing indicator (2.5s) via `ws` | Server #2 (`socket-server/`) | **COMPLETED** |
| **06** | [`06_ONE_TO_ONE_MESSAGING_ENGINE.md`](06_ONE_TO_ONE_MESSAGING_ENGINE.md) | Real-time text transmission, auto-scrolling viewport, ticks (`✓`, `✓✓`, blue `✓✓`) | Server #1 & #2 | **COMPLETED** |
| **07** | [`07_MEDIA_SHARING_AND_ATTACHMENTS.md`](07_MEDIA_SHARING_AND_ATTACHMENTS.md) | Canvas WebP image compression, local Hostinger NVMe storage, lightbox viewer | Server #1 (`web/`) | **COMPLETED** |
| **08** | [`08_VOICE_NOTES_AND_AUDIO_MESSAGING.md`](08_VOICE_NOTES_AND_AUDIO_MESSAGING.md) | MediaRecorder audio capture (Opus), waveform peak visualizer, variable speed player | Server #1 (`web/`) | **COMPLETED** |
| **09** | [`09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md`](09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md) | Multi-user groups, RoomManager group broadcasting, admin privileges, system events | Server #1 & #2 | **COMPLETED** |
| **10** | [`10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md`](10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md) | Quoted replies, emoji reaction hover pill, in-chat text search, message deletion | Server #1 & #2 | **COMPLETED** |
| **11** | [`11_AUDIO_CALLING_WEBRTC_VOICE.md`](11_AUDIO_CALLING_WEBRTC_VOICE.md) | WebRTC 1-on-1 voice calling, STUN/TURN signaling via `ws`, call controls, call logs | Server #2 & Client | **COMPLETED** |
| **12** | [`12_PWA_AND_MOBILE_CHROME_INSTALLATION.md`](12_PWA_AND_MOBILE_CHROME_INSTALLATION.md) | `manifest.json`, service worker, Mobile Chrome `beforeinstallprompt` banner, 100dvh | Server #1 (`web/`) | **COMPLETED** |
| **13** | [`13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md`](13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md) | Vitest unit/integration tests, Playwright E2E chat flow, k6 100–500 user load simulator | Tooling / QA | **COMPLETED** |
| **14** | [`14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md`](14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md) | GitHub Actions CI/CD to Hostinger, Fastify health check, Winston log rotation, cron backup | DevOps / Ops | **COMPLETED** |

---

### Part II: Enterprise Security, Data & Communications (Phases 15 – 22)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **15** | [`15_DEVICE_SESSIONS_AND_MULTI_DEVICE_SECURITY.md`](15_DEVICE_SESSIONS_AND_MULTI_DEVICE_SECURITY.md) | Active session tracking, User-Agent & IP detection, remote session logout, password change invalidation | Server #1 & #2 | **COMPLETED** |
| **16** | [`16_CLIENT_SIDE_END_TO_END_ENCRYPTION_E2EE.md`](16_CLIENT_SIDE_END_TO_END_ENCRYPTION_E2EE.md) | Client-side E2EE (SubtleCrypto ECDH P-256 + AES-GCM-256), IndexedDB private key store, Safety Numbers | Server #1 & Client | **COMPLETED** |
| **17** | [`17_BROADCAST_ANNOUNCEMENT_CHANNELS.md`](17_BROADCAST_ANNOUNCEMENT_CHANNELS.md) | Broadcast announcement channels, public slugs, subscriber management, read-only subscriber guard | Server #1 & #2 | **COMPLETED** |
| **18** | [`18_INTERACTIVE_REALTIME_POLLS.md`](18_INTERACTIVE_REALTIME_POLLS.md) | Multi-choice interactive polls, live WebSocket voting tallies, animated percentage bars, voter roster | Server #1 & #2 | **COMPLETED** |
| **19** | [`19_PINNED_AND_STARRED_MESSAGES.md`](19_PINNED_AND_STARRED_MESSAGES.md) | Pinned message header banner carousel with click-to-jump, global starred message bookmarks drawer | Server #1 & #2 | **COMPLETED** |
| **20** | [`20_ENTERPRISE_DOCUMENT_SHARING.md`](20_ENTERPRISE_DOCUMENT_SHARING.md) | Enterprise document sharing (PDF, Excel, Word, Zip up to 25MB), local NVMe storage, in-app PDF preview | Server #1 & #2 | **COMPLETED** |
| **21** | [`21_MARKDOWN_CODE_BLOCKS_AND_SYNTAX_HIGHLIGHTING.md`](21_MARKDOWN_CODE_BLOCKS_AND_SYNTAX_HIGHLIGHTING.md) | Syntax-highlighted code blocks with Prism.js dark tokens, language badges, one-click copy button | Server #1 (`web/`) | **COMPLETED** |
| **22** | [`22_EPHEMERAL_AND_DISAPPEARING_MESSAGES.md`](22_EPHEMERAL_AND_DISAPPEARING_MESSAGES.md) | Chat auto-deletion timers (24h, 7d, 90d), clock badges, Fastify 24/7 background media & row purge | Server #1 & #2 | **COMPLETED** |

---

### Part III: Offline Resilience & Developer Integrations (Phases 23 – 26)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **23** | [`23_BACKGROUND_WEB_PUSH_NOTIFICATIONS.md`](23_BACKGROUND_WEB_PUSH_NOTIFICATIONS.md) | Background Web Push (W3C VAPID protocol, `web-push`), Service Worker background listener, notification settings | Server #1 & Service Worker | **COMPLETED** |
| **24** | [`24_LOCAL_FIRST_OFFLINE_SYNC_AND_INDEXEDDB.md`](24_LOCAL_FIRST_OFFLINE_SYNC_AND_INDEXEDDB.md) | Local-first message caching via `idb`, offline outbox queue (clock icon), automatic FIFO reconnect sync | Server #1 & Client | **COMPLETED** |
| **25** | [`25_INBOUND_AND_OUTBOUND_WEBHOOKS.md`](25_INBOUND_AND_OUTBOUND_WEBHOOKS.md) | Inbound/Outbound webhooks (CI/CD alerts), HMAC SHA-256 signature verification, `BOT` badges, webhook drawer | Server #1 & #2 | **COMPLETED** |
| **26** | [`26_CHATBOTS_AND_SLASH_COMMANDS.md`](26_CHATBOTS_AND_SLASH_COMMANDS.md) | In-chat slash commands (`/poll`, `/remind`, `/announce`, `/help`), popover autocomplete, scheduled reminder daemon | Server #1 & #2 | **COMPLETED** |

---

### Part IV: Enterprise Compliance & Governance (Phases 27 – 28)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **27** | [`27_IMMUTABLE_SECURITY_AUDIT_LOGGING.md`](27_IMMUTABLE_SECURITY_AUDIT_LOGGING.md) | Immutable security audit logs, event interceptors, searchable compliance console (`/admin/audit`), CSV export | Server #1 & Admin Console | **COMPLETED** |
| **28** | [`28_COMPLIANCE_DATA_EXPORT_AND_LEGAL_HOLD.md`](28_COMPLIANCE_DATA_EXPORT_AND_LEGAL_HOLD.md) | Legal Hold governance lock, compliance `.zip` export with styled offline HTML and JSON transcripts via `archiver` | Server #1 & Admin Console | **COMPLETED** |

---

### Part V: Enterprise Administration & Operations (Phases 29 – 34)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **29** | [`29_ADMIN_CONSOLE_AND_SYSTEM_METRICS.md`](29_ADMIN_CONSOLE_AND_SYSTEM_METRICS.md) | Super Admin portal layout (`/admin`), Fastify RAM telemetry (MB), active socket count, MySQL row counts | Server #1 & #2 | **COMPLETED** |
| **30** | [`30_STORAGE_GOVERNANCE_AND_ORPHAN_CLEANER.md`](30_STORAGE_GOVERNANCE_AND_ORPHAN_CLEANER.md) | Hostinger NVMe storage analytics (Avatars, Images, Voice, Docs), orphan file scanner, safe disk purger | Server #1 (`web/`) | **COMPLETED** |
| **31** | [`31_USER_ADMINISTRATION_AND_ROLE_DELEGATION.md`](31_USER_ADMINISTRATION_AND_ROLE_DELEGATION.md) | User administration data grid with multi-column filters, RBAC hierarchy (`USER` to `SUPER_ADMIN`), user details | Server #1 & Admin Console | **COMPLETED** |
| **32** | [`32_ACCOUNT_MODERATION_BANS_AND_SOCKET_KICKS.md`](32_ACCOUNT_MODERATION_BANS_AND_SOCKET_KICKS.md) | Account suspension and ban workflows, mandatory reason audit, real-time WebSocket kicks (`user:kick`) | Server #1 & #2 | **COMPLETED** |
| **33** | [`33_ABUSE_REPORTING_AND_MODERATION_QUEUE.md`](33_ABUSE_REPORTING_AND_MODERATION_QUEUE.md) | User abuse reporting workflow, admin review queue (`/admin/moderation`), context view, message deletion | Server #1 & #2 | Pending |
| **34** | [`34_REALTIME_DLP_REGEX_SCANNER.md`](34_REALTIME_DLP_REGEX_SCANNER.md) | In-memory regex Data Loss Prevention scanner, preflight blocking of credit cards & API keys, admin rule manager | Server #1 & #2 | **COMPLETED** |

---

### Part VI: Platform Reliability & Emergency Operations (Phases 35 – 36)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **35** | [`35_REALTIME_GLOBAL_BROADCASTS.md`](35_REALTIME_GLOBAL_BROADCASTS.md) | Real-time global broadcast alert banners (`system:broadcast`), severity levels (INFO/WARNING/CRITICAL), audio chime | Server #1 & #2 | **COMPLETED** |
| **36** | [`36_MAINTENANCE_MODE_AND_EMERGENCY_BACKUPS.md`](36_MAINTENANCE_MODE_AND_EMERGENCY_BACKUPS.md) | Enterprise Maintenance Mode switch with admin bypass, public countdown splash, on-demand `mysqldump` backup trigger | Server #1 & #2 | **COMPLETED** |

---

### Part VII: Advanced Geolocation & Mobility (Phases 37 – 38)

| Phase | File | Primary Responsibility | Target Server | Status |
| :---: | :--- | :--- | :---: | :---: |
| **37** | [`37_CURRENT_STATIC_LOCATION_SHARING.md`](37_CURRENT_STATIC_LOCATION_SHARING.md) | Static GPS location sharing, Leaflet map card, OpenStreetMap Nominatim reverse geocoding with server LRU cache | Server #1 (`web/`) | **COMPLETED** |
| **38** | [`38_REALTIME_LIVE_LOCATION_TRACKING.md`](38_REALTIME_LIVE_LOCATION_TRACKING.md) | Real-time live GPS streaming (15m, 1h, 8h), battery throttling (8s / 10m displacement), collaborative group maps | Server #1 & #2 | **COMPLETED** |

---

## 3. Global Architecture & Environmental Defaults

- **Server #1 URL**: `https://chat.yourdomain.com` (Next.js 15 App Router, Node 20 LTS standalone)
- **Server #2 URL**: `wss://ws.yourdomain.com` (Fastify 4+ & Native `ws` 24/7 daemon, ~30 MB RAM)
- **Database**: Hostinger MySQL / MariaDB via Prisma ORM (`connection_limit=10`)
- **Media Storage Path**: `web/public/uploads/` (`avatars/`, `images/`, `voice/`, `docs/`)
- **STUN Server**: `stun:stun.l.google.com:19302`
- **TURN Server**: `turn:relay.metered.ca:80` (Metered.ca free tier, 50 GB/mo)
- **Technical Reference**: Full npm dependencies and `.env` specifications are located in [`TECH_STACK_AND_ENV_CONFIG.md`](../TECH_STACK_AND_ENV_CONFIG.md).
