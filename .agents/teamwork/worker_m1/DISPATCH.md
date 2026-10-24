# DISPATCH — worker_m1

- **Role**: Full-Stack Worker / Workspace & Next.js Standalone Engineer
- **Working Directory**: d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_m1
- **Parent**: orchestrator_phase01
- **Domain Skill Path**: d:/MyGitHubProjects/WebChat/.agents/skills/webchat-coding-engineer/SKILL.md
- **Exclusive File Ownership**:
  - `package.json` (root monorepo)
  - `shared/` (`package.json`, `tsconfig.json`, `src/index.ts`, `src/types.ts`, `src/events.ts`)
  - `web/package.json`
  - `web/tsconfig.json`
  - `web/next.config.js`
  - `web/tailwind.config.ts`
  - `web/postcss.config.js`
  - `web/.env.example`
  - `web/src/app/globals.css`
  - `web/src/lib/utils.ts`
  - `web/public/patterns/doodle-bg.png`
- **Inputs**:
  - `d:/MyGitHubProjects/WebChat/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY: read this first!)
  - `PROJECT.md`
  - `d:/MyGitHubProjects/WebChat/.agents/teamwork/explorer_survey_1/handoff.md` (Contains exact configuration templates!)
  - `phases/01_WORKSPACE_AND_LAYOUT_SHELL.md`
  - `TECH_STACK_AND_ENV_CONFIG.md`

- **Task**:
  1. Initialize the monorepo root `package.json` with npm workspaces (`"workspaces": ["web", "socket-server", "shared"]`).
  2. Scaffold `shared/` package with TypeScript config, `types.ts`, and `events.ts` (`WsEnvelope<T>` supporting all 17 message types).
  3. Scaffold `web/` with:
     - `web/package.json` (Next.js 15.1.0, React 19, Tailwind CSS 3.4.16, TypeScript 5.7.2, Lucide React, etc. per TECH_STACK_AND_ENV_CONFIG.md)
     - `web/tsconfig.json` (strict TS, path alias `@/*` pointing to `./src/*`, `@shared/*` pointing to `../shared/src/*`)
     - `web/next.config.js` (`output: 'standalone'`, `images: { unoptimized: true }`, `serverActions: { bodySizeLimit: '20mb' }`)
     - `web/tailwind.config.ts` (Official WhatsApp Web dark & light color palette tokens: `wa.dark`, `wa.light`, `wa.green`, `wa.blue`, `darkMode: 'class'`)
     - `web/postcss.config.js`
     - `web/.env.example`
     - `web/src/lib/utils.ts` (`cn()` helper with clsx and tailwind-merge)
     - `web/src/app/globals.css` (WhatsApp doodle wallpaper background, custom slim scrollbars adhering to modern web standards, CSS variables for dark/light mode)
     - `web/public/patterns/doodle-bg.png` (Create or generate a valid repeating WhatsApp doodle pattern wallpaper image)
  4. Run `npm install` in `web/` and verify that dependencies install cleanly.
  5. Run build or typecheck in `web/` to verify that Next.js and TypeScript configurations are valid.

- **Mandatory Integrity Warning**:
  DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

- **Output**:
  Write handoff report to `d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_m1/handoff.md` with:
  - Observation: exact files created and configurations applied
  - Logic Chain: why each setting was chosen
  - Build/Test Results: commands executed and stdout/stderr
  - Caveats & Next Steps


## 2026-10-24T19:03:24Z
From: 1b05ab63-db30-4f14-ad7b-d073ca88e758
Content: You are worker_m1. Your working directory is d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_m1.
Read your detailed task in d:/MyGitHubProjects/WebChat/.agents/teamwork/worker_m1/DISPATCH.md.
MANDATORY: Read d:/MyGitHubProjects/WebChat/.agents/teamwork/ORIGINAL_REQUEST.md first!
Also read PROJECT.md, d:/MyGitHubProjects/WebChat/.agents/teamwork/explorer_survey_1/handoff.md, phases/01_WORKSPACE_AND_LAYOUT_SHELL.md, and TECH_STACK_AND_ENV_CONFIG.md.
Load and apply the domain skill at d:/MyGitHubProjects/WebChat/.agents/skills/webchat-coding-engineer/SKILL.md.
