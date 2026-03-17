# Milestone 7 — Collaboration + CI/CD Integration

## Status: Design Phase

**Goal**: Team collaboration via Git and automated CI/CD pipelines.

**Dependencies**: Milestone 6B complete ✅, Milestone 5 (GitHub Integration) ✅

---

## 1. Feature Overview

Milestone 7 adds three core capabilities:

| Feature | Description | User Value |
|---------|-------------|------------|
| **Architecture Diff** | Side-by-side visual comparison of two architecture versions | See exactly what changed between commits/branches |
| **Auto Terraform Plan** | GitHub Actions runs `terraform plan` on architecture PRs automatically | Catch infra issues before merge |
| **Team Workspace Sharing** | Multiple users collaborate on the same project via GitHub | Git-based teamwork without WebSockets |

### What We Are NOT Building

- Real-time WebSocket collaboration (Git is the collaboration primitive)
- Custom Terraform runners (we use GitHub Actions)
- Permission management beyond GitHub's native permissions
- Conflict resolution UI (PRs handle merge conflicts)

---

## 2. Architecture Diff Visualization

### 2.1 Concept

When a user opens a PR or compares two commits, they see:
1. **Structural diff** — A tree-based view showing changed properties (added/removed/modified blocks, plates, connections)
2. **Visual canvas diff** — The canvas renders both states with color-coded overlays

### 2.2 Diff Engine

**Library**: `jsondiffpatch` (350k weekly downloads, industry standard)

The diff engine compares two `ArchitectureModel` objects and produces a structured delta:

```typescript
// New file: apps/web/src/features/diff/engine.ts

import type { ArchitectureModel } from '../../shared/types';

export interface DiffDelta {
  plates: {
    added: Plate[];
    removed: Plate[];
    modified: Array<{ id: string; changes: PropertyChange[] }>;
  };
  blocks: {
    added: Block[];
    removed: Block[];
    modified: Array<{ id: string; changes: PropertyChange[] }>;
  };
  connections: {
    added: Connection[];
    removed: Connection[];
    modified: Array<{ id: string; changes: PropertyChange[] }>;
  };
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

export function computeArchitectureDiff(
  base: ArchitectureModel,
  head: ArchitectureModel
): DiffDelta;
```

**Key design decisions**:
- Compare entities by stable `id` field (not array index)
- Use `jsondiffpatch` with `objectHash` config that matches by entity ID
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

**FSD Location**: `apps/web/src/widgets/architecture-diff/ArchitectureDiff.tsx`

### 2.4 Visual Canvas Diff ("Ghost" Pattern)

On the 3D canvas, render diff state using the following visual vocabulary:

| Change Type | Visual Treatment |
|-------------|-----------------|
| **Added** | Green border glow (`#22C55E`), pulse animation |
| **Removed** | Red dashed border (`#DC2626`), opacity 0.3 ("ghost") |
| **Modified (position)** | Dotted line from old position to new position |
| **Modified (property)** | Yellow border highlight (`#FFB900`) |
| **Unchanged** | Normal rendering, slight opacity reduction (0.7) |

**Implementation**: Add a `diffMode` state to `uiStore`. When active, `BlockModel` and `PlateModel` read from the `DiffDelta` to determine their visual state.

```typescript
// In uiStore.ts
interface UIState {
  // ... existing fields ...
  diffMode: boolean;
  diffDelta: DiffDelta | null;
  diffBaseArchitecture: ArchitectureModel | null;
}
```

### 2.5 Diff Entry Points

Users can trigger diff from:

1. **GitHub Sync panel** → "Compare with remote" button
2. **PR creation** → Auto-show diff before creating PR
3. **Commit history** → Click any commit to compare with current

---

## 3. GitHub Actions Integration (Auto Terraform Plan)

### 3.1 Concept

When a PR is created via CloudBlocks (using the existing `GitHubPR` widget), the system automatically:

1. Generates Terraform from the architecture in the PR
2. Commits a GitHub Actions workflow template to the repo (one-time setup)
3. The workflow runs `terraform plan` and posts results as a PR comment

### 3.2 Workflow Template

CloudBlocks provides a workflow template that gets committed to the user's repo on first setup:

```yaml
# .github/workflows/cloudblocks-plan.yml
name: CloudBlocks Terraform Plan

on:
  pull_request:
    paths:
      - 'cloudblocks/architecture.json'

permissions:
  pull-requests: write
  contents: read

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

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

### 3.3 Workflow Setup Flow

**One-time setup** per repository:

1. User clicks "Enable CI/CD" in the GitHub Sync panel
2. CloudBlocks checks if `.github/workflows/cloudblocks-plan.yml` exists in the repo
3. If not, commits the workflow template to the default branch
4. Shows confirmation: "Terraform plan will now run automatically on architecture PRs"

**API endpoint** (new):
```
POST /api/v1/github/workspaces/{workspace_id}/setup-cicd
```

### 3.4 Plan Status Tracking

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
✅ Terraform Plan — 2 to add, 0 to change, 0 to destroy
```

