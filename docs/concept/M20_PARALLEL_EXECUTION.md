# M20 Parallel Execution Guide

> **Purpose**: Enable two OpenCode instances to work on M20 simultaneously without merge conflicts.  
> **Approach**: File-ownership-based split. Each instance owns specific directories and files. Shared files have explicit coordination rules.

---

## Instance Assignment

### Instance A — UI/UX & Domain Logic

**Phases owned**: 0, 2 (GitHub bugs), 3a (IaC abstraction), 5 (Demo Hardening), 6 (Content Modernization)

**File ownership** (Instance A may edit these freely):

```
# GitHub widget panels (Phase 2 bugs)
apps/web/src/widgets/github-login/
apps/web/src/widgets/github-pr/
apps/web/src/widgets/github-repos/
apps/web/src/widgets/github-sync/

# Code Preview (Phase 0 + Phase 2 Compare)
apps/web/src/widgets/code-preview/

# Diff panel
apps/web/src/widgets/diff-panel/

# Menu bar (Phase 3a: Build menu label)
apps/web/src/widgets/menu-bar/

# Templates & Learning (Phase 6: Content Modernization)
apps/web/src/features/templates/
apps/web/src/features/learning/
apps/web/src/widgets/template-gallery/
apps/web/src/widgets/scenario-gallery/
apps/web/src/widgets/learning-panel/

# AI features (Phase 5: graceful fallback)
apps/web/src/features/ai/

# Ops features (Phase 5: disable/stub)
apps/web/src/features/ops/
apps/web/src/widgets/ops-center/
apps/web/src/widgets/notification-center/
apps/web/src/widgets/promote-dialog/
apps/web/src/widgets/promote-history/
apps/web/src/widgets/rollback-dialog/

# Auth store (Phase 2: auth bugs)
apps/web/src/entities/store/authStore.ts
apps/web/src/entities/store/authStore.test.ts

# Code generation (Phase 6: Azure-only honesty)
apps/web/src/features/generate/

# Examples
examples/
```

### Instance B — Infrastructure, Persona & Quality

**Phases owned**: 3b (Persona System), 4 (Infrastructure), 7 (Test Coverage), 8 (Network)

**File ownership** (Instance B may edit these freely):

```
# Bottom panel (Phase 3b: persona-based visibility)
apps/web/src/widgets/bottom-panel/

# Onboarding (Phase 3b: persona selection, Phase 4: overlay)
apps/web/src/widgets/onboarding-tour/

# Resource bar
apps/web/src/widgets/resource-bar/

# Validation (Phase 7: placement fix, Phase 8: NSG/Firewall)
apps/web/src/entities/validation/

# Schema package (Phase 8: new resource types)
packages/schema/

# Domain package
packages/cloudblocks-domain/

# Store slices (Phase 7: tests)
apps/web/src/entities/store/slices/

# Provider adapters (Phase 7: tests)
apps/web/src/features/generate/providers/    # Exception: B owns provider tests, A owns codegen logic

# CI/CD workflows (Phase 4: deployment pipeline, perf gates)
.github/workflows/

# Configuration files (Phase 4: .env, runtime config)
apps/web/.env*
apps/api/.env*

# Test configuration
apps/web/vitest.config.ts

# Documentation (Phase 3c, 4)
docs/

# Release files (Phase 4: changelog, release ops)
CHANGELOG.md
CONTRIBUTING.md

# Block/Plate entities (Phase 8: network sprites if needed)
apps/web/src/entities/block/
apps/web/src/entities/plate/
apps/web/src/entities/connection/
```

---

## Shared Files — Coordination Required

These files may need edits from BOTH instances. Rules:

| File | Instance A edits | Instance B edits | Coordination |
|------|-----------------|-----------------|--------------|
| `uiStore.ts` | Phase 2 compare mode flags | Phase 3b persona state | **A goes first** on compare; B adds persona fields after |
| `architectureStore.ts` | Phase 6 migration helpers | Phase 7 tests, Phase 8 new actions | **Additive only** — append, don't reorder |
| `domainSlice.ts` | — | Phase 7 tests, Phase 8 mutations | B owns |
| `apps/web/src/shared/types/index.ts` | Phase 6 category names | Phase 8 new resource types | **Additive only** — append new exports |
| `apps/web/src/app/App.tsx` | Phase 5 feature flags | Phase 3b persona wrapper | **Sequential**: A first (feature flags), B second (persona) |
| `apps/web/src/app/App.css` | — | Phase 3b persona styles | B owns |
| `package.json` (root) | — | Version bump at release | B owns |
| `README.md` | — | Phase 4 updates | B owns |
| `AGENTS.md` | — | — | Neither edits (immutable during M20) |

