# WebChat AI Agent System Rules & Project Guardrails

> [!CAUTION]
> **CRITICAL INSTRUCTION**: **DO NOT WRITE APPLICATION CODE OR CREATE SOURCE FILES (`web/`, `socket-server/`, ETC.) UNTIL EXPLICITLY DIRECTED BY THE USER.**
> Currently, the repository is in the Specification, Architecture, and Runbook design phase.

---

## 1. Project Overview & Cost Constraint

- **Objective**: Full-featured WhatsApp Web clone deployed on **Hostinger Web Hosting**.
- **Added Monthly Cost Target**: **$0.00 / month** (strictly within existing Hostinger subscription and free-tier open source tooling).
- **Architecture**: Dual-Server Node.js setup:
  - **Server #1 (`chat.yourdomain.com`)**: Next.js 15+ App Router standalone server (UI, SSR, REST APIs, static uploads, PWA).
  - **Server #2 (`ws.yourdomain.com`)**: **Fastify 4+ & Native `ws` (WebSockets) 24/7 daemon** (ultra-lightweight ~25–35 MB RAM, presence, typing, WebRTC audio signaling).
  - **Database**: Hostinger MySQL / MariaDB via Prisma ORM with `connection_limit=10`.
- **Technical Reference**: Refer to [`TECH_STACK_AND_ENV_CONFIG.md`](TECH_STACK_AND_ENV_CONFIG.md) for full npm dependencies and `.env` specifications.

---

## 2. Key Architectural Decisions

1. **Identity System**:
   - Authentication is strictly based on `@username` and `email`.
   - **Never** add phone numbers, SMS verification, or paid telephony gateways.
2. **Audio-Only Calling (NO Video)**:
   - Voice calling only, powered by WebRTC Opus audio codec (~32 kbps).
   - Video calling is completely removed to eliminate heavy CPU load and preserve bandwidth.
   - Signaling runs over Server #2 native WebSockets; NAT traversal uses free Google STUN and free Metered.ca TURN (50 GB/mo).
3. **Mobile Chrome App Installation (PWA)**:
   - Web App Manifest (`manifest.json`), service worker (`sw.js`), and `beforeinstallprompt` banner to allow native-like installation on Android Mobile Chrome.
4. **Media Storage**:
   - User avatars, compressed images, and voice notes are stored locally on Hostinger NVMe storage (`/public/uploads/`) and served statically.
5. **Realtime Engine (Fastify + Native `ws`)**:
   - Replaced Express + Socket.io with Fastify + Native `ws`.
   - Cuts memory usage by 60%+ (~30 MB vs ~90 MB), eliminates polling overhead, and handles 3x–5x more connections within Hostinger's CloudLinux memory limits.
   - Communication follows the JSON Envelope protocol (`WsEnvelope<T>`).

---

## 3. SDLC Compliance

The development roadmap is governed by a **14-Phase Full SDLC Blueprint**:
- Master Index: [`phases/README.md`](phases/README.md)
- Blueprint: [`PROJECT_SPECIFICATION_AND_PHASES.md`](PROJECT_SPECIFICATION_AND_PHASES.md)
- Checklist: [`chk.txt`](chk.txt)
- Phased testing: Vitest unit tests, Playwright E2E chat flow, and k6 virtual user load simulation (100–500 users).
- Operations: GitHub Actions CI/CD to Hostinger, daily database backup cron, and UptimeRobot keep-alive.

---

## 4. Specialized Project Skills

Refer to the skills defined in `.agents/skills/`:
- [`webchat-requirements-architect`](.agents/skills/webchat-requirements-architect/SKILL.md): Requirements, database schema governance, and $0 cost enforcement.
- [`webchat-coding-engineer`](.agents/skills/webchat-coding-engineer/SKILL.md): Code conventions, Next.js standalone setup, Fastify + `ws` room management, and PWA install patterns.
- [`webchat-qa-devops`](.agents/skills/webchat-qa-devops/SKILL.md): Automated testing, k6 load simulator, GitHub Actions deployment, and Hostinger operations.
