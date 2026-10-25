# Phase 02 Database & Schema Specialist Review & Adversarial Challenge Report

**Agent**: Reviewer 1 (Database & Schema Specialist / Adversarial Critic)  
**Target Milestone**: Phase 02 — Hostinger Database & Dual-Server Infrastructure Setup  
**Date/Timestamp**: 2026-10-24T20:41:45Z  
**Handoff Type**: Hard Handoff  
**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**

---

## 1. Observation

Direct observations from reviewing source code, configuration files, and executing empirical verification commands:

1. **Prisma Schema (`web/prisma/schema.prisma`)**:
   - `datasource db`: configured with `provider = "mysql"` and `url = env("DATABASE_URL")` (lines 1–4).
   - `generator client`: configured with `provider = "prisma-client-js"` and `binaryTargets = ["native", "debian-openssl-3.0.x", "debian-openssl-1.1.x", "rhel-openssl-3.0.x"]` (lines 6–9).
   - Contains all 7 required models:
     - `User` (lines 11–35): strictly phone-less identity (`username`, `email`, `passwordHash`, `displayName`, `avatarUrl`, `about`, `isOnline`, `lastSeen`, `createdAt`, `updatedAt`). Contains no phone number, SMS verification, or telecom gateway fields.
     - `Contact` (lines 37–49): compound unique index `[userId, contactUserId]`, both foreign keys configured with `onDelete: Cascade`.
     - `Chat` (lines 51–70): group & direct chat support, `groupAdminId` with `onDelete: SetNull`, descending index `[lastMessageAt(sort: Desc)]`.
     - `ChatParticipant` (lines 72–85): compound unique index `[chatId, userId]`, `onDelete: Cascade` to both chat and user.
     - `Message` (lines 87–107): compound descending index `[chatId, createdAt(sort: Desc)]`, text/media fields, `onDelete: Cascade` to chat and sender.
     - `MessageStatus` (lines 109–121): compound unique index `[messageId, userId]`, `onDelete: Cascade` to message and recipient user.
     - `CallLog` (lines 123–140): strictly audio-only with `callType = "audio"` (no video fields), descending index `[chatId, startedAt(sort: Desc)]`, `onDelete: Cascade` to chat, caller, and receiver.
   - Command validation: `npx prisma validate --schema=web/prisma/schema.prisma` executed with exit code 0:
     ```text
     Environment variables loaded from .env
     Prisma schema loaded from web\prisma\schema.prisma
     The schema at web\prisma\schema.prisma is valid 🚀
     ```

2. **Database Migrations & Diff Parity (`web/prisma/migrations/0_init/migration.sql`)**:
   - Contains full DDL for all 7 tables with `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` ensuring 4-byte UTF-8 emoji support.
   - Declares primary keys (`VARCHAR(191)`), unique indexes, foreign keys, and cascading delete rules matching `schema.prisma`.
   - Verified schema equivalence via `npx prisma migrate diff --from-empty --to-schema-datamodel web/prisma/schema.prisma --script`. The generated DDL matched `web/prisma/migrations/0_init/migration.sql` character-for-character.
   - Provider lock verified in `web/prisma/migrations/migration_lock.toml` (`provider = "mysql"`).

3. **Database Seed Script (`web/prisma/seed.ts`)**:
   - Uses `bcryptjs` with 10 salt rounds (`await bcrypt.hash(defaultPassword, 10)`).
   - Seeds all 3 required demo accounts: `@ahsan`, `@developer`, and `@designer`.
   - Complete idempotency implemented:
     - Demo users: `prisma.user.upsert` on unique `username`.
     - Contacts: `prisma.contact.upsert` on composite unique `userId_contactUserId`.
     - Direct chats: `prisma.chat.findFirst` check before creation.
     - Messages: `prisma.message.findFirst` checks before creation.
     - Audio call logs: `prisma.callLog.findFirst` check before creation (`callType: 'audio'`).
   - Typecheck execution: `npx tsc --noEmit web/prisma/seed.ts` completed with exit code 0 and 0 errors.

4. **Singleton Prisma Clients & Connection Pooling**:
   - `web/src/lib/prisma.ts`: Implements global singleton cached to `globalThis.prisma` in development mode to prevent connection pool exhaustion during Next.js Hot Module Replacement (HMR).
   - `socket-server/src/lib/prisma.ts`: Implements global singleton with `dotenv.config()` and development caching on `globalThis`.
   - `web/.env` and `socket-server/.env`:
     ```env
     DATABASE_URL="mysql://u123456789_webchat:YourSecurePassword123@127.0.0.1:3306/u123456789_webchat?connection_limit=10&pool_timeout=20"
     ```
     Both enforce strict `connection_limit=10&pool_timeout=20`.

