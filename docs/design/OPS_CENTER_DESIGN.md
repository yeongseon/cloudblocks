# Ops Control Center — Design Document

> Issue: #993 | Epic: #992 | Milestone: 18

## 1. Current Implementation Problems

The existing OpsCenter was implemented without a design phase. Key issues:

### Store Design
- **AGENTS.md violation**: `opsStore` is a new Zustand store, but the rule says "Do not create new stores without discussion." It should integrate with existing stores or have explicit justification.
- **Mock data hardcoded in store**: 200+ lines of mock data embedded directly in `opsStore.ts`, mixing data concerns with state management. No separation between data provider and store.
- **No error state per section**: `catch` blocks silently swallow errors with no UI feedback. Only `loading` flags exist.
- **`Promise.all` in `refreshAll`**: One failure kills all refreshes. Should use `Promise.allSettled`.
- **No stale-data protection**: Rapid open/close can cause race conditions where old data overwrites new.

### Component Design
- **No ARIA roles**: Tab bar uses `data-active` attribute but lacks `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`.
- **No Escape key handler**: Unlike ConfirmDialog/PromptDialog which were hardened in M17.
- **No focus management**: Panel doesn't capture focus on open.
- **Inline styles in `pipelineIcon`**: Uses `style={{ color }}` instead of CSS classes.
- **`$` hardcoded in CostsTab**: Ignores the `currency` field in `CostEstimate`.
- **Compare logic flawed**: Only checks `imageTag` match, ignores `commitSha` and `version` differences.
- **No tooltip for truncated text**: Commit messages are sliced but no `title` attribute on all truncated elements.
- **Placeholder pipeline URLs**: Links point to `cloudblocks/cloudblocks` instead of the real repo.

## 2. Information Architecture

### Panel Hierarchy
```
Ops Control Center (right overlay, 600px wide)
├── Header
│   ├── Title + icon
│   ├── Refresh All button (disabled while loading, per-section indicators)
│   └── Close button (×)
├── Tab Bar (4 tabs, ARIA tablist)
│   ├── Dashboard  — environment overview + quick pipelines
│   ├── Pipelines  — GitHub Actions workflow runs
│   ├── Deployments — deployment history log
│   └── Costs     — per-environment cost estimation
└── Tab Panel (ARIA tabpanel, scrollable)
```

### Dashboard Tab
```
┌─────────────────────────────────────────────┐
│ Environment Status                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ ● local  │ │ ● staging│ │ ● prod   │     │
│ │ healthy  │ │ healthy  │ │ healthy  │     │
│ │ —        │ │ 2h ago   │ │ 1d ago   │     │
│ │          │ │ sha-a1b2 │ │ sha-f7e8 │     │
│ └──────────┘ └──────────┘ └──────────┘     │
│                                             │
│ Compare: Staging ↔ Production               │
│ ⚠ Diverged — staging: sha-a1b2, prod: sha-f│
│ (checks imageTag + commitSha + version)     │
│                                             │
│ Recent Pipelines (3)                        │
│ ⟳ CI / Build & Test  feat/ops-center  3m   │
│ ✓ CI / Build & Test  main            1h    │
│ ✓ Deploy / Staging   main            1h    │
└─────────────────────────────────────────────┘
```

### Pipelines Tab
Each row: `[icon] name | branch badge | commit msg (truncated, title tooltip) | duration | Details link`

### Deployments Tab
Each row: `[env badge] image tag | commit msg | deployed by | time ago | status badge | duration`

### Costs Tab
Per-environment breakdown table with currency-aware formatting (`Intl.NumberFormat`).
Cross-currency total only if all estimates share the same currency.

## 3. Data Flow

```
┌─────────────────────────────────────┐
│ opsStore (Zustand)                  │
│                                     │
│ State:                              │
│   environments[]                    │
│   pipelineRuns[]                    │
│   deploymentHistory[]               │
│   costEstimates[]                   │
│   loading.environments              │
│   loading.pipelines                 │
│   loading.deployments               │
│   loading.costs                     │
│   error.environments: string|null   │  ← NEW: per-section errors
│   error.pipelines: string|null      │
│   error.deployments: string|null    │
│   error.costs: string|null          │
│   refreshSeq: number                │  ← NEW: stale-data guard
│                                     │
│ Actions:                            │
│   refreshAll() → Promise.allSettled │  ← FIX: not Promise.all
│   refreshEnvironments()             │
│   refreshPipelines()                │
│   refreshDeployments()              │
│   refreshCosts()                    │
│                                     │
│ Data Source:                        │
│   Currently: inline mock functions  │
│   Target: injected provider pattern │  ← NEW: separate mock from store
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ OpsCenter (Component)               │
│                                     │
│ - Subscribes to store via selectors │
│ - Each tab is a separate component  │
│ - Error states show message + retry │
│ - ARIA roles on tabs                │
│ - Escape to close, focus on open    │
└─────────────────────────────────────┘
```

## 4. Accessibility Requirements

| Element | ARIA | Keyboard |
|---------|------|----------|
| Tab bar | `role="tablist"` | Arrow keys to switch tabs |
| Tab button | `role="tab"`, `aria-selected` | Enter/Space to activate |
| Tab panel | `role="tabpanel"`, `aria-labelledby` | — |
| Panel | — | Escape to close |
| Close button | `aria-label="Close Ops Center"` | Auto-focus on open |
| Status dots | `aria-label="{env} is {status}"` | — |
| Pipeline links | `target="_blank" rel="noopener noreferrer"` | — |
| Truncated text | `title` attribute with full text | — |

## 5. Error Handling

Each section independently shows:
- **Loading**: "Loading {section}..." text
- **Error**: Error message + "Retry" button (calls individual refresh)
- **Empty**: "No data. Click Refresh to load."
- **Data**: Normal rendering

`refreshAll` uses `Promise.allSettled` — one section failing doesn't block others.

Sequence counter (`refreshSeq`) increments on each refresh call. Results are only applied if the counter hasn't advanced (prevents stale data from overwriting fresh data on rapid clicks).

## 6. Migration Path: Mock → Real API

Current: Mock data functions inline in `opsStore.ts`.

Target: Extract a `DataProvider` interface:
```typescript
interface OpsDataProvider {
  fetchEnvironments(): Promise<EnvironmentInfo[]>;
  fetchPipelines(): Promise<PipelineRun[]>;
  fetchDeployments(): Promise<DeploymentRecord[]>;
  fetchCosts(): Promise<CostEstimate[]>;
}
```

- `MockOpsProvider` for development (current mock data, extracted)
- `GitHubActionsOpsProvider` for real GitHub Actions API integration
- `AzureOpsProvider` for real Azure pricing API

Store actions call the provider, not hardcoded mock functions. Provider is injected at store creation or via a setter.

## 7. Store Justification

`opsStore` is a separate store (not in `uiStore` or `architectureStore`) because:
- Ops data is domain data (environments, pipelines, costs), not UI state
- It doesn't belong in `architectureStore` (which owns blocks/plates/connections)
- The data lifecycle is independent: fetched on demand, not persisted to localStorage
- It will eventually integrate with external APIs (GitHub Actions, Azure Pricing)

This should be documented in AGENTS.md as an accepted exception to the 3-store rule.
