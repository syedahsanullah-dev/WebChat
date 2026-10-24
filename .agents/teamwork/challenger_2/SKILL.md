# WebChat QA, Testing & DevOps Skill (Local Copy)
Source: d:/MyGitHubProjects/WebChat/.agents/skills/webchat-qa-devops/SKILL.md

Key Methodology:
- Vitest unit/integration testing for RoomManager, WebSocket lifecycle, validators, and endpoints.
- k6 virtual user load testing for native WebSocket connections and throughput.
- Zero-cost Hostinger constraints: ~25-35 MB RAM idle target for socket server, Fastify + native ws.
- Hostinger keep-alive via /health endpoint.