5. **Automated Unit & Adversarial Test Execution**:
   - Executing `npm test --workspace=web` (`vitest run`):
     ```text
     ✓ src/__tests__/prisma.test.ts (4 tests)
     ✓ src/__tests__/ui-primitives.test.tsx (16 tests)
     ✓ src/__tests__/adversarial-ui-primitives.test.tsx (13 tests)

     Test Files  3 passed (3)
          Tests  33 passed (33)
     ```
   - Executing `npm test --workspace=socket-server` (`vitest run`):
     ```text
     ✓ tests/roomManager.test.ts (8 tests)
     ✓ tests/stress.test.ts (12 tests)
     ✓ tests/auth.test.ts (7 tests)
     ✓ tests/websocket-live.test.ts (6 tests)
     ✓ tests/health.test.ts (2 tests)
     ✓ tests/runtime.test.ts (1 test)

     Test Files  6 passed (6)
          Tests  36 passed (36)
     ```
   - Grand total across workspaces: 9 test files, 69 tests passed, 0 failures.

6. **Phase 2 Checklist Synchronization**:
   - Inspected `chk.txt` lines 18–24: All 5 Phase 2 checklist items are marked `[x]`.

---

## 2. Logic Chain

1. **Schema Correctness & Guardrail Compliance (supported by Observation 1)**:
   - The project guardrails in `AGENTS.md` and `PROJECT_SPECIFICATION_AND_PHASES.md` mandate:
     - Hostinger MySQL datasource: satisfied (`provider = "mysql"`).
     - Linux deployment compatibility: satisfied (includes `native`, `debian-openssl-3.0.x`, `debian-openssl-1.1.x`, `rhel-openssl-3.0.x`).
     - Phone-less identity: satisfied (zero phone number fields in `User` model, strictly `@username` and `email`).
     - Audio-only calling: satisfied (`CallLog` contains only `callType = "audio"`, duration, timestamps, and participants; zero video attributes).
     - Relation and cascade integrity: all 7 models declare appropriate cascade rules (`Cascade` for child dependencies, `SetNull` for `groupAdminId`).

2. **DDL & Migration Soundness (supported by Observation 2)**:
   - The initial migration in `0_init/migration.sql` was diffed against the Prisma schema using Prisma's core migration engine (`prisma migrate diff`).
   - The diff returned 0 schema differences. The SQL script is completely idempotent with respect to the Prisma data model and includes appropriate character encoding (`utf8mb4`) and collation (`utf8mb4_unicode_ci`) required for emojis.

3. **Hostinger Resource & Connection Safety (supported by Observations 1 & 4)**:
   - Hostinger shared MySQL instances enforce strict connection quotas (typically 20–30 max connections per cPanel user).
   - Default Prisma Client behavior allocates `num_physical_cpus * 2 + 1` connections per instance, which on shared hosting hardware with 8–16 cores would create 34–66 connections, instantly triggering `Error: 1040 Too many connections`.
   - By embedding `connection_limit=10&pool_timeout=20` into both `web/.env` and `socket-server/.env`, the combined maximum connection footprint across both servers is capped at 20 connections, safely under Hostinger's ceiling.
   - Singleton implementations in `web/src/lib/prisma.ts` and `socket-server/src/lib/prisma.ts` using `globalThis` guarantee that Next.js HMR in development or multi-module imports in Node.js do not instantiate redundant connection pools.

4. **Integrity & Seed Safety (supported by Observations 3 & 5)**:
   - All tests execute real queries/delegates without mock cheating, facade objects, or hardcoded pass assertions.
   - The seed script guarantees repeatability without unique constraint violations (`P2002`) due to the deliberate use of `upsert` and guarded `findFirst` calls.
   - Passwords are securely hashed with 10 rounds of bcrypt, satisfying standard production security requirements.

---

## 3. Adversarial Challenges & Stress Tests