### Conflict Prevention Rules

1. **Never edit the same file simultaneously**. If both need a file, coordinate by phase order.
2. **Additive-only pattern**: When both instances touch a shared file, use append-only edits (add new exports, new fields) — never reorder or restructure.
3. **Branch strategy**: Each instance works on its own branch. Merge A's branch first, then B rebases before merging.
4. **Store fields**: New Zustand state fields must use unique, non-overlapping names. No renamed existing fields.
5. **Test files**: Instance B owns all `*.test.ts` for store slices and validation. Instance A owns all `*.test.ts` for GitHub widgets.

---

## Execution Order

### Instance A — Recommended sequence

```
1. Phase 0: #886 (CodePreview state fix) — FIRST, unblocks Phase 2 Compare
2. Phase 2 Auth: #836, #838, #867 (parallel)
3. Phase 2 Repos: #840, #841, #883 (parallel)
4. Phase 2 PR: #842, #843, #857 (parallel)
5. Phase 2 Sync: #854, #858, #864 (parallel)
6. Phase 2 Compare: #872, #873 → #846, #847 → #876 (sequential)
7. Phase 3a: #1077, #1078, #1079, #1080 (parallel)
8. Phase 5: #1137 (block selection UI), #1138 (AI fallback), #1139 (Ops fallback) (parallel)
9. Phase 6: #1140 (templates) → #1141 (scenarios) → #1142 (legacy removal); #1143 (codegen), #1144 (examples)
```

### Instance B — Recommended sequence

```
1. Phase 3b: #1082, #1083 → #1084, #1085 (sequential)
2. Phase 3c: #1132 (docs, after #1083/#1084)
3. Phase 7: #1145 (placement bug), #1146 (domainSlice tests), #1147 (workspaceSlice tests), #1148 (provider tests), #1149 (AI tests), #1150 (vitest audit), #1151 (eslint audit) (parallel)
4. Phase 8: #1152 (NSG/Firewall split), #1153 (NAT Gateway UI), #1154 (PIP/NIC codegen) (parallel)
5. Phase 4 Pipeline: #465 → #466 → #467 (sequential)
6. Phase 4 Config: #468 → #469 (sequential)
7. Phase 4 Observability: #470 → #471 (sequential)
8. Phase 4 Performance: #472, #473, #474 (parallel)
9. Phase 4 Launch UX: #462, #463, #464 (parallel)
10. Phase 4 Release Ops: #475, #476, #477 (parallel)
11. Phase 2 Test: #1131 (LAST — after A completes all Phase 2 bugs)
```

### Sync Points

| Checkpoint | Trigger | Action |
|-----------|---------|--------|
| **Sync 1** | A completes Phase 0 (#886) | A merges to main, B rebases |
| **Sync 2** | A completes Phase 2 (all GitHub bugs) | A merges, B can start #1131 |
| **Sync 3** | B completes Phase 3b (#1083, #1084) | B merges, A can avoid persona conflicts |
| **Sync 4** | Both near completion | Final rebase, integration test, demo verification |

---

## Estimated Timeline (2 instances, parallel)

| Phase | Instance | Wall-clock Est. |
|-------|----------|-----------------|
| Phase 0 | A | 0.5h |
| Phase 2 | A | 3-4h |
| Phase 3a | A | 1h |
| Phase 3b+3c | B | 2-3h |
| Phase 4 | B | 3-4h |
| Phase 5 | A | 1-2h |
| Phase 6 | A | 1-2h |
| Phase 7 | B | 2-3h |
| Phase 8 | B | 1-2h |
| Integration + Demo | Both | 1h |
| **Total wall-clock** | | **~12-16h** |

> With two parallel instances, the bottleneck is Instance A's Phase 2 GitHub chain (~4h) and Instance B's Phase 4 Infrastructure (~4h). Everything else fills in around these.
