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
- **UNIVERSAL STUD STANDARD (INVIOLABLE)**: Every stud in the system — background, plates, blocks, any element — uses identical dimensions: rx=12, ry=6, height=5, 3-layer structure (shadow + top + inner ring). Only colors vary. This is the Lego principle: same gauge = assembly possible. See `docs/design/BRICK_SIZE_SPEC.md §0`. Any change that produces non-uniform studs is a blocking defect.

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
- Use one branch per sub-issue and one PR per branch. Each PR should reference and close its issue.

## Validation
- `pnpm build`
- `pnpm lint`
- `cd apps/api && pytest`
