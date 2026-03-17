# Milestone 7 — Collaboration + CI/CD Integration

## Status: Implemented ✅ (Shipped 2026-03-17)

### Implementation Notes
The shipped implementation is a focused subset of the original design:
- **DiffPanel** widget (simplified, single-file) instead of elaborate ArchitectureDiff + DiffSummary + DiffEntityList
- **CSS-based diff overlays** on BlockSprite/PlateSprite/ConnectionPath instead of ghost-layer rendering
- **MenuBar "Compare with GitHub"** button using existing `POST /pull` endpoint instead of new `architecture?ref=` endpoint
- **GitHub Actions template** in `examples/github-actions/` instead of in-app CI setup flow
- **No CollaborationPanel** — existing GitHub widgets (login, repos, sync, PR) suffice
- **No new backend endpoints** — all 5 proposed endpoints were deferred
- `jsondiffpatch` was NOT added — custom domain diff is sufficient

**Goal**: Team collaboration via Git and automated CI/CD pipelines.

**Dependencies**: Milestone 6B complete ✅, Milestone 5 (GitHub Integration) ✅

**Oracle Review**: Two independent reviews completed 2026-03-17. All critical feedback incorporated below.

---

## 1. Feature Overview

Milestone 7 adds three core capabilities:

| Feature | Description | User Value | Status |
|---------|-------------|------------|--------|
| **Architecture Diff** | DiffPanel + canvas overlays showing changes | See what changed vs GitHub | ✅ Shipped |
| **Auto Terraform Plan** | GitHub Actions template for `terraform plan` | Example CI/CD setup | ✅ Shipped (template only) |
| **Team Workspace Sharing** | Multiple users collaborate via GitHub | Git-based teamwork | ⏳ Deferred |


### What We Are NOT Building

- Real-time WebSocket collaboration (Git is the collaboration primitive)
- Custom Terraform runners (we use GitHub Actions)
- Permission management beyond GitHub's native permissions
- Conflict resolution UI (PRs handle merge conflicts)

### Key Architectural Constraints (from Oracle Review)

1. **FSD import direction is inviolable**: `entities/ → shared/` only. Diff types MUST live in `shared/types/diff.ts`, NOT `features/diff/types.ts`, because `uiStore` (entities layer) needs them.
2. **Diff is computed frontend-side only**: The backend provides raw architecture snapshots; the TypeScript diff engine computes deltas. No Python diff logic.
3. **Diff mode disables interactions**: When `diffMode === true`, drag/delete/connect/create are all disabled to prevent model mutation during comparison.
4. **Use actual component names**: The renderer uses `BlockSprite`, `PlateSprite`, `ConnectionPath` (sprite canvas), NOT the older `BlockModel`/`PlateModel` names.

---

## 2. Architecture Diff Visualization

### 2.1 Concept

When a user opens a PR or compares two commits, they see:
1. **Structural diff** — A tree-based view showing changed properties (added/removed/modified blocks, plates, connections)
2. **Visual canvas diff** — The canvas renders both states with color-coded overlays

### 2.2 Diff Engine

**Approach**: Custom ID-keyed domain diff with optional `jsondiffpatch` for deep property comparison inside matched entities. Both Oracle reviews recommended against using `jsondiffpatch` as the whole-model diff engine because the model is already stable-ID based and the output is a custom `DiffDelta` — a custom domain diff is simpler, more predictable, and avoids array-reorder noise.

The diff engine compares two `ArchitectureModel` objects and produces a structured delta:

```typescript
// Types file: apps/web/src/shared/types/diff.ts  (⚠️ MUST be in shared/, not features/)
// Reason: uiStore (entities layer) imports DiffDelta. entities → features is forbidden by FSD.

import type { Plate, Block, Connection, ExternalActor } from './index';

export interface EntityDiff<T> {
  added: T[];
  removed: T[];
  modified: Array<ModifiedEntity<T>>;
}

export interface ModifiedEntity<T> {
  id: string;
  before: T;          // Full snapshot of base state (Oracle: needed for ghost rendering)
  after: T;           // Full snapshot of head state
  changes: PropertyChange[];
}

export interface DiffDelta {
  plates: EntityDiff<Plate>;
  blocks: EntityDiff<Block>;
  connections: EntityDiff<Connection>;
  externalActors: EntityDiff<ExternalActor>;  // ⚠️ Was missing — ArchitectureModel includes this
  summary: {
    totalChanges: number;
    hasBreakingChanges: boolean;
  };
}

export interface PropertyChange {
  path: string;       // e.g., "position.x", "name", "category"
  oldValue: unknown;
  newValue: unknown;
}

// Diff state for visual rendering (consumed by BlockSprite, PlateSprite, ConnectionPath)
export type DiffState = 'added' | 'removed' | 'modified' | 'unchanged';
```

