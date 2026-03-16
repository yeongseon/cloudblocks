# AGENTS.md

## Purpose
`cloudblocks` is a monorepo for a visual cloud architecture builder with a TypeScript frontend and a scaffolded Python backend.

## Read First
- `README.md`
- `CONTRIBUTING.md`
- `docs/agent-playbook.md`

## Working Rules
- Preserve the existing visual-model vocabulary: plates, blocks, connections, templates.
- Keep frontend behavior, docs, and any domain model changes synchronized.
- Treat `apps/web` as the primary production surface unless the task explicitly targets `apps/api`.
- Avoid incidental refactors in areas that already have unrelated user changes.
- **UNIVERSAL STUD STANDARD (INVIOLABLE)**: Every stud in the system — background, plates, blocks, any element — uses identical dimensions: rx=19, ry=9.5, height=7px, 3-layer structure (shadow + top + inner ring). Only colors vary. This is the Lego principle: same gauge = assembly possible. See `docs/design/BRICK_SIZE_SPEC.md §0`. Any change that produces non-uniform studs is a blocking defect.

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

## Validation
- `pnpm build`
- `pnpm lint`
- `cd apps/api && pytest`
