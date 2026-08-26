# AGENTS.md

## Purpose

`cloudblocks` is a monorepo for a visual cloud architecture builder with a TypeScript frontend and a scaffolded Python backend. It is maintained by a solo developer working in bursts, delegating execution to AI agents. Keep the process lightweight — optimize for re-entry after dormancy, not for team ceremony.

## Read First

- `README.md`
- `CONTRIBUTING.md`
- `docs/concept/ROADMAP.md` — product direction (V1 Learn → V2 Export → V3 Practice → V4 Teach)

## Working Rules (product integrity — non-negotiable)

- Preserve the visual-model vocabulary: blocks, connections, templates.
- Treat `apps/web` as the primary production surface unless the task explicitly targets `apps/api`.
- Avoid incidental refactors in areas that already have unrelated user changes.
- **UNIVERSAL PORT STANDARD (INVIOLABLE)**: Every port — container blocks, resource blocks, any element — uses identical dimensions: rx=12, ry=6, height=5, 3-layer structure (shadow + top + inner ring). Only colors vary. Non-uniform ports are a blocking defect.
- **English only**: All docs, code comments, UI strings, and commit messages in English. No Korean or other non-English text. (An i18n system via `react-i18next` is planned; until then English is the single source language.)
- **Immutable history**: Do NOT edit documents marked "Historical (Superseded)" (`BRICK_DESIGN_SPEC.md`, `VISUAL_DESIGN_SPEC.md`, `BRICK_GUIDEBOOK.md`). ADRs (`docs/adr/`) are immutable once merged — create a new ADR to supersede an old one.
- **SVG asset rules**: SVG sprites live in `apps/web/src/shared/assets/`. New SVGs must comply with the Universal Port Standard, use lowercase kebab-case names, include a `viewBox`, and avoid inline `style` elements (use attributes or CSS classes).
- **Zustand store boundaries**: Three stores — `architectureStore` (domain model), `uiStore` (UI state), `authStore` (auth). Add new state to the store that owns the domain. Do not create new stores without discussion.
- **Test expectations**: New features include tests. Branch coverage stays ≥ 90%. Do not delete or skip failing tests to make CI pass — fix the root cause.

## Git & PR Conventions

- Branch naming: `{type}/{issue#}-{short-desc}` or `{type}/{short-desc}` (e.g. `feat/447-menubar`, `fix/441-actor-css`, `docs/readme-badges`).
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) — `{type}({scope}): {description}`. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`, `perf`, `ci`. Scope optional but recommended (`feat(web):`).
- `main` is protected — all changes go through PR + CI.
- Request Copilot review: include `--reviewer copilot-pull-request-reviewer` in `gh pr create`.
- Squash-merge with `--delete-branch`: `gh pr merge <number> --squash --delete-branch`. Never use `--admin` — let CI gates enforce quality.
- PR titles follow Conventional Commits. Each PR references and closes its issue (`Fixes #123`).
- After creating a PR, wait for CI (`gh pr checks <number>`) and address automated review comments before merging.

## Planning

- Use lightweight `Issue → Branch → PR` for all work. Milestones are optional planning aids, not release units — do not create a milestone per small change, and do not require one on every issue/PR.
- Track direction with `Now` (max 3) / `Next` (max 10) / `Later` (roadmap narrative) rather than a sequential milestone ladder.
- Before starting an issue: check the assignee (don't pick up others' work; assign yourself if unassigned), then sync `main`:
  ```bash
  git checkout main && git pull --ff-only origin main
  ```

## Implementation Principles

**Don't reinvent the wheel.** Prefer well-maintained libraries (>50k weekly downloads, maintained <6mo, TypeScript support, small footprint) over custom implementations. Build custom only when no suitable library exists, there are critical security issues, bundle impact is unacceptable, or the API conflicts with existing architecture.

Installed helpers: `interactjs` (drag & drop + grid snapping), `zundo` (Zustand undo/redo).

## Validation

- `pnpm build`
- `pnpm lint`
- `python3 -m pytest apps/api`

## Releases

Release when there is a **learner-visible reason** — not when a milestone closes. Versions represent user-visible product state, decoupled from milestones (see [ADR-0019](docs/adr/0019-decouple-versioning-from-milestones.md) and `docs/design/VERSION_POLICY.md`):

- `v0.x.0` — a meaningful capability bundle worth announcing.
- `v0.x.y` — bug fixes and hotfixes.
- No version bump for routine PRs, visual tweaks, docs, refactors, or dependency updates.

Release steps: verify the live demo works (`pnpm build`, serve `apps/web/dist`, check core flows), bump all version sources together and run `./scripts/check-versions.sh` (exit 0), update `CHANGELOG.md`, squash-merge, tag `v0.x.y`, push tag, create the GitHub Release, and sync `docs/concept/ROADMAP.md`. See `docs/design/RELEASE_GATES.md` for gate checks.
