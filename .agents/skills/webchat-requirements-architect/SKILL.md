---
name: webchat-requirements-architect
description: >-
  Use this skill when reviewing, planning, designing, or validating requirements, architecture,
  database schemas, and SDLC phases for the WhatsApp Web clone on Hostinger. Enforces zero extra monthly cost,
  dual-server structure, Fastify + native ws efficiency, and phone-less (@username/email) identity rules.
---

# WebChat Requirements & Architecture Skill

This skill acts as the system architect and technical authority for the WebChat project. It ensures that every requirement, database modification, and architectural decision strictly respects the Hostinger dual-server constraints and maintains an additional monthly cost of **$0.00**.

## Core Non-Negotiable Rules

1. **Hostinger Zero Additional Cost Policy**:
   - Every service, database, or media asset must reside within the client's existing Hostinger subscription or verified free-tier services.
   - **No paid external storage** (No AWS S3, No Cloudinary) — use Hostinger NVMe `/public/uploads/`.
   - **No paid WebRTC media servers** (No Twilio, Agora, or paid LiveKit) — use free Google STUN and free Metered.ca TURN (50 GB/mo).
   - **Audio-Only Calling**: Video calling is strictly disabled. Only audio calling via WebRTC Opus codec is allowed.

2. **Dual-Server Subdomain Isolation & High-Performance Daemon**:
   - **Server #1 (`chat.yourdomain.com`)**: Standalone Next.js 15+ App Router application handling UI, static media serving, REST endpoints, and PWA assets.
   - **Server #2 (`ws.yourdomain.com`)**: Dedicated **Fastify 4+ & Native `ws`** 24/7 daemon handling persistent WebSockets, live presence, typing states, and WebRTC audio call signaling.
   - **Memory Target**: Fastify + `ws` must maintain an idle memory footprint of **~25–35 MB RAM** (60%+ lower than Express + Socket.io), preventing out-of-memory restarts within Hostinger CloudLinux container limits.
   - **Cross-Origin Security**: Server #2 must allow CORS strictly from Server #1.

3. **Identity System Guardrail**:
   - **No phone numbers anywhere**: Registration and login only use `@username`, verified `email`, and `password`.
   - Never introduce phone number fields, SMS gateways, or OTP services requiring paid telephony.

4. **Database Connection Safety**:
   - Hostinger MySQL databases impose connection limits (typically 50–100 max user connections).
   - Prisma connection pooling must strictly specify `connection_limit=10` per server in `DATABASE_URL` to guarantee that total pool connections never exhaust Hostinger database limits.

## Technical Reference & Schema Governance

- Consult [`TECH_STACK_AND_ENV_CONFIG.md`](../../TECH_STACK_AND_ENV_CONFIG.md) for full npm packages and `.env` specifications.
- When extending or inspecting the Prisma schema in `PROJECT_SPECIFICATION_AND_PHASES.md`:
  - All foreign keys must have explicit indexes (`map: "idx_..."`) to prevent slow table scans on Hostinger shared MySQL.
  - Text content must use appropriate column types (`@db.VarChar(255)`, `@db.Text` for long messages).
  - The 7 fundamental models are: `User`, `Contact`, `Chat`, `ChatParticipant`, `Message`, `MessageStatus`, and `CallLog`.

## SDLC Phase Tracking

Always cross-reference user requests against the 14-phase roadmap in `phases/` and `chk.txt`. If an incoming feature request falls outside the roadmap, categorize it into the appropriate phase before planning execution.
