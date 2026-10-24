# DISPATCH — challenger_2

- **Role**: Backend & Realtime Challenger
- **Working Directory**: d:/MyGitHubProjects/WebChat/.agents/teamwork/challenger_2
- **Parent**: orchestrator_phase01
- **Domain Skill Path**: d:/MyGitHubProjects/WebChat/.agents/skills/webchat-qa-devops/SKILL.md
- **Inputs**:
  - `d:/MyGitHubProjects/WebChat/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY: read first!)
  - `PROJECT.md`
  - `TECH_STACK_AND_ENV_CONFIG.md`
  - `socket-server/` application
- **Task**:
  Empirically stress-test and challenge backend realtime daemon:
  1. Concurrency and Multi-Tab Socket Testing:
     - Verify `RoomManager` behavior when a user opens 3 tabs and closes 1 or 2; verify `isUserOnline` stays true until all close.
     - Verify room pruning: ensure room sets are deleted from memory when the last user leaves.
     - Verify broadcast exclusion: sender socket is not echoed back to itself.
  2. Runtime execution and health check:
     - Run `node dist/index.js` or inject request to `GET /health` to verify that memory RSS reporting works and stays low (~25–70 MB).
  3. Run full automated test suite (`npm test` in `socket-server/`) and verify all tests pass.
  4. Formulate verdict: `APPROVE` or `REQUEST_CHANGES`.
- **Output**:
  Write handoff report to `d:/MyGitHubProjects/WebChat/.agents/teamwork/challenger_2/handoff.md`.


## 2026-10-24T19:34:35Z
You are challenger_2. Your working directory is d:/MyGitHubProjects/WebChat/.agents/teamwork/challenger_2.
Read your detailed task in d:/MyGitHubProjects/WebChat/.agents/teamwork/challenger_2/DISPATCH.md.
MANDATORY: Read d:/MyGitHubProjects/WebChat/.agents/teamwork/ORIGINAL_REQUEST.md first!
Also read PROJECT.md and TECH_STACK_AND_ENV_CONFIG.md.
Load and apply domain skill at d:/MyGitHubProjects/WebChat/.agents/skills/webchat-qa-devops/SKILL.md.
Empirically stress-test and challenge backend realtime daemon:
1. Concurrency and Multi-Tab Socket Testing: test RoomManager with multi-tab users, leave/leaveAll pruning, room cleanup, and sender exclusion.
2. Runtime execution and health check: run node dist/index.js or inject request to GET /health to verify RSS memory stays low (~25–70 MB) and status is ok.
3. Run npm test in socket-server/ and confirm all unit tests pass.
Formulate verdict: APPROVE or REQUEST_CHANGES.
Write your handoff report to d:/MyGitHubProjects/WebChat/.agents/teamwork/challenger_2/handoff.md and notify me when complete.
