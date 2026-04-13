# AGENTS.md

## Purpose

`cloudblocks` is a monorepo for a visual cloud architecture builder with a TypeScript frontend and a scaffolded Python backend.

## Read First

- `README.md`
- `CONTRIBUTING.md`

## Working Rules

- Preserve the existing visual-model vocabulary: blocks, connections, templates.
- Keep frontend behavior, docs, and any domain model changes synchronized.
- Treat `apps/web` as the primary production surface unless the task explicitly targets `apps/api`.
- Avoid incidental refactors in areas that already have unrelated user changes.
- **UNIVERSAL PORT STANDARD (INVIOLABLE)**: Every port in the system — container blocks, resource blocks, any element — uses identical dimensions: rx=12, ry=6, height=5, 3-layer structure (shadow + top + inner ring). Only colors vary. This is the block-based composition principle: same gauge = assembly possible. See `docs/design/BRICK_DESIGN_SPEC.md §0` (historical reference). Any change that produces non-uniform ports is a blocking defect.
- **English only**: All documentation, code comments, UI strings, and commit messages must be written in English. Do not introduce Korean or any other non-English text. An i18n system (`react-i18next`) is planned for future localization — until then, English is the single source language.
- **Historical documents are immutable**: Do NOT edit documents marked "Historical (Superseded)" — including `BRICK_DESIGN_SPEC.md`, `VISUAL_DESIGN_SPEC.md`, and `BRICK_GUIDEBOOK.md`. ADRs (`docs/decisions/ADR-*.md`) are also immutable once merged; create a new ADR to supersede an old one.
- **SVG asset rules**: All SVG sprites live in `apps/web/src/shared/assets/`. New SVG files must comply with the Universal Port Standard. Use consistent naming: lowercase kebab-case (e.g., `internet.svg`, `compute-block.svg`). Every SVG must include a `viewBox` attribute and avoid inline `style` elements — use attributes or CSS classes instead.
- **Zustand store boundaries**: Three stores exist — `architectureStore` (domain model: container blocks, resource blocks, connections, external actors), `uiStore` (UI state: tool mode, panel visibility, selection), and `authStore` (auth: GitHub OAuth, session). Add new state to the store that owns the domain. Do not create new stores without discussion.
- **Test expectations**: New features should include tests. Branch coverage must stay ≥ 90%. Do not delete or skip failing tests to make CI pass — fix the root cause instead.

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

| Prefix     | When to use                             |
| ---------- | --------------------------------------- |
| `feat`     | New feature or capability               |
| `fix`      | Bug fix                                 |
| `docs`     | Documentation only                      |
| `test`     | Adding or updating tests                |
| `refactor` | Code change that neither fixes nor adds |
| `style`    | Formatting, CSS, whitespace             |
| `chore`    | Build, tooling, release management      |
| `perf`     | Performance improvement                 |
| `ci`       | CI/CD pipeline changes                  |

Scope is optional but recommended: `feat(web):`, `fix(api):`, `docs:`.

### Pull Request Rules

- `main` is a protected branch — all changes go through PR + CI.
- Always request Copilot code review: include `--reviewer copilot-pull-request-reviewer` in every `gh pr create` command. Auto-review is enabled at the repo level but may not trigger reliably — the explicit flag guarantees it.
- Squash-merge every PR with `--delete-branch`: `gh pr merge <number> --squash --delete-branch`. **Never** use `--admin` — let CI gates enforce quality.
- PR title should follow the same Conventional Commits format as commit messages.
- Each PR should reference and close its issue (e.g., `Fixes #123`).
- **Post-PR review gate**: After creating or updating a PR, always check GitHub's automated review results before merging:
  1. Wait for CI checks to complete: `gh pr checks <number> --watch`
  2. Review any automated review comments: `gh api repos/{owner}/{repo}/pulls/<number>/reviews` and `gh api repos/{owner}/{repo}/pulls/<number>/comments`
  3. If automated reviewers flag issues, fix them on the branch and push before merging.
  4. Only proceed with merge when all checks pass and no unresolved review comments remain.

