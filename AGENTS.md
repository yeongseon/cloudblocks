# AGENTS.md

## Purpose
`cloudblocks` is a monorepo for a visual cloud architecture builder with a TypeScript frontend and a scaffolded Python backend.

## Read First
- `README.md`
- `CONTRIBUTING.md`

## Working Rules
- Preserve the existing visual-model vocabulary: plates, blocks, connections, templates.
- Keep frontend behavior, docs, and any domain model changes synchronized.
- Treat `apps/web` as the primary production surface unless the task explicitly targets `apps/api`.
- Avoid incidental refactors in areas that already have unrelated user changes.
- **UNIVERSAL STUD STANDARD (INVIOLABLE)**: Every stud in the system — background, plates, blocks, any element — uses identical dimensions: rx=12, ry=6, height=5, 3-layer structure (shadow + top + inner ring). Only colors vary. This is the Lego principle: same gauge = assembly possible. See `docs/design/BRICK_DESIGN_SPEC.md §0`. Any change that produces non-uniform studs is a blocking defect.
- **English only**: All documentation, code comments, UI strings, and commit messages must be written in English. Do not introduce Korean or any other non-English text. An i18n system (`react-i18next`) is planned for future localization — until then, English is the single source language.
- **Historical documents are immutable**: Do NOT edit documents marked "Historical (Superseded)" — including `BRICK_DESIGN_SPEC.md`, `VISUAL_DESIGN_SPEC.md`, and `BRICK_GUIDEBOOK.md`. ADRs (`docs/decisions/ADR-*.md`) are also immutable once merged; create a new ADR to supersede an old one.
- **SVG asset rules**: All SVG sprites live in `apps/web/src/shared/assets/`. New SVG files must comply with the Universal Stud Standard. Use consistent naming: lowercase kebab-case (e.g., `internet.svg`, `compute-block.svg`). Every SVG must include a `viewBox` attribute and avoid inline `style` elements — use attributes or CSS classes instead.
- **Zustand store boundaries**: Three stores exist — `architectureStore` (domain model: plates, blocks, connections, external actors), `uiStore` (UI state: tool mode, panel visibility, selection), and `authStore` (auth: GitHub OAuth, session). Add new state to the store that owns the domain. Do not create new stores without discussion.
- **Test expectations**: New features should include tests. Branch coverage must stay ≥ 90%. Do not delete or skip failing tests to make CI pass — fix the root cause instead.
- **NEVER auto-create GitHub issues**: Agents and sub-agents must NEVER run `gh issue create` unless the user explicitly asks to create a specific issue. When fixing bugs, only fix code — do not file new issues for problems discovered along the way. Report findings as text in your response instead. The user decides what becomes an issue.
- **Small, sequential PRs**: Process at most 5–10 issues per PR. Merge each PR before starting the next batch. Do not open 7+ parallel PRs that touch overlapping files — this causes merge conflicts, cascading CI failures, and unmanageable review burden.

## Git Conventions

### Branch Naming
Use the pattern `{type}/{issue#}-{short-desc}` or `{type}/{short-desc}` for branches:
- `feat/447-menubar-consolidation`
- `fix/441-external-actor-css`
- `docs/readme-badges`
- `chore/release-management`
- `m14/ai-frontend-integration` (milestone-scoped work)

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/). Format: `{type}({scope}): {description}`.

| Prefix | When to use |
|--------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `refactor` | Code change that neither fixes nor adds |
| `style` | Formatting, CSS, whitespace |
| `chore` | Build, tooling, release management |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |

Scope is optional but recommended: `feat(web):`, `fix(api):`, `docs:`.

### Pull Request Rules
- `main` is a protected branch — all changes go through PR + CI.
- Squash-merge every PR with `--delete-branch`: `gh pr merge <number> --squash --admin --delete-branch`.
- PR title should follow the same Conventional Commits format as commit messages.
- Each PR should reference and close its issue (e.g., `Fixes #123`).

## Implementation Principles

### Use Proven Libraries First
**Don't reinvent the wheel.** Before implementing any feature from scratch, search for well-maintained libraries that solve the problem.

| Need | Prefer | Avoid |
|------|--------|-------|
| Drag & drop | `interactjs`, `@dnd-kit` | Custom pointer event handling |
| State undo/redo | `zundo` (Zustand middleware) | Manual history stack |
| Grid snapping | `interactjs` snap modifiers | Custom snap calculations |
| Form validation | `zod`, `valibot` | Manual validation logic |
| Date handling | `date-fns`, `dayjs` | Raw `Date` manipulation |
| Animation | `framer-motion`, `react-spring` | CSS keyframes for complex sequences |

