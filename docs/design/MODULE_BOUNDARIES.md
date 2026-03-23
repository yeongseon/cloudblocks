# Module Boundary Rules — Architecture Store Decomposition

> Covers issue #26.

This document defines the module boundaries, allowed dependencies, and architectural constraints for the Zustand architecture store after its decomposition into focused slices.

---

## 1. Store Architecture

The architecture store (`apps/web/src/entities/store/architectureStore.ts`) is composed from 5 focused slices using Zustand's slice pattern:

```
architectureStore.ts          # Thin composition (creates store, subscribes to auto-validation)
└── slices/
    ├── types.ts              # Shared ArchitectureState interface
    ├── helpers.ts            # Shared helper utilities (pushHistory, etc.)
    ├── domainSlice.ts        # Plate/Block/Connection CRUD
    ├── historySlice.ts       # Undo/Redo
    ├── persistenceSlice.ts   # Save/Load/Import/Export
    ├── validationSlice.ts    # Run validation
    ├── workspaceSlice.ts     # Multi-workspace management
    └── index.ts              # Barrel export
```

---

## 2. Slice Responsibilities

| Slice                | Responsibility                       | State Owned                | Key Actions                                                                                                                                   |
| -------------------- | ------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **domainSlice**      | Plate, block, and connection CRUD    | `workspace.architecture.*` | `addPlate`, `removePlate`, `addBlock`, `removeBlock`, `moveBlock`, `addConnection`, `removeConnection`, `updateBlockName`, `moveBlockToPlate` |
| **historySlice**     | Undo/redo state management           | `history`, `historyIndex`  | `undo`, `redo`, `pushHistory`                                                                                                                 |
| **persistenceSlice** | Local storage and JSON import/export | (side effects only)        | `save`, `load`, `exportArchitecture`, `importArchitecture`                                                                                    |
| **validationSlice**  | Architecture validation              | `validationResult`         | `validate`                                                                                                                                    |
| **workspaceSlice**   | Multi-workspace lifecycle            | `workspace`, `workspaces`  | `createWorkspace`, `switchWorkspace`, `deleteWorkspace`, `cloneWorkspace`, `listWorkspaces`, `updateWorkspaceName`, `linkGitHubRepo`          |

---

## 3. Dependency Rules

### Allowed Dependencies (DAG — No Cycles)

```
workspaceSlice ──→ (none)
domainSlice    ──→ helpers (pushHistory)
historySlice   ──→ (none)
persistenceSlice ──→ (none, reads full state via get())
validationSlice ──→ (none, reads architecture via get())
```

### External Dependencies

| Slice                | Allowed External Imports                                        |
| -------------------- | --------------------------------------------------------------- |
| **domainSlice**      | `shared/utils/id` (generateId)                                  |
| **historySlice**     | `shared/utils/history` (createHistoryEntry, restoreFromHistory) |
| **persistenceSlice** | `shared/utils/storage` (saveWorkspaces, loadWorkspaces)         |
| **validationSlice**  | `entities/validation/engine` (validateArchitecture)             |
| **workspaceSlice**   | `shared/utils/id` (generateId)                                  |
| **helpers**          | `shared/utils/history` (createHistoryEntry)                     |
| **types**            | `shared/types` (domain types)                                   |

### Forbidden Dependencies

| Rule                           | Reason                                             |
| ------------------------------ | -------------------------------------------------- |
| Slice → Slice (direct import)  | Creates coupling; use `get()` to read shared state |
| Slice → Widget/Feature         | Store layer must not depend on UI layer            |
| Slice → External state lib     | Zustand is the only state management dependency    |
| Widget → Slice (direct import) | Widgets import from `architectureStore.ts` only    |

---

## 4. FSD Layer Rules

CloudBlocks follows Feature-Sliced Design (FSD). The store lives in the `entities` layer.

```
shared/     → types, utils (no business logic)
entities/   → store, validation, block, plate, connection
features/   → generate, templates (stateless business logic)
widgets/    → UI composition (toolbar, panels, etc.)
app/        → App shell, global layout
```

### Allowed Import Directions

```
app → widgets → features → entities → shared
         ↓          ↓          ↓
       (can skip layers going down, never up)
```

| From        | Can Import                                      |
| ----------- | ----------------------------------------------- |
| `app/`      | `widgets/`, `features/`, `entities/`, `shared/` |
| `widgets/`  | `features/`, `entities/`, `shared/`             |
| `features/` | `entities/`, `shared/`                          |
| `entities/` | `shared/`                                       |
| `shared/`   | (nothing project-internal)                      |

### Violations to Watch

- ❌ `entities/` importing from `features/` or `widgets/`
- ❌ `shared/` importing from `entities/`
- ❌ `features/` importing from `widgets/`

---

## 5. Public API Contract

The store exposes a single hook: `useArchitectureStore` from `entities/store/architectureStore.ts`.

### Consumer Rules

- **Widgets/Features** import `useArchitectureStore` — never individual slices
- **Selectors** use Zustand selector pattern: `useArchitectureStore(state => state.field)`
- **Actions** accessed via: `useArchitectureStore(state => state.actionName)` or `useArchitectureStore.getState().actionName`
- **Type** `ArchitectureState` is re-exported from `architectureStore.ts`

### API Stability

- Adding new actions/state fields: non-breaking (append-only)
- Removing actions: breaking — requires deprecation period
- Changing action signatures: breaking — requires migration

---

## 6. Migration Plan

### Completed (Milestone 5)

1. ✅ Split monolithic `architectureStore.ts` (712 lines) into 5 slices
2. ✅ Created `slices/types.ts` with shared `ArchitectureState` interface
3. ✅ Created `slices/helpers.ts` for shared utilities
4. ✅ Thin composition in `architectureStore.ts` (~35 lines)
5. ✅ Auto-validation subscription preserved
6. ✅ All 427 frontend tests pass without modification
7. ✅ TypeScript strict mode clean

### Future (Milestone 6+)

- Consider extracting `entities/store/` into a `packages/cloudblocks-domain/` package
- Add ESLint rule to enforce FSD layer boundaries (e.g., `eslint-plugin-boundaries`)
- Add slice-level unit tests if individual slices grow beyond 200 lines

---

## 7. Acceptance Criteria

- [ ] No slice directly imports another slice (use `get()` for cross-slice reads)
- [ ] No upward FSD layer imports (`entities/` → `features/` is forbidden)
- [ ] `useArchitectureStore` remains the sole public API
- [ ] All 427+ tests pass after any store change
- [ ] TypeScript strict mode passes with no errors