or

```
❌ Terraform Plan — Failed (click to see details)
```

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

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workspaces/{id}/prs` | GET | List open PRs for workspace repo |
| `/workspaces/{id}/prs/{number}/diff` | GET | Get architecture diff for a PR |
| `/workspaces/{id}/prs/{number}/checks` | GET | Get CI check status for a PR |
| `/workspaces/{id}/setup-cicd` | POST | Commit workflow template to repo |
| `/workspaces/{id}/branches` | GET | List branches |

---

## 5. Technical Design

### 5.1 New Dependencies

| Package | Purpose | Size | Weekly Downloads |
|---------|---------|------|-----------------|
| `jsondiffpatch` | Architecture model diff | ~38kB | ~350k |

No other new dependencies needed. All UI is custom-built using existing React components.

### 5.2 File Structure (New Files)

```
apps/web/src/
├── features/
│   └── diff/
│       ├── engine.ts              # DiffDelta computation
│       ├── engine.test.ts         # Diff engine tests
│       └── types.ts               # DiffDelta, PropertyChange types
├── widgets/
│   ├── architecture-diff/
│   │   ├── ArchitectureDiff.tsx   # Structural diff panel
│   │   ├── ArchitectureDiff.css
│   │   ├── DiffSummary.tsx        # Summary header
│   │   ├── DiffEntityList.tsx     # Entity change list
│   │   └── ArchitectureDiff.test.tsx
│   └── collaboration/
│       ├── CollaborationPanel.tsx  # Team panel (replaces separate sync/PR widgets)
│       ├── CollaborationPanel.css
│       ├── PullRequestList.tsx    # Open PR list
│       ├── CISetup.tsx            # CI/CD setup wizard
│       └── CollaborationPanel.test.tsx
├── shared/
│   └── types/
│       └── api.ts                 # New API response types (PrListResponse, etc.)
├── entities/
│   └── store/
│       └── uiStore.ts             # Add diffMode, diffDelta fields

apps/api/app/
├── api/routes/
│   └── github.py                  # Add: setup-cicd, prs, pr checks endpoints
```

### 5.3 Modified Files

| File | Change |
|------|--------|
| `entities/store/uiStore.ts` | Add `diffMode`, `diffDelta`, `diffBaseArchitecture`, `showCollaboration` |
| `entities/block/BlockModel.tsx` | Read `diffMode` + render ghost/highlight overlays |
| `entities/plate/PlateModel.tsx` | Read `diffMode` + render ghost/highlight overlays |
| `entities/connection/ConnectionLine.tsx` | Read `diffMode` + render added/removed styles |
| `widgets/menu-bar/MenuBar.tsx` | Add "Team" menu with collaboration panel toggle |
| `shared/types/api.ts` | Add `PrInfo`, `CheckInfo`, `DiffResponse` types |
| `apps/api/app/api/routes/github.py` | Add 5 new endpoints |
| `apps/api/app/infrastructure/github_service.py` | Add `list_prs`, `get_pr_files`, `get_check_runs` methods |

### 5.4 Store Changes

```typescript
// uiStore.ts additions
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

---

## 6. Implementation Plan

### Phase 1: Diff Engine (Backend-agnostic)

| # | Task | Effort | Files |
|---|------|--------|-------|
| 1.1 | Add `jsondiffpatch` dependency | Trivial | `package.json` |
| 1.2 | Create diff types (`DiffDelta`, `PropertyChange`) | Low | `features/diff/types.ts` |
| 1.3 | Implement `computeArchitectureDiff()` | Medium | `features/diff/engine.ts` |
| 1.4 | Write comprehensive diff engine tests | Medium | `features/diff/engine.test.ts` |

**Exit criteria**: `computeArchitectureDiff(base, head)` correctly identifies all added/removed/modified entities with property-level changes. 95%+ test coverage.

### Phase 2: Diff UI (Structural Panel)

| # | Task | Effort | Files |
|---|------|--------|-------|
| 2.1 | Add `diffMode` + `showArchitectureDiff` to `uiStore` | Low | `uiStore.ts` |
| 2.2 | Build `ArchitectureDiff` panel component | Medium | `widgets/architecture-diff/` |
| 2.3 | Build `DiffSummary` and `DiffEntityList` sub-components | Medium | `widgets/architecture-diff/` |
| 2.4 | Add "Compare" button to GitHub Sync panel | Low | `widgets/github-sync/GitHubSync.tsx` |
| 2.5 | Write panel tests | Medium | `ArchitectureDiff.test.tsx` |