### Library Selection Criteria
1. **Weekly downloads** > 50k (npm) — community validation
2. **Last published** < 6 months — actively maintained
3. **TypeScript support** — first-class types or `@types/*` available
4. **Bundle size** — prefer smaller footprint for frontend
5. **API simplicity** — easy to integrate, not over-engineered

### When to Build Custom
- No library exists for the specific domain need
- Existing libraries have critical security issues
- Bundle size impact is unacceptable (>100kb for minor feature)
- Library API conflicts with existing architecture patterns

### Installed Libraries (Reference)
```
interactjs   — Drag & drop with grid snapping
zundo        — Zustand undo/redo middleware
```

## Planning Workflow

- Use two planning paths:
  - roadmap implementation: `Milestone -> Epic -> Sub-issue -> Branch -> PR`
  - small fixes, docs, and maintenance: `Issue -> Branch -> PR`
- Current roadmap work is tracked under [open milestones](https://github.com/yeongseon/cloudblocks/milestones). Use `gh milestone list` to find the active milestone and its Epic issues.
- Before starting work on any issue, always check the assignee first. If the issue is already assigned to someone else, do not pick it up — choose a different issue or ask the user. If unassigned, assign yourself (`gh issue edit <number> --add-assignee @me`) before starting work.
- Before starting work on any issue, always sync local `main` first:
  ```bash
  git checkout main
  git pull --ff-only origin main
  ```
- Create or reuse a milestone when the work is a named phase or release, spans multiple epics, or needs shared tracking across multiple implementation issues.
- Create one Epic issue per major feature area inside the milestone. Epic titles use the format `[Epic] <feature area>`.
- Epic issues must:
  - be assigned to a milestone;
  - use the `epic` label plus one or more domain labels;
  - include these sections in the body: `## Overview`, `## Problems Solved`, `## Architecture`, `## Sub-Issues`, `## Dependencies`, `## Constraints`, `## Branch Name`.
- Decompose each Epic into focused sub-issues. Each sub-issue should fit in one branch and one PR, and should usually cover one UI slice, one model change, one API route, one provider integration, one migration, or one test suite.
- Labeling rules:
  - Epic issues use `epic` plus one or more domain labels. Epic issues do not require a type label.
  - Non-Epic implementation issues use exactly one type label: `enhancement`, `bug`, or `testing`.
  - Documentation issues use `documentation`; domain labels are recommended and optional when the docs are cross-cutting.
  - Domain labels include `frontend`, `backend`, `security`, `auth`, `infrastructure`, `ux`, `design-system`, `domain-model`, and `cloud-provider`.
  - Every non-Epic issue must have exactly one size label: `size/S`, `size/M`, `size/L`, or `size/XL`. Assign it at creation time.
  - **Mandatory labels on creation**: Every issue must be created with all applicable labels (type + domain + size) in the `gh issue create --label` flag. Never create an issue without labels — add them at creation time, not after the fact.
- Use one branch per sub-issue and one PR per branch. Each PR should reference and close its issue.
- **Roadmap synchronization**:
  - When creating a new milestone, consult `docs/concept/ROADMAP.md` first — verify the milestone fits within the current dependency chain, does not duplicate existing scope, and has a clear placement in the evolution summary.
  - When all issues in a milestone are closed, update `docs/concept/ROADMAP.md`: mark exit criteria as checked (`[x]`), add a ✅ marker to the heading, update the Summary chain and Dependency Graph, and add or revise the Success Metrics entry.

## Release Workflow

When all issues in a milestone are closed, perform the following release steps:

1. **Version bump**: Update `version` in `package.json` to `0.{milestone}.0` (e.g., Milestone 17 → `0.17.0`).
2. **CHANGELOG**: Add a new section to `CHANGELOG.md` with the milestone title, date, and a summary of changes.
3. **Commit**: Create a release commit on the PR branch (e.g., `chore: release v0.17.0`).
4. **Merge**: Squash-merge the PR to `main` with `--admin --delete-branch`.
5. **Tag**: Create an annotated git tag on the merge commit: `git tag -a v0.{milestone}.0 -m "v0.{milestone}.0 — {milestone title}"`.
6. **Push tag**: `git push origin v0.{milestone}.0`.
7. **GitHub Release**: `gh release create v0.{milestone}.0 --title "v0.{milestone}.0 — {milestone title}" --notes-file -` using the CHANGELOG section as body.
8. **Close milestone**: `gh api repos/{owner}/{repo}/milestones/{number} -X PATCH -f state=closed`.
9. **Roadmap sync**: Update `docs/concept/ROADMAP.md` per the Roadmap synchronization rules above.

Versioning convention: **Milestone N = v0.N.0**. Patch releases (v0.N.1, v0.N.2) are reserved for hotfixes. See `docs/design/RELEASE_GATES.md` for gate checks.

## Validation
- `pnpm build`
- `pnpm lint`
- `cd apps/api && pytest`
