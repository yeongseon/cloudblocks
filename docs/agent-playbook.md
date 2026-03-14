# Agent Playbook

## Source Of Truth
- `README.md` for product scope, architecture overview, and high-level commands.
- `CONTRIBUTING.md` for structure, coding expectations, and verification flow.
- `package.json`, `apps/web/package.json`, and root `Makefile` for runnable commands.

## Repository Map
- `apps/web/` current frontend application.
- `apps/api/` scaffolded backend API.
- `docs/` concept, engine, and model documentation.

## Change Workflow
1. Identify whether the change is frontend, backend scaffold, or docs/model only.
2. Keep feature-sliced frontend boundaries intact when editing `apps/web`.
3. Update architecture docs when changing the domain model or generated output contracts.
4. In dirty worktrees, stage only the files you intentionally changed.

## Validation
- `pnpm install`
- `pnpm build`
- `pnpm lint`
- `cd apps/api && pytest`