```typescript
// Engine file: apps/web/src/features/diff/engine.ts

import type { ArchitectureModel } from '../../shared/types';
import type { DiffDelta } from '../../shared/types/diff';

export function computeArchitectureDiff(
  base: ArchitectureModel,
  head: ArchitectureModel
): DiffDelta;
```

**Key design decisions**:
- Compare entities by stable `id` field (not array index)
- **Normalize before diffing**: Sort `plates`, `blocks`, `connections`, `externalActors` arrays by ID; sort `plate.children` arrays. Ignore volatile paths: `createdAt`, `updatedAt` (Oracle: these produce noise that isn't a real architecture change)
- **ID-keyed maps**: Build `Map<id, entity>` for base and head, then compute added (in head not base), removed (in base not head), modified (in both, with property diff)
- **Property-level diff**: For modified entities, deep-compare all fields except ignored paths. Use `jsondiffpatch` only as an optional helper for nested `metadata` objects if needed.
- Include `before`/`after` full snapshots on modified entities (needed for ghost rendering and detailed UI)
- Produce CloudBlocks-specific `DiffDelta` (not raw jsondiffpatch delta)

### 2.3 Structural Diff Panel (UI)

**Library**: Custom component using `DiffDelta` (not `react-json-view-compare` — too generic for our domain model)

```
┌──────────────────────────────────────────┐
│  Architecture Diff                   ✕   │
│──────────────────────────────────────────│
│  Summary: 3 changes (1 add, 1 remove,   │
│           1 modify)                      │
│──────────────────────────────────────────│
│  📦 Blocks                               │
│    + Added: Compute "worker-vm"          │
│    - Removed: Storage "old-blob"         │
│    ~ Modified: Database "main-db"        │
│       position: (2,0,3) → (4,0,3)       │
│       name: "main-db" → "primary-db"    │
│──────────────────────────────────────────│
│  🔗 Connections                          │
│    + Added: worker-vm → main-db          │
│──────────────────────────────────────────│
│  🏗️ Plates                              │
│    (no changes)                          │
└──────────────────────────────────────────┘
```

**FSD Location**: `apps/web/src/widgets/diff-panel/DiffPanel.tsx` *(shipped as simplified single-file widget)*

### 2.4 Visual Canvas Diff ("Ghost" Pattern)

On the sprite canvas, render diff state using the following visual vocabulary:

| Change Type | Visual Treatment |
|-------------|-----------------|
| **Added** | Green border glow (`#22C55E`), pulse animation |
| **Removed** | Red dashed border (`#DC2626`), opacity 0.3 ("ghost") |
| **Modified (position)** | Dotted line from old position to new position |
| **Modified (property)** | Yellow border highlight (`#FFB900`) |
| **Unchanged** | Normal rendering, slight opacity reduction (0.7) |

**Implementation**: `diffMode` state in `uiStore`. When active, `BlockSprite`, `PlateSprite`, and `ConnectionPath` read from the `DiffDelta` to apply CSS class-based overlays (`diff-added`, `diff-modified`, `diff-removed`). Ghost rendering was deferred — the shipped version uses CSS classes only, not an extra render layer.

**⚠️ Diff mode interaction lockdown** (Oracle): When `diffMode === true`, ALL of the following are disabled:
- Drag/move blocks and plates
- Delete blocks and plates
- Create new blocks, plates, connections
- Connect mode
- Undo/redo (operating on a snapshot, not live model)

This prevents accidental model mutation while comparing architectures.

```typescript
// In uiStore.ts — entities layer imports from shared/types/diff.ts (FSD-compliant)
import type { DiffDelta } from '../../shared/types/diff';
import type { ArchitectureModel } from '../../shared/types';

interface UIState {
  // ... existing fields ...
  diffMode: boolean;
  diffDelta: DiffDelta | null;
  diffBaseArchitecture: ArchitectureModel | null;
}
```

### 2.5 Diff Entry Points

Users trigger diff from:

1. **MenuBar** → "Compare with GitHub" button (shipped ✅)
2. **MenuBar** → "Diff View" toggle (shipped ✅)

**Shipped implementation**: The "Compare with GitHub" button uses the existing `POST /api/v1/workspaces/{id}/pull` endpoint to fetch the remote architecture, then computes the diff locally using `computeArchitectureDiff()`. No new backend endpoint was added. The `architecture?ref=` endpoint from the original design was deferred.

Escape key exits diff mode (handled in App.tsx).

---

## 3. GitHub Actions Integration (Auto Terraform Plan)

### 3.1 Concept

When a PR is created via CloudBlocks (using the existing `GitHubPR` widget), the system automatically:

1. Generates Terraform from the architecture in the PR
2. Commits a GitHub Actions workflow template to the repo (one-time setup)
3. The workflow runs `terraform plan` and posts results as a PR comment

**⚠️ Critical gap identified by Oracle**: The current PR flow only commits `cloudblocks/architecture.json`. But `terraform plan` runs against `infra/terraform/`, which would be stale unless the workflow also generates Terraform files from the architecture. Two approaches:

**Option A (Chosen)**: The CI workflow includes a Terraform generation step that reads `cloudblocks/architecture.json` and produces `.tf` files before running `plan`. This requires a lightweight CLI tool or script committed to the repo.

**Option B (Deferred)**: PR creation also commits generated Terraform files alongside `architecture.json`. Simpler but creates larger diffs and potential merge conflicts.

We choose **Option A** because it keeps the PR diff clean (only architecture changes) and ensures Terraform is always regenerated from source.

### 3.2 Workflow Template

CloudBlocks provides a workflow template that gets committed to the user's repo on first setup:

```yaml
# .github/workflows/cloudblocks-plan.yml
name: CloudBlocks Terraform Plan

on:
  pull_request:
    paths:
      - 'cloudblocks/architecture.json'
  workflow_dispatch:  # Oracle: allows manual reruns as secondary trigger

permissions:
  pull-requests: write
  contents: read

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Terraform from Architecture
        run: |
          # CloudBlocks CLI generates .tf files from architecture.json
          npx cloudblocks-codegen --input cloudblocks/architecture.json --output infra/terraform/
        # NOTE: cloudblocks-codegen is a lightweight CLI wrapper around
        # the same generate pipeline used in the frontend (features/generate/)

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: true

      - name: Terraform Init
        id: init
        run: terraform init
        working-directory: infra/terraform
        continue-on-error: true

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -input=false
        working-directory: infra/terraform
        continue-on-error: true

      - name: Post Plan to PR
        if: github.event_name == 'pull_request'
        uses: mshick/add-pr-comment@v2
        with:
          message: |
            ### CloudBlocks Terraform Plan

            #### Init: `${{ steps.init.outcome }}`
            #### Plan: `${{ steps.plan.outcome }}`

            <details>
            <summary>Plan Output</summary>

            ```
            ${{ steps.plan.outputs.stdout }}
            ```

            </details>

            *Pushed by CloudBlocks*
```

### 3.3 Workflow Setup Flow (Deferred)

**Shipped**: An example GitHub Actions workflow template is provided at `examples/github-actions/terraform-plan.yml` with documentation at `examples/github-actions/README.md`. Users manually copy this into their repo.

**Deferred**: The in-app "Enable CI/CD" button, automatic workflow commit, and `setup-cicd` endpoint were not implemented. The original design called for one-click setup, but the MVP provides a manual template approach instead.

### 3.4 Plan Status Tracking

> **⏳ Deferred**: Plan status tracking UI and the `checks` endpoint were not implemented in the shipped version. The design below is retained for future reference.

After a PR is created, CloudBlocks tracks the CI status:

**API endpoint** (new):
```
GET /api/v1/github/workspaces/{workspace_id}/pr/{pr_number}/checks
```

Returns:
```json
{
  "checks": [
    {
      "name": "CloudBlocks Terraform Plan",
      "status": "completed",
      "conclusion": "success",
      "details_url": "https://github.com/..."
    }
  ]
}
```

**Frontend**: The `GitHubPR` widget shows plan status after PR creation:

```
✅ Terraform Plan — Passed (click to see details)
```

or

```
❌ Terraform Plan — Failed (click to see details)
```

> **Note** (Oracle): Showing "2 to add, 0 to change, 0 to destroy" requires parsing plan output server-side. For MVP, show only pass/fail status with a link to the GitHub Actions run. Richer output can be added later by parsing the PR comment body.

---

## 4. Team Workspace Sharing

### 4.1 Concept

CloudBlocks uses Git as the collaboration primitive. Multiple team members share a project by:

1. Sharing a GitHub repository
2. Each member links the same repo in their CloudBlocks instance
3. Changes are made via branches and PRs
4. Architecture diff shows what each PR changes

### 4.2 Collaboration Flow

```
Member A: Design architecture → Sync to GitHub (default branch)
Member B: Pull from GitHub → See latest architecture → Create branch → Make changes → Create PR
Member A: See PR → View architecture diff → Approve → Merge
Member B: Pull merged changes
```

### 4.3 New UI: Collaboration Panel

> **⏳ Deferred**: The CollaborationPanel was not built. Existing GitHub widgets (github-login, github-repos, github-sync, github-pr) provide sufficient collaboration support for the current milestone. The design below is retained for future reference.

**FSD Location**: `apps/web/src/widgets/collaboration/CollaborationPanel.tsx`

```
┌──────────────────────────────────────────┐
│  Team                                ✕   │
│──────────────────────────────────────────│
│  Repository: yeongseon/my-infra          │
│  Branch: main                            │
│  Last sync: 2 minutes ago                │
│──────────────────────────────────────────│
│  Open Pull Requests                      │
│  ┌────────────────────────────────────┐  │
│  │ #42 Add worker VMs       [Diff]   │  │
│  │ by octocat · 3 hours ago          │  │
│  │ ✅ Terraform Plan passed          │  │
│  ├────────────────────────────────────┤  │
│  │ #41 Update DB config     [Diff]   │  │
│  │ by alice · 1 day ago              │  │
│  │ ❌ Terraform Plan failed          │  │
│  └────────────────────────────────────┘  │
│──────────────────────────────────────────│
│  [Sync] [Pull] [Create PR] [Enable CI]  │
└──────────────────────────────────────────┘
```

### 4.4 New API Endpoints

> **⏳ Deferred**: None of the 5 proposed endpoints were implemented. The existing endpoints (`POST /sync`, `POST /pull`, `POST /pr`, `GET /commits`) handle the shipped diff and CI functionality. The endpoints below are retained for future reference.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workspaces/{id}/architecture?ref={ref}` | GET | Fetch architecture JSON at a Git ref (branch, SHA, PR head) |
| `/workspaces/{id}/prs` | GET | List open PRs for workspace repo |
| `/workspaces/{id}/prs/{number}/checks` | GET | Get CI check status for a PR |
| `/workspaces/{id}/setup-cicd` | POST | Commit workflow template to repo |
| `/workspaces/{id}/branches` | GET | List branches |

> **Design note** (Oracle): The original spec had `GET /prs/{number}/diff` which would compute diff server-side. Removed — diff is computed frontend-side using `computeArchitectureDiff()`. The generic `architecture?ref=` endpoint serves all three diff entry points (PR, commit, remote compare).

---

## 5. Technical Design

### 5.1 New Dependencies

| Package | Purpose | Size | Weekly Downloads |
|---------|---------|------|-----------------|
| `jsondiffpatch` | Deep property diff for nested metadata (optional helper) | ~38kB | ~350k |

The core diff logic is a custom ID-keyed domain diff. `jsondiffpatch` is used only as an optional helper for deep property comparison inside matched entities' `metadata` objects. If the metadata diffing proves simple enough, this dependency can be dropped entirely.

### 5.2 File Structure (New Files)

```
apps/web/src/
├── shared/
│   └── types/
│       └── diff.ts                # ⚠️ DiffDelta, PropertyChange, DiffState types
│                                  # MUST be in shared/ (FSD: entities imports shared)
├── features/
│   └── diff/
│       ├── engine.ts              # computeArchitectureDiff() implementation
│       └── engine.test.ts         # Diff engine tests
├── widgets/
│   ├── architecture-diff/
│   │   ├── ArchitectureDiff.tsx   # Structural diff panel
│   │   ├── ArchitectureDiff.css
│   │   ├── DiffSummary.tsx        # Summary header
│   │   ├── DiffEntityList.tsx     # Entity change list
│   │   └── ArchitectureDiff.test.tsx
│   └── collaboration/
│       ├── CollaborationPanel.tsx  # Team panel (consolidates sync/PR)
│       ├── CollaborationPanel.css
│       ├── PullRequestList.tsx    # Open PR list
│       ├── CISetup.tsx            # CI/CD setup wizard
│       └── CollaborationPanel.test.tsx

apps/api/app/
├── api/routes/
│   └── github.py                  # Add: setup-cicd, prs, architecture-at-ref, pr checks
```

**Shipped file structure** (differs from above):
```
apps/web/src/
├── shared/types/
│   ├── diff.ts                    # ✅ Shipped as designed
│   └── api.ts                     # ✅ Shipped (PrInfo, CheckInfo types)
├── features/diff/
│   ├── engine.ts                  # ✅ Shipped as designed
│   └── engine.test.ts             # ✅ Shipped (16 tests)
├── widgets/diff-panel/
│   ├── DiffPanel.tsx              # ✅ Simplified single-file widget
│   ├── DiffPanel.css              # ✅ Shipped
│   └── DiffPanel.test.tsx         # ✅ Shipped (8 tests)
├── entities/block/BlockSprite.tsx  # ✅ Diff overlay CSS classes added
├── entities/plate/PlateSprite.tsx  # ✅ Diff overlay CSS classes added
├── entities/connection/ConnectionPath.tsx  # ✅ Diff-aware colors added
├── widgets/menu-bar/MenuBar.tsx   # ✅ Compare with GitHub + Diff View items
└── app/App.tsx                    # ✅ DiffPanel lazy import + Escape handler

examples/github-actions/
├── terraform-plan.yml             # ✅ Shipped (example template)
└── README.md                      # ✅ Shipped (usage guide)
```
- `widgets/architecture-diff/` — NOT built (DiffPanel replaces it)
- `widgets/collaboration/` — NOT built (deferred)
- Backend `github.py` — NO new endpoints added

### 5.3 Modified Files

| File | Change |
|------|--------|
| `shared/types/diff.ts` | **NEW** — `DiffDelta`, `EntityDiff`, `PropertyChange`, `DiffState` types |
| `shared/types/api.ts` | Add `PrInfo`, `CheckInfo`, `ArchitectureAtRefResponse` types |
| `shared/types/index.ts` | Extend `Workspace` with optional `repoOwner`, `repoName`, `branch`, `lastSyncAt` fields |
| `entities/store/uiStore.ts` | Add `diffMode`, `diffDelta`, `diffBaseArchitecture`, `showCollaboration`, `setDiffMode`, `toggleCollaboration` |
| `widgets/scene-canvas/SceneCanvas.tsx` | Render ghost entities from `diffBaseArchitecture`; add diff overlay layer |
| `entities/block/BlockSprite.tsx` | Read `diffMode` + render ghost/highlight overlays via CSS/SVG |
| `entities/plate/PlateSprite.tsx` | Read `diffMode` + render ghost/highlight overlays via CSS/SVG |
| `entities/connection/ConnectionPath.tsx` | Read `diffMode` + render added/removed styles |
| `widgets/menu-bar/MenuBar.tsx` | Add "Team" menu with collaboration panel toggle |
| `apps/api/app/api/routes/github.py` | Add 5 new endpoints |
| `apps/api/app/infrastructure/github_service.py` | Add `list_prs`, `get_architecture_at_ref`, `get_check_runs` methods |

> **Workspace metadata** (Oracle): The current `Workspace` type in `shared/types/index.ts` has no repo/branch fields. `GitHubSync` keeps linkage in local component state. Before building the collaboration panel, workspace metadata must be promoted to the store.

### 5.4 Store Changes

```typescript
// uiStore.ts additions
import type { DiffDelta } from '../../shared/types/diff';  // ✅ FSD-compliant: entities → shared
import type { ArchitectureModel } from '../../shared/types';

interface UIState {
  // ... existing fields ...

  // Diff mode
  diffMode: boolean;
  diffDelta: DiffDelta | null;
  diffBaseArchitecture: ArchitectureModel | null;
  setDiffMode: (mode: boolean, delta?: DiffDelta | null, base?: ArchitectureModel | null) => void;

  // Collaboration panel
  showCollaboration: boolean;
  toggleCollaboration: () => void;
}
```

```typescript
// Workspace type extension (shared/types/index.ts)
export interface Workspace {
  id: string;
  name: string;
  architecture: ArchitectureModel;
  createdAt: string;
  updatedAt: string;
  // New fields for GitHub integration (optional for backward compat)
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  lastSyncAt?: string;
}
```

---

## 6. Implementation Plan (Original Design — see §5.2 for shipped files)

> **Note**: The shipped implementation followed a simplified 3-task approach instead of the 5-phase plan below. See Implementation Notes at top of document for what was actually built.

> **Phase ordering** (Oracle)
: Original plan had Phase 4 adding a CI button to `CollaborationPanel` before that widget existed in Phase 5. Reordered to: foundation types/workspace metadata → diff engine → diff UI → collaboration panel (with CI) → visual canvas diff.

### Phase 1: Foundation (Types + Workspace Metadata)

| # | Task | Effort | Files |
|---|------|--------|-------|
| 1.1 | Create `shared/types/diff.ts` with `DiffDelta`, `EntityDiff`, `PropertyChange`, `DiffState` | Low | `shared/types/diff.ts` |
| 1.2 | Extend `Workspace` type with repo/branch metadata fields | Low | `shared/types/index.ts` |
| 1.3 | Add `diffMode`, `diffDelta`, `diffBaseArchitecture`, `showCollaboration` to `uiStore` | Low | `entities/store/uiStore.ts` |
| 1.4 | Add new API response types (`PrInfo`, `CheckInfo`, etc.) | Low | `shared/types/api.ts` |
| 1.5 | Write uiStore diff mode tests | Low | `entities/store/uiStore.test.ts` |

**Exit criteria**: All types compile. uiStore correctly manages diff mode state. Workspace type supports repo metadata. No FSD violations.

### Phase 2: Diff Engine

| # | Task | Effort | Files |
|---|------|--------|-------|
| 2.1 | Implement `computeArchitectureDiff()` with ID-keyed normalization | Medium | `features/diff/engine.ts` |
| 2.2 | Write comprehensive diff engine tests | Medium | `features/diff/engine.test.ts` |
| 2.3 | Add `jsondiffpatch` dependency (if needed for metadata diff) | Trivial | `package.json` |

**Exit criteria**: `computeArchitectureDiff(base, head)` correctly identifies all added/removed/modified entities (plates, blocks, connections, externalActors) with property-level changes. Normalizes away volatile fields. Before/after snapshots included. 95%+ test coverage.

### Phase 3: Diff UI (Structural Panel)

| # | Task | Effort | Files |
|---|------|--------|-------|
| 3.1 | Build `ArchitectureDiff` panel component | Medium | `widgets/architecture-diff/` |
| 3.2 | Build `DiffSummary` and `DiffEntityList` sub-components | Medium | `widgets/architecture-diff/` |
| 3.3 | Add "Compare" button to GitHub Sync panel | Low | `widgets/github-sync/GitHubSync.tsx` |
| 3.4 | Add `architecture?ref=` backend endpoint | Medium | `api/routes/github.py`, `github_service.py` |
| 3.5 | Write panel tests | Medium | `ArchitectureDiff.test.tsx` |

**Exit criteria**: Users can see structural diff between current architecture and a fetched version. Panel shows added/removed/modified entities with property details.

### Phase 4: Collaboration Panel + CI/CD

| # | Task | Effort | Files |
|---|------|--------|-------|
| 4.1 | Build `CollaborationPanel` (unified team view) | Medium | `widgets/collaboration/` |
| 4.2 | Build `PullRequestList` component | Medium | `widgets/collaboration/PullRequestList.tsx` |
| 4.3 | Build `CISetup` component | Low | `widgets/collaboration/CISetup.tsx` |
| 4.4 | Create workflow template string constant | Low | `features/cicd/workflow-template.ts` |
| 4.5 | Add backend endpoints: `setup-cicd`, `prs`, `prs/{n}/checks`, `branches` | Medium | `api/routes/github.py`, `github_service.py` |
| 4.6 | Show plan status in PR creation flow | Medium | `widgets/github-pr/GitHubPR.tsx` |
| 4.7 | Add "Team" menu to MenuBar | Low | `widgets/menu-bar/MenuBar.tsx` |
| 4.8 | Migrate workspace repo state from GitHubSync local state to store | Medium | `GitHubSync.tsx`, `architectureStore.ts` |
| 4.9 | Write collaboration panel + backend tests | Medium | `CollaborationPanel.test.tsx`, `tests/` |

**Exit criteria**: Users can see open PRs, view architecture diffs for each PR, check CI status, one-click CI setup, and manage team collaboration from a single panel. Existing GitHubSync/GitHubPR widgets still work (gradual deprecation).

### Phase 5: Visual Canvas Diff

| # | Task | Effort | Files |
|---|------|--------|-------|
| 5.1 | Add diff visual state to `BlockSprite` | Medium | `entities/block/BlockSprite.tsx` |
| 5.2 | Add diff visual state to `PlateSprite` | Medium | `entities/plate/PlateSprite.tsx` |
| 5.3 | Add diff visual state to `ConnectionPath` | Low | `entities/connection/ConnectionPath.tsx` |
| 5.4 | Render ghost entities from `diffBaseArchitecture` | Medium | `widgets/scene-canvas/SceneCanvas.tsx` |
| 5.5 | Disable interactions in diff mode | Low | `uiStore.ts`, interaction handlers |
| 5.6 | Write visual diff tests | Medium | BlockSprite/PlateSprite/ConnectionPath test files |

**Exit criteria**: Canvas renders diff overlays correctly — green for added, red ghost for removed, yellow for modified. Ghost entities rendered from `diffBaseArchitecture`. All interactions disabled in diff mode.

---

## 7. Exit Criteria (from ROADMAP.md)

| Criterion | Verification | Status |
|-----------|-------------|--------|
| Architecture diff visualization works | DiffPanel shows structural diff. Canvas renders CSS-based overlays (added/modified/removed). | ✅ Shipped |
| GitHub Actions template provided | Example `terraform-plan.yml` in `examples/github-actions/` with README. | ✅ Shipped |
| Compare with GitHub flow works | MenuBar → Compare with GitHub fetches remote and shows diff. | ✅ Shipped |
| Ghost rendering on canvas | Extra render layer for removed entities | ⏳ Deferred |
| One-click CI setup | In-app "Enable CI/CD" button commits workflow to repo | ⏳ Deferred |
| Team workspace sharing | CollaborationPanel with PR list and CI status | ⏳ Deferred |
| 5 new backend endpoints | architecture?ref=, prs, checks, setup-cicd, branches | ⏳ Deferred |

---

## 8. Testing Strategy

| Layer | Coverage Target | Approach |
|-------|----------------|----------|
| Diff engine | 95%+ | Unit tests with edge cases (empty models, reordered arrays, nested changes) |
| Diff UI | 90%+ | RTL component tests with mock DiffDelta |
| Visual diff | 80%+ | Unit tests for diff state derivation (visual rendering tested manually) |
| Backend endpoints | 90%+ | pytest with mocked GitHubService |
| Collaboration panel | 90%+ | RTL component tests with mock API responses |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `jsondiffpatch` bundle size (38kB) | Minor bundle increase | May be dropped if custom deep diff suffices for metadata |
| GitHub API rate limits (5000/hr) | Heavy collaboration could hit limits | Debounce diff requests, cache architecture snapshots |
| Terraform plan requires provider credentials | Users must configure secrets in their repo | Document setup clearly; plan step is `continue-on-error: true` |
| Large architecture models slow diff | UX degradation | Diff engine operates on ID-indexed maps (O(n), not O(n²)) |
| PR-based collaboration unfamiliar to non-devs | Low adoption | Learning Mode could add a collaboration tutorial (Milestone 6C extension) |
| **Protected default branches block CI setup** (Oracle) | One-click setup fails | Fall back to manual setup guide with copy-paste YAML |
| **GitHub auth token limitations** (Oracle) | All collaboration endpoints inherit current token-passing limitation | Document that GitHub token must be provided; fix token storage in future |
| **Terraform generation in CI** (Oracle) | Plan runs against stale `.tf` files | Workflow includes codegen step before `terraform plan` |
| **Array reorder noise in diff** (Oracle) | False positives in diff output | Normalize/sort arrays by ID before diffing; ignore `createdAt`/`updatedAt` |
| **`architecture.json` format disagreement** (Oracle) | Storage doc vs API route disagree on format | Settle canonical format before building diff parsing |

---

## 10. Non-Goals (Deferred)

| Feature | Reason | When |
|---------|--------|------|
| Real-time cursor sharing | Requires WebSocket infra | Milestone 10+ |
| Merge conflict resolution UI | Git handles this | Maybe never |
| Multi-cloud diff (AWS vs Azure) | Requires Milestone 8 first | After Milestone 8 |
| Custom CI runners | Complexity, security | Out of scope |
| Branch switching in UI | Complexity | Milestone 8+ |