## Implementation Principles

### Use Proven Libraries First

**Don't reinvent the wheel.** Before implementing any feature from scratch, search for well-maintained libraries that solve the problem.

| Need            | Prefer                          | Avoid                               |
| --------------- | ------------------------------- | ----------------------------------- |
| Drag & drop     | `interactjs`, `@dnd-kit`        | Custom pointer event handling       |
| State undo/redo | `zundo` (Zustand middleware)    | Manual history stack                |
| Grid snapping   | `interactjs` snap modifiers     | Custom snap calculations            |
| Form validation | `zod`, `valibot`                | Manual validation logic             |
| Date handling   | `date-fns`, `dayjs`             | Raw `Date` manipulation             |
| Animation       | `framer-motion`, `react-spring` | CSS keyframes for complex sequences |

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
- **Epic-first rule (MANDATORY)**: Every milestone must have at least one Epic issue BEFORE creating any sub-issues. Never create flat issue lists directly under a milestone — always create the Epic first, then decompose into sub-issues that reference it (`Part of #<epic>`). Flat issues without an Epic parent are a process violation.
- Create one Epic issue per major feature area inside the milestone. Epic titles use the format `[Epic] <feature area>`.
- Epic issues must:
  - be assigned to a milestone;
  - use the `epic` label plus one or more domain labels;
  - include these sections in the body: `## Overview`, `## Problems Solved`, `## Architecture`, `## Sub-Issues`, `## Dependencies`, `## Constraints`, `## Branch Name`.
- Decompose each Epic into focused sub-issues. Each sub-issue must include `Part of #<epic-number>` at the top of its body to establish the parent relationship. Each sub-issue should fit in one branch and one PR, and should usually cover one UI slice, one model change, one API route, one provider integration, one migration, or one test suite.
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

### Process Guardrails (INVIOLABLE)

These rules exist to prevent recurring process failures (duplicate milestones, orphaned PRs, wrong version tags, batch releases). Every rule includes a verification step — compliance is not optional.

#### Meta-Rule

- **Preflight before mutating (MANDATORY)**: Before any state-changing GitHub operation — creating/renaming milestones, assigning PR milestones, bumping versions, creating tags, or publishing releases — MUST reconcile live GitHub state with current policy files (`AGENTS.md`, `CONTRIBUTING.md`, `docs/design/VERSION_POLICY.md`). If live state and policy conflict, STOP the operation and fix the documentation conflict first. Never proceed with ambiguity.

#### Milestone Management

- **Uniqueness check**: Before creating a milestone, MUST query `gh api 'repos/{owner}/{repo}/milestones?state=all&per_page=100'` and confirm no milestone with the same number exists. If it exists, MUST reuse or update — NEVER create a duplicate.
- **Sequential numbering**: A new milestone number MUST be exactly `max(existing milestone numbers) + 1`. NEVER choose numbers for semantics, marketing, or round-number preference. Verify: the proposed number is one greater than the highest existing `Milestone N`.
- **Title format**: Milestone titles MUST use the exact format `Milestone N — Name`. Verify: title matches the pattern `Milestone [0-9]+ — .+`.
- **Universal milestone assignment**: Every issue and every PR MUST belong to a milestone — including dependency bumps, docs, maintenance, and CI changes. If no fitting open milestone exists, create or reuse the next sequential maintenance milestone before opening the issue/PR.

#### PR/Issue Hygiene

- **Issue milestone first**: Every issue MUST have a milestone assigned before branch creation. Verify: `gh issue view <number> --json milestone` returns non-null.
- **PR inherits milestone**: Every PR MUST reference exactly one closing issue and MUST use the same milestone as that issue. Verify: compare `gh pr view <number> --json milestone` with `gh issue view <issue> --json milestone`.
- **No exceptions**: Automation PRs, dependency bumps, docs PRs, and chore PRs are NOT exempt from milestone assignment. They go to the active maintenance milestone.

#### Release Integrity

