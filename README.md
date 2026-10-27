# WebChat — Enterprise WhatsApp Web Platform

[![Deployment: Hostinger](https://img.shields.io/badge/Deployment-Hostinger%20Web%20Hosting-blue.svg)](https://hostinger.com)
[![Cost: $0.00/mo](https://img.shields.io/badge/Added%20Cost-%240.00%20%2F%20month-brightgreen.svg)](#zero-cost-guarantee)
[![Architecture: Dual--Server](https://img.shields.io/badge/Architecture-Dual--Server%20Node.js-purple.svg)](#dual-server-architecture)
[![Phases: 37/38 Completed](https://img.shields.io/badge/Phases-37%20%2F%2038%20Completed%20(97%25)-brightgreen.svg)](phases/README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-standard, high-concurrency WhatsApp Web clone engineered to run directly inside standard **Hostinger Web Hosting** with **$0.00 added monthly cost**.

---

## Architecture Highlights

### Dual-Server Setup
```
                     +---------------------------------------+
                     |         HOSTINGER WEB HOSTING         |
                     |       (Single Shared / Cloud)         |
                     +---------------------------------------+
                                  |             |
                 Port 3000        |             |        Port 4001
        +-------------------------+             +-------------------------+
        |                                                                 |
        v                                                                 v
+-------------------------------+                       +-------------------------------+
|     Server #1: Web Front      |                       |    Server #2: Socket Server   |
|     `chat.yourdomain.com`     |                       |      `ws.yourdomain.com`      |
+-------------------------------+                       +-------------------------------+
| - Next.js 15+ App Router      |                       | - Fastify 4+ & Native `ws`    |
| - Tailwind WhatsApp tokens    |                       | - Ultra-lean (~25-35 MB RAM)  |
| - REST API & Server Actions   |                       | - Native WebSocket daemon     |
| - Local NVMe Uploads          |                       | - Presence, Typing (2.5s)     |
| - PWA Manifest & SW           |                       | - RoomManager channel hub     |
| - Super Admin Console (/admin)|                       | - WebRTC audio signaling      |
+-------------------------------+                       +-------------------------------+
        |                                                                 |
        +-------------------------------+---------------------------------+
                                        |
                                        v
                        +-------------------------------+
                        |    Hostinger MySQL Database   |
                        |     Prisma ORM (limit=10)     |
                        +-------------------------------+
```

### Core Architectural Guarantees
1. **$0.00 Added Monthly Cost**: Runs completely within standard Hostinger hosting limits. Employs open-source tooling, free Google STUN, and free Metered.ca TURN (50 GB/mo).
2. **Zero-Friction Authentication**: Strictly `@username`, `email`, and `password`. **Zero OTP, zero SMS, zero phone numbers, and zero verification codes.**
3. **High-Definition Audio-Only Calling**: WebRTC Opus audio (~32 kbps). Video calling is omitted to preserve Hostinger CPU and bandwidth.
4. **Fastify 4+ & Native `ws` Realtime Engine**: Replaces Express + Socket.io to cut memory footprint by 60%+ (~30 MB idle) and triple connection throughput.
5. **Mobile Chrome App Installation (PWA)**: Full web app manifest, custom service worker, and automatic install prompt.
6. **Local NVMe Storage**: Media (avatars, images, voice notes, documents) stored directly in `web/public/uploads/` on fast NVMe SSD storage.

---

## 38-Phase Implementation Status

All implementation specifications and execution runbooks are organized in the [`phases/`](phases/README.md) directory.

> **Overall Progress: 37 / 38 Phases Completed (97.4%)**

### Part I: Core Production Platform (Phases 01 – 14)
| Phase | Title | Specification | Target | Status |
| :---: | :--- | :--- | :---: | :---: |
| **01** | Workspace & WhatsApp Web Layout Shell | [`phases/01_*.md`](phases/01_WORKSPACE_AND_LAYOUT_SHELL.md) | Server #1 | **COMPLETED** |
| **02** | Hostinger Database & Dual-Server Setup | [`phases/02_*.md`](phases/02_DATABASE_AND_DUAL_SERVER_SETUP.md) | Server #1 & #2 | **COMPLETED** |
| **03** | Authentication & Profile System | [`phases/03_*.md`](phases/03_AUTHENTICATION_AND_PROFILE.md) | Server #1 | **COMPLETED** |
| **04** | Contact Discovery & Address Book | [`phases/04_*.md`](phases/04_CONTACT_DISCOVERY_AND_ADDRESS_BOOK.md) | Server #1 | **COMPLETED** |
| **05** | Real-Time Presence & Status Engine | [`phases/05_*.md`](phases/05_REALTIME_PRESENCE_AND_STATUS_ENGINE.md) | Server #2 | **COMPLETED** |
| **06** | 1-on-1 Direct Messaging Engine | [`phases/06_*.md`](phases/06_ONE_TO_ONE_MESSAGING_ENGINE.md) | Server #1 & #2 | **COMPLETED** |
| **07** | Media Sharing (Images & Attachments) | [`phases/07_*.md`](phases/07_MEDIA_SHARING_AND_ATTACHMENTS.md) | Server #1 | **COMPLETED** |
| **08** | Voice Notes & Audio Messages | [`phases/08_*.md`](phases/08_VOICE_NOTES_AND_AUDIO_MESSAGING.md) | Server #1 | **COMPLETED** |
| **09** | Group Chats & Community Administration | [`phases/09_*.md`](phases/09_GROUP_CHATS_AND_COMMUNITY_ADMIN.md) | Server #1 & #2 | **COMPLETED** |
| **10** | Advanced Chat (Replies, Reactions, Search) | [`phases/10_*.md`](phases/10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md) | Server #1 & #2 | **COMPLETED** |
| **11** | Real-Time WebRTC Audio Calling | [`phases/11_*.md`](phases/11_AUDIO_CALLING_WEBRTC_VOICE.md) | Server #2 & Client | **COMPLETED** |
| **12** | PWA & Mobile Chrome Install Experience | [`phases/12_*.md`](phases/12_PWA_AND_MOBILE_CHROME_INSTALLATION.md) | Server #1 | **COMPLETED** |
| **13** | Automated Testing & Load Simulation | [`phases/13_*.md`](phases/13_AUTOMATED_TESTING_AND_LOAD_SIMULATION.md) | Tooling / QA | **COMPLETED** |
| **14** | Automated CI/CD & Zero-Cost Monitoring | [`phases/14_*.md`](phases/14_AUTOMATED_CICD_DEPLOYMENT_AND_MONITORING.md) | DevOps / Ops | **COMPLETED** |

### Part II: Enterprise Security, Data & Communications (Phases 15 – 22)
| Phase | Title | Specification | Target | Status |
| :---: | :--- | :--- | :---: | :---: |
| **15** | Multi-Device Sessions & Remote Logout | [`phases/15_*.md`](phases/15_DEVICE_SESSIONS_AND_MULTI_DEVICE_SECURITY.md) | Server #1 & #2 | **COMPLETED** |
| **16** | Client-Side End-to-End Encryption (E2EE) | [`phases/16_*.md`](phases/16_CLIENT_SIDE_END_TO_END_ENCRYPTION_E2EE.md) | Server #1 & Client | **COMPLETED** |
| **17** | Broadcast Announcement Channels | [`phases/17_*.md`](phases/17_BROADCAST_ANNOUNCEMENT_CHANNELS.md) | Server #1 & #2 | **COMPLETED** |
| **18** | Interactive Real-Time Polls & Live Voting | [`phases/18_*.md`](phases/18_INTERACTIVE_REALTIME_POLLS.md) | Server #1 & #2 | **COMPLETED** |
| **19** | Pinned Messages Strip & Starred Bookmarks | [`phases/19_*.md`](phases/19_PINNED_AND_STARRED_MESSAGES.md) | Server #1 & #2 | **COMPLETED** |
| **20** | Enterprise Document Sharing (PDF, Docs) | [`phases/20_*.md`](phases/20_ENTERPRISE_DOCUMENT_SHARING.md) | Server #1 & #2 | **COMPLETED** |
| **21** | Markdown Code Blocks & Syntax Highlighting | [`phases/21_*.md`](phases/21_MARKDOWN_CODE_BLOCKS_AND_SYNTAX_HIGHLIGHTING.md) | Server #1 | **COMPLETED** |
| **22** | Ephemeral & Disappearing Messages | [`phases/22_*.md`](phases/22_EPHEMERAL_AND_DISAPPEARING_MESSAGES.md) | Server #1 & #2 | **COMPLETED** |

### Part III: Offline Resilience & Developer Integrations (Phases 23 – 26)
| Phase | Title | Specification | Target | Status |
| :---: | :--- | :--- | :---: | :---: |
| **23** | Background Web Push (VAPID) | [`phases/23_*.md`](phases/23_BACKGROUND_WEB_PUSH_NOTIFICATIONS.md) | Server #1 & SW | **COMPLETED** |
| **24** | Local-First Offline Sync & IndexedDB | [`phases/24_*.md`](phases/24_LOCAL_FIRST_OFFLINE_SYNC_AND_INDEXEDDB.md) | Server #1 & Client | **COMPLETED** |
| **25** | Inbound & Outbound Webhooks Engine | [`phases/25_*.md`](phases/25_INBOUND_AND_OUTBOUND_WEBHOOKS.md) | Server #1 & #2 | **COMPLETED** |
| **26** | Chatbots & Slash Commands Engine | [`phases/26_*.md`](phases/26_CHATBOTS_AND_SLASH_COMMANDS.md) | Server #1 & #2 | **COMPLETED** |

### Part IV: Enterprise Compliance & Governance (Phases 27 – 28)
| Phase | Title | Specification | Target | Status |
| :---: | :--- | :--- | :---: | :---: |
| **27** | Immutable Security Audit Logging | [`phases/27_*.md`](phases/27_IMMUTABLE_SECURITY_AUDIT_LOGGING.md) | Server #1 & Admin | **COMPLETED** |
| **28** | Compliance Data Export & Legal Hold | [`phases/28_*.md`](phases/28_COMPLIANCE_DATA_EXPORT_AND_LEGAL_HOLD.md) | Server #1 & Admin | **COMPLETED** |

### Part V: Enterprise Administration & Operations (Phases 29 – 34)
| Phase | Title | Specification | Target | Status |
| :---: | :--- | :--- | :---: | :---: |
| **29** | Super Admin Console & RAM Telemetry | [`phases/29_*.md`](phases/29_ADMIN_CONSOLE_AND_SYSTEM_METRICS.md) | Server #1 & #2 | **COMPLETED** |
| **30** | NVMe Storage Governance & Orphan Cleaner | [`phases/30_*.md`](phases/30_STORAGE_GOVERNANCE_AND_ORPHAN_CLEANER.md) | Server #1 | **COMPLETED** |
| **31** | User Administration & Role Delegation | [`phases/31_*.md`](phases/31_USER_ADMINISTRATION_AND_ROLE_DELEGATION.md) | Server #1 & Admin | **COMPLETED** |
| **32** | Account Moderation, Bans & Socket Kicks | [`phases/32_*.md`](phases/32_ACCOUNT_MODERATION_BANS_AND_SOCKET_KICKS.md) | Server #1 & #2 | **COMPLETED** |
| **33** | Abuse Reporting & Moderation Queue | [`phases/33_*.md`](phases/33_ABUSE_REPORTING_AND_MODERATION_QUEUE.md) | Server #1 & #2 | Pending |
| **34** | Real-Time Data Loss Prevention (DLP) | [`phases/34_*.md`](phases/34_REALTIME_DLP_REGEX_SCANNER.md) | Server #1 & #2 | **COMPLETED** |

### Part VI: Platform Reliability & Emergency Operations (Phases 35 – 36)
| Phase | Title | Specification | Target | Status |
| :---: | :--- | :--- | :---: | :---: |
| **35** | Real-Time Global Broadcast Alerts | [`phases/35_*.md`](phases/35_REALTIME_GLOBAL_BROADCASTS.md) | Server #1 & #2 | **COMPLETED** |
| **36** | Maintenance Mode & Emergency Backups | [`phases/36_*.md`](phases/36_MAINTENANCE_MODE_AND_EMERGENCY_BACKUPS.md) | Server #1 & #2 | **COMPLETED** |

### Part VII: Advanced Geolocation & Mobility (Phases 37 – 38)
| Phase | Title | Specification | Target | Status |
| :---: | :--- | :--- | :---: | :---: |
| **37** | Current Static GPS Location Sharing | [`phases/37_*.md`](phases/37_CURRENT_STATIC_LOCATION_SHARING.md) | Server #1 | **COMPLETED** |
| **38** | Real-Time Live Location Tracking | [`phases/38_*.md`](phases/38_REALTIME_LIVE_LOCATION_TRACKING.md) | Server #1 & #2 | **COMPLETED** |

---

## Technical Documentation & References

- **Package & Environment Configuration**: [`TECH_STACK_AND_ENV_CONFIG.md`](TECH_STACK_AND_ENV_CONFIG.md)
- **Master Project Specification**: [`PROJECT_SPECIFICATION_AND_PHASES.md`](PROJECT_SPECIFICATION_AND_PHASES.md)
- **Phase Index & Agent Guidelines**: [`phases/README.md`](phases/README.md)
- **Detailed Checklist & Task Verification**: [`chk.txt`](chk.txt)
- **AI Agent System Guardrails**: [`AGENTS.md`](AGENTS.md)