### Challenge 1: Connection Pool Flooding Under Hostinger CloudLinux Quotas
- **Assumption**: Two Node.js servers connecting to the same Hostinger MySQL database will not exceed maximum user connection limits.
- **Attack Scenario**: High concurrent traffic arrives at both Server #1 (Next.js REST endpoints) and Server #2 (WebSocket presence / message persist worker). If either server spawns unconstrained connections or spins up multiple PrismaClient instances during HMR or route handling, the MySQL server terminates incoming connections with `1040 Too many connections`.
- **Stress Test Verification**:
  - Inspected `web/src/lib/prisma.ts` and `socket-server/src/lib/prisma.ts`: Both bind to `globalThis` to preserve singleton identity.
  - Inspected connection strings in both `.env` files: Both enforce `connection_limit=10&pool_timeout=20`.
  - Max potential active connections = 10 (Server #1) + 10 (Server #2) = 20 max connections, strictly within Hostinger CloudLinux quotas.
- **Verdict**: PASS.

### Challenge 2: Accidental Schema Drift Between `schema.prisma` and `migration.sql`
- **Assumption**: The hand-checked initial SQL migration matches the Prisma schema without any unapplied column, foreign key, or index discrepancies.
- **Attack Scenario**: Running `prisma migrate deploy` on Hostinger applies `migration.sql`. If the application later runs code compiled from `@prisma/client` that expects fields or indexes not in `migration.sql`, runtime queries fail with SQL 1054 (`Unknown column`) or 1146 (`Table doesn't exist`).
- **Stress Test Verification**:
  - Executed `npx prisma migrate diff --from-empty --to-schema-datamodel web/prisma/schema.prisma --script`.
  - Diffed against `web/prisma/migrations/0_init/migration.sql`.
  - Observed 0 differences; character-for-character exact match.
- **Verdict**: PASS.

### Challenge 3: Video Calling Field Injection
- **Assumption**: Architecture is strictly audio-only to preserve $0 monthly cost on Hostinger.
- **Attack Scenario**: Presence of video metadata (e.g. `resolution`, `fps`, `codec`, `videoTrackId`, `callType = "video"`) would introduce hidden dependencies on SFU/MCU bandwidth or video processing.
- **Stress Test Verification**:
  - Inspected all columns of `call_logs` table in both `schema.prisma` and `migration.sql`.
  - Model contains only: `chatId`, `callerId`, `receiverId`, `callType` (default: `'audio'`), `status`, `duration`, `startedAt`, `endedAt`.
  - No video fields exist in any schema file or type definition.
- **Verdict**: PASS.

### Challenge 4: Integrity Violation & Facade Implementation Check
- **Pattern Check**:
  - Hardcoded test results: None found.
  - Dummy/facade Prisma implementations: None found.
  - Bypassed tasks: All 7 models, DDL migration, seed script, singleton clients, and tests are genuinely implemented.
- **Verdict**: PASS (No integrity violations).

---

## 4. Caveats

1. **Remote Hostinger Database Access**:
   - Verification of `migration.sql` and `seed.ts` was conducted via Prisma engine validation, diffing against schema datamodel, and TypeScript compilation. Live execution of `npx prisma migrate deploy` or `npx prisma db seed` on production Hostinger infrastructure requires live cPanel/hPanel MySQL credentials and network access to port 3306.
2. **Prisma Version Synchronization**:
   - Both `web/package.json` and `socket-server/package.json` use `@prisma/client@^5.22.0`. It is important that any future dependency updates keep the Prisma versions in sync across both workspaces to ensure binary engine compatibility.

---

## 5. Conclusion

Phase 02 Database & Schema implementation adheres 100% to specifications, project guardrails, and architectural requirements:
- `web/prisma/schema.prisma` correctly implements all 7 models with MySQL provider and multi-target binaries.
- Strict phone-less identity and audio-only calling are faithfully enforced.
- Initial migration DDL has 100% parity with the schema data model.
- Seed script is fully idempotent and hashes passwords with bcrypt.
- Singleton clients prevent connection pool exhaustion and HMR leaks.
- All 69 automated tests across both workspaces pass cleanly.

**Final Verdict: APPROVE**

---

## 6. Verification Method

Independent verification can be reproduced using these commands:

1. **Validate Prisma Schema**:
   ```powershell
   npx prisma validate --schema=web/prisma/schema.prisma
   ```
   *Expected*: `The schema at web\prisma\schema.prisma is valid 🚀`

2. **Verify DDL Parity Against Datamodel**:
   ```powershell
   npx prisma migrate diff --from-empty --to-schema-datamodel web/prisma/schema.prisma --script
   ```
   *Expected*: Outputs the identical SQL statements present in `web/prisma/migrations/0_init/migration.sql`.

3. **Typecheck Seed Script**:
   ```powershell
   npx tsc --noEmit web/prisma/seed.ts
   ```
   *Expected*: Exits with code 0 and no TypeScript diagnostics.

4. **Run Web Test Suite**:
   ```powershell
   npm test --workspace=web
   ```
   *Expected*: 3 test files passed, 33 tests passed (including `prisma.test.ts`).

5. **Run Socket Server Test Suite**:
   ```powershell
   npm test --workspace=socket-server
   ```
   *Expected*: 6 test files passed, 36 tests passed.
