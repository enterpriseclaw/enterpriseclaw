# Cloud 4-Agent Plan (Sprints 5-8)

Generated: 2026-03-03
Project: enterpriseclaw

## Objective
Run 4 cloud agents in parallel to deliver Sprint 5 through Sprint 8 while managing cross-sprint dependencies.

## Agent Allocation
- Agent A (Backend Scheduler): Sprint 5 CronJobs core engine and APIs
- Agent B (Observability Full-Stack): Sprint 6 dashboard, audit log UI/API, settings UI
- Agent C (Security + Data): Sprint 7 Spring Security, auth flows, Postgres migration path
- Agent D (Platform Hardening): Sprint 8 Docker, jlink runtime, smoke tests, CI pipeline

## Dependency Rules
- Sprint 5 and Sprint 6 can begin immediately.
- Sprint 7 can start in parallel but must not break Solo mode behavior.
- Sprint 8 can start immediately for CI/docker scaffolding; final smoke gates run after Sprints 5-7 merges.
- Any API contract touched by multiple agents requires OpenAPI contract-first updates before implementation.

## Parallel Workstreams
1. Workstream A (Agent A)
- Implement `CronJobController`, `CronJobService`, dynamic scheduler, trigger endpoint.
- Add unit + integration tests for schedule creation, trigger, execution logs.

2. Workstream B (Agent B)
- Implement dashboard metrics endpoints and dashboard UI.
- Implement paginated audit log endpoint and viewer.
- Implement settings storage + UI for provider/system preferences.

3. Workstream C (Agent C)
- Add Spring Security with role model for Team mode.
- Implement login/logout/user management APIs and frontend flow.
- Add `application-team.yml` and Postgres profile behavior.

4. Workstream D (Agent D)
- Build Docker image + compose setup for app dependencies.
- Add jlink runtime packaging.
- Add smoke tests and CI gates for `task test`, `task build`, lint.

## Merge Cadence
- Merge window 1: Sprint 5 API + tests
- Merge window 2: Sprint 6 UI/API
- Merge window 3: Sprint 7 auth + data mode
- Merge window 4: Sprint 8 hardening and release gate

## Definition of Done Per Agent
- Code merged with passing tests.
- No regression in chat NDJSON streaming.
- Updated docs in `_bmad-output` for delivered sprint scope.

## Coordination Checklist
- Daily contract sync: controller DTO changes and shared frontend API clients.
- Shared branch protection: required status checks on tests and lint.
- Blockers escalated via BMad Master for reprioritization.