**Exit criteria**: Users can see structural diff between current architecture and a fetched version. Panel shows added/removed/modified entities with property details.

### Phase 3: Visual Canvas Diff

| # | Task | Effort | Files |
|---|------|--------|-------|
| 3.1 | Add diff visual state to `BlockModel` | Medium | `entities/block/BlockModel.tsx` |
| 3.2 | Add diff visual state to `PlateModel` | Medium | `entities/plate/PlateModel.tsx` |
| 3.3 | Add diff visual state to `ConnectionLine` | Low | `entities/connection/ConnectionLine.tsx` |
| 3.4 | Render "ghost" entities (removed items) | Medium | `widgets/scene-canvas/SceneCanvas.tsx` |
| 3.5 | Write visual diff tests | Medium | Block/Plate/Connection test files |

**Exit criteria**: Canvas renders diff overlays correctly — green for added, red ghost for removed, yellow for modified. Ghost entities rendered from `diffBaseArchitecture`.

### Phase 4: CI/CD Integration

| # | Task | Effort | Files |
|---|------|--------|-------|
| 4.1 | Create workflow template string constant | Low | `features/cicd/workflow-template.ts` |
| 4.2 | Add `setup-cicd` API endpoint (backend) | Medium | `api/routes/github.py` |
| 4.3 | Add `get_check_runs` to GitHubService | Low | `infrastructure/github_service.py` |
| 4.4 | Add PR checks API endpoint (backend) | Low | `api/routes/github.py` |
| 4.5 | Add CI setup button to Collaboration panel | Low | `widgets/collaboration/CISetup.tsx` |
| 4.6 | Show plan status after PR creation | Medium | `widgets/github-pr/GitHubPR.tsx` |
| 4.7 | Write backend tests for new endpoints | Medium | `tests/` |

**Exit criteria**: One-click CI setup commits workflow template. PR creation shows terraform plan status. Backend tests pass.

### Phase 5: Collaboration Panel

| # | Task | Effort | Files |
|---|------|--------|-------|
| 5.1 | Build `CollaborationPanel` (unified team view) | Medium | `widgets/collaboration/` |
| 5.2 | Add PR list endpoint (backend) | Low | `api/routes/github.py` |
| 5.3 | Add PR diff endpoint (backend) | Medium | `api/routes/github.py` |
| 5.4 | Build `PullRequestList` component | Medium | `widgets/collaboration/PullRequestList.tsx` |
| 5.5 | Add "Team" menu to MenuBar | Low | `widgets/menu-bar/MenuBar.tsx` |
| 5.6 | Add new API types | Low | `shared/types/api.ts` |
| 5.7 | Write collaboration panel tests | Medium | `CollaborationPanel.test.tsx` |
| 5.8 | Integration testing (full flow) | High | End-to-end test |

**Exit criteria**: Users can see open PRs, view architecture diffs for each PR, check CI status, and manage team collaboration from a single panel.

---

## 7. Exit Criteria (from ROADMAP.md)

| Criterion | Verification |
|-----------|-------------|
| Architecture diff visualization works | Structural panel shows correct diff for any two architecture versions. Canvas renders ghost/highlight overlays. |
| GitHub Actions auto-plan runs on architecture PRs | One-click CI setup. `terraform plan` runs automatically. Results posted as PR comment. |
| Team members can collaborate on the same project via GitHub | Multiple users link same repo. PR-based workflow functional. Diff visible per PR. |

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
| `jsondiffpatch` bundle size (38kB) | Minor bundle increase | Acceptable — it's the only new dependency |
| GitHub API rate limits (5000/hr) | Heavy collaboration could hit limits | Debounce diff requests, cache results |
| Terraform plan requires provider credentials | Users must configure secrets in their repo | Document setup clearly; plan step is `continue-on-error: true` |
| Large architecture models slow diff | UX degradation | Diff engine operates on ID-indexed maps (O(n), not O(n²)) |
| PR-based collaboration unfamiliar to non-devs | Low adoption | Learning Mode could add a collaboration tutorial (Milestone 6C extension) |

---

## 10. Non-Goals (Deferred)

| Feature | Reason | When |
|---------|--------|------|
| Real-time cursor sharing | Requires WebSocket infra | Milestone 10+ |
| Merge conflict resolution UI | Git handles this | Maybe never |
| Multi-cloud diff (AWS vs Azure) | Requires Milestone 8 first | After Milestone 8 |
| Custom CI runners | Complexity, security | Out of scope |
| Branch switching in UI | Complexity | Milestone 8+ |
