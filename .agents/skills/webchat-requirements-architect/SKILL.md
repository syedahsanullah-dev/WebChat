---
name: webchat-requirements-architect
description: >-
  Use this skill when reviewing, planning, designing, or validating requirements, architecture,
  database schemas, enterprise compliance, and SDLC phases for the WhatsApp Web clone on Hostinger.
  Enforces zero extra monthly cost, dual-server structure, Fastify + native ws efficiency,
  and phone-less (@username/email) identity rules.
---

# WebChat Requirements & Architecture Skill

This skill acts as the system architect and technical authority for the WebChat project. It ensures that every requirement, database modification, and architectural decision strictly respects the Hostinger dual-server constraints and maintains an additional monthly cost of **$0.00** across all 38 phases.

## Core Non-Negotiable Rules

1. **Hostinger Zero Additional Cost Policy**:
   - Every service, database, or media asset must reside within the client's existing Hostinger subscription or verified free-tier services.
   - **No paid external storage** (No AWS S3, No Cloudinary) — use Hostinger NVMe `/public/uploads/` (`avatars/`, `images/`, `voice/`, `docs/`).
   - **No paid WebRTC media servers** (No Twilio, Agora, or paid LiveKit) — use free Google STUN and free Metered.ca TURN (50 GB/mo).
   - **Audio-Only Calling**: Video calling is strictly disabled. Only audio calling via WebRTC Opus codec is allowed.
   - **Enterprise & Admin Tools at $0 Cost**: Multi-device session security (`user_sessions`), E2EE via native browser `window.crypto.subtle`, push notifications via W3C VAPID protocol (`web-push`), Admin metrics and DLP via in-memory regex.
   - **Geolocation & Mapping at $0 Cost**: Leaflet.js with free OpenStreetMap tiles and cached Nominatim reverse geocoding. Strictly no Google Maps or Mapbox API keys.

2. **Dual-Server Subdomain Isolation & High-Performance Daemon**:
   - **Server #1 (`chat.yourdomain.com`)**: Standalone Next.js 15+ App Router application handling UI, static media serving, REST endpoints, PWA assets, admin console, webhooks, push notifications, and compliance exports.
   - **Server #2 (`ws.yourdomain.com`)**: Dedicated **Fastify 4+ & Native `ws`** 24/7 daemon handling persistent WebSockets, live presence, typing states, poll voting, real-time socket kicks, global broadcast alerts, and WebRTC audio call signaling.
   - **Memory Target**: Fastify + `ws` must maintain an idle memory footprint of **~25–35 MB RAM** (60%+ lower than Express + Socket.io), preventing out-of-memory restarts within Hostinger CloudLinux container limits.
   - **Cross-Origin Security**: Server #2 must allow CORS strictly from Server #1.

3. **Identity System Guardrail (Zero Verification Friction)**:
   - **No phone numbers, No SMS gateways, No OTP codes, and No email verification codes**: Registration and login only use `@username`, `email`, and `password`.
   - Never introduce phone number fields, SMS gateways, or OTP verification services requiring paid telephony or verification friction.

4. **Database Connection Safety**:
   - Hostinger MySQL databases impose connection limits (typically 50–100 max user connections).
   - Prisma connection pooling must strictly specify `connection_limit=10` per server in `DATABASE_URL` to guarantee that total pool connections never exhaust Hostinger database limits.

## Technical Reference & Schema Governance

- Consult [`TECH_STACK_AND_ENV_CONFIG.md`](../../TECH_STACK_AND_ENV_CONFIG.md) for full npm packages and `.env` specifications.
- When extending or inspecting the Prisma schema in `PROJECT_SPECIFICATION_AND_PHASES.md`:
  - All foreign keys must have explicit indexes (`map: "idx_..."`) to prevent slow table scans on Hostinger shared MySQL.
  - Text content must use appropriate column types (`@db.VarChar(255)`, `@db.Text` for long messages).
  - The 24 Prisma models across the 38-phase blueprint are: `User`, `UserPublicKey`, `UserSession`, `Contact`, `Chat`, `ChannelMetadata`, `ChatParticipant`, `Message`, `MessageStatus`, `PinnedMessage`, `StarredMessage`, `Poll`, `PollOption`, `PollVote`, `CallLog`, `UserPushSubscription`, `Webhook`, `ScheduledReminder`, `AuditLog`, `SystemSetting`, `AbuseReport`, `DlpRule`, `SystemBroadcast`, and `LiveLocation`.

## SDLC Phase Tracking

Always cross-reference user requests against the 38-phase roadmap in `phases/` and `chk.txt`:
- **Part I: Core Production Platform (Phases 01 – 14)**
- **Part II: Enterprise Security, Data & Communications (Phases 15 – 22)**
- **Part III: Offline Resilience & Developer Integrations (Phases 23 – 26)**
- **Part IV: Enterprise Compliance & Governance (Phases 27 – 28)**
- **Part V: Enterprise Administration & Operations (Phases 29 – 34)**
- **Part VI: Platform Reliability & Emergency Operations (Phases 35 – 36)**
- **Part VII: Advanced Geolocation & Mobility (Phases 37 – 38)**