- **One release = one milestone**: Each release MUST correspond to exactly one completed milestone. NEVER combine multiple milestone numbers or unreleased work into a single version bump, release commit, tag, or GitHub Release. Verify: all issues closed by the release PR belong to one milestone only.
- **Version scheme is sacred**: Release versions MUST be `v0.N.0` (milestone releases) or `v0.N.P` (hotfixes). NEVER create `v1.x`, `-beta`, `-rc`, or any other version scheme without explicit user approval in the current conversation. Verify: version strings, tags, changelog headings, and release titles all match `v0.N.P`.
- **Single bump at release time**: Version bump happens exactly once per milestone, at release time only. Verify: the release PR changes version files from the previous release to exactly one new `v0.N.0`.
- **Run version check**: After updating version sources, MUST run `./scripts/check-versions.sh` and confirm exit code 0 before creating the release commit, tag, or GitHub Release.

#### Anti-Precedent Rule

- Historical commits, tags, releases, and previously accepted exceptions MUST NOT be treated as precedent when they conflict with current policy files. If a past batch release, non-standard tag, or skipped version exists in git history, that does NOT authorize repeating the pattern. Current `AGENTS.md`, `CONTRIBUTING.md`, and `docs/design/VERSION_POLICY.md` always win.

## Release Workflow

When all issues in a milestone are closed, perform the following release steps:

1. **Demo verification (MANDATORY)**: Before any release, verify the live demo works correctly:
   - Build the app: `pnpm build`
   - Serve the built app locally (e.g., `npx serve apps/web/dist`)
   - Open the app in a browser (Playwright or manual) and verify:
     - App loads without console errors
     - Existing localStorage data (if any) loads and renders correctly
     - Core flows work: create workspace, place container block, place resource block, create connection
     - Templates load and render correctly
   - **A release that has not passed demo verification is a blocking defect.** Do not proceed with tagging or publishing until verification passes.
2. **Version bump**: Update `version` in `package.json` to `0.{milestone}.0` (e.g., Milestone 17 → `0.17.0`).
3. **CHANGELOG**: Add a new section to `CHANGELOG.md` with the milestone title, date, and a summary of changes.
4. **Commit**: Create a release commit on the PR branch (e.g., `chore: release v0.17.0`).
5. **Merge**: Squash-merge the PR to `main` with `--delete-branch`: `gh pr merge <number> --squash --delete-branch`.
6. **Tag**: Create an annotated git tag on the merge commit: `git tag -a v0.{milestone}.0 -m "v0.{milestone}.0 — {milestone title}"`.
7. **Push tag**: `git push origin v0.{milestone}.0`.
8. **GitHub Release**: `gh release create v0.{milestone}.0 --title "v0.{milestone}.0 — {milestone title}" --notes-file -` using the CHANGELOG section as body.
9. **Close milestone**: `gh api repos/{owner}/{repo}/milestones/{number} -X PATCH -f state=closed`.
10. **CI cleanup**: Purge stale GitHub Actions caches and artifacts to stay within storage limits:

```bash
# Delete all caches except the latest per key prefix on refs/heads/main
gh api repos/{owner}/{repo}/actions/caches --paginate --jq '.actions_caches[] | select(.ref != "refs/heads/main") | .id' | while read id; do gh api -X DELETE "repos/{owner}/{repo}/actions/caches/$id"; done
# Delete all artifacts except the 3 most recent
gh api repos/{owner}/{repo}/actions/artifacts --paginate --jq '[.artifacts[].id] | .[3:] | .[]' | while read id; do gh api -X DELETE "repos/{owner}/{repo}/actions/artifacts/$id"; done
```

11. **Roadmap sync**: Update `docs/concept/ROADMAP.md` per the Roadmap synchronization rules above.

Versioning convention: **Milestone N = v0.N.0**. Patch releases (v0.N.1, v0.N.2) are reserved for hotfixes. See `docs/design/RELEASE_GATES.md` for gate checks.

## Validation

- `pnpm build`
- `pnpm lint`
- `cd apps/api && pytest`
