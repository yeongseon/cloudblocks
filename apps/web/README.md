# CloudBlocks Web App

The main frontend application for CloudBlocks — a top-down visual cloud architecture builder.

## What This Package Does

This is the **visual editor** where users design cloud architectures by placing plates (networks, subnets) and blocks (compute, database, storage, gateway, function, queue, event, timer) on a 2.5D isometric canvas. Connections between blocks represent data flow with initiator-direction semantics.

## Quick Start

```bash
# From monorepo root
pnpm install
pnpm --filter @cloudblocks/web dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode, `verbatimModuleSyntax`)
- **Vite 8** — dev server & build
- **React Three Fiber (R3F)** + **drei** — top-down orthographic rendering
- **Three.js** — 3D engine (used as top-down projection layer)
- **Zustand** — state management

## Project Structure (FSD-inspired)

```
src/
├── app/                          # App shell, root layout, global CSS
│   ├── App.tsx
│   ├── App.css
│   └── index.css
├── entities/                     # Domain entities (models + store)
│   ├── store/
│   │   ├── architectureStore.ts  # Main Zustand store (plates, blocks, connections)
│   │   ├── uiStore.ts            # UI state (tool mode, panel visibility)
│   │   └── authStore.ts          # Auth state (GitHub OAuth)
│   ├── validation/               # Validation engine
│   │   ├── engine.ts             # Validation orchestrator
│   │   ├── placement.ts          # Placement rule validation
│   │   └── connection.ts         # Connection rule validation
│   ├── block/BlockSprite.tsx     # Isometric block SVG sprite
│   ├── plate/PlateSprite.tsx     # Isometric plate SVG sprite (with studs)
│   ├── connection/ConnectionPath.tsx  # SVG connection paths + external actor
│   └── character/MinifigureSvg.tsx    # Lego minifigure character (Phase 3)
├── features/                     # Business logic (stateless)
│   ├── generate/                 # Code generation pipeline (Terraform, Bicep, Pulumi)
│   │   ├── types.ts              # Generation types
│   │   ├── provider.ts           # Provider adapter (Azure)
│   │   ├── terraform.ts          # Terraform HCL generation
│   │   ├── bicep.ts              # Bicep generation
│   │   ├── pulumi.ts             # Pulumi generation
│   │   └── pipeline.ts           # Pipeline orchestrator
│   ├── diff/                     # Architecture diff engine (Milestone 7)
│   │   ├── engine.ts             # computeArchitectureDiff()
│   │   └── engine.test.ts        # Diff engine tests
│   ├── learning/                 # Learning Mode engine (Milestone 6C)
│   └── templates/                # Architecture templates
│       ├── registry.ts           # Template registry
│       └── builtin.ts            # Built-in template definitions
├── shared/                       # Shared utilities & types
│   ├── types/
│   │   ├── index.ts              # Core domain types
│   │   ├── schema.ts             # Serialization & schema versioning
│   │   ├── template.ts           # Template types
│   │   ├── diff.ts               # DiffDelta, DiffState types (Milestone 7)
│   │   ├── api.ts                # API response types (PrInfo, CheckInfo)
│   │   └── learning.ts           # Learning Mode types (Milestone 6C)
│   ├── utils/
│   │   ├── id.ts                 # ID generation
│   │   ├── history.ts            # Undo/redo history
│   │   ├── position.ts           # Unified position calculations
│   │   ├── storage.ts            # localStorage persistence
│   │   └── audioService.ts       # Audio feedback service (Phase 2)
│   └── assets/
│       └── sounds.ts             # CC0 base64 sound assets (Phase 2)
├── widgets/                      # Composed UI panels
│   ├── scene-canvas/             # Main isometric canvas
│   ├── toolbar/                  # Top toolbar
│   ├── menu-bar/                 # Menu bar with file/edit/view/github menus
│   ├── bottom-panel/             # StarCraft-style bottom panel
│   ├── resource-bar/             # Resource palette (drag-to-create)
│   ├── validation-panel/         # Validation results
│   ├── code-preview/             # Code generation preview (Terraform/Bicep/Pulumi)
│   ├── template-gallery/         # Template selection
│   ├── scenario-gallery/         # Learning scenario gallery (Milestone 6C)
│   ├── learning-panel/           # Learning Mode step panel (Milestone 6C)
│   ├── flow-diagram/             # Architecture flow diagram
│   ├── workspace-manager/        # Multi-workspace management
│   ├── diff-panel/               # Architecture diff panel (Milestone 7)
│   ├── github-login/             # GitHub OAuth login (Milestone 5)
│   ├── github-repos/             # GitHub repo management (Milestone 5)
│   ├── github-sync/              # Architecture sync to GitHub (Milestone 5)
│   └── github-pr/                # PR creation from UI (Milestone 5)
```

## Current Implementation (Milestone 1–Milestone 7)

- ✅ Orthographic camera with top-down view
- ✅ Network plate + public/private subnet plates
- ✅ Block placement with grid snapping (compute, database, storage, gateway)
- ✅ Connection lines with initiator-direction semantics
- ✅ Placement & connection rule validation
- ✅ Export architecture as JSON
- ✅ localStorage persistence (save/load/reset)
- ✅ Properties panel with block move between subnets
- ✅ Undo/redo with keyboard shortcuts (Milestone 2)
- ✅ Multi-workspace support (Milestone 4)
- ✅ Terraform code generation with preview (Milestone 3)
- ✅ Architecture templates with gallery (Milestone 4)

- ✅ GitHub OAuth login (Milestone 5)
- ✅ GitHub repo sync / pull (Milestone 5)
- ✅ PR creation from UI (Milestone 5)
- ✅ Typed API client with JWT auth (Milestone 5)
- ✅ Multi-generator code export: Terraform, Bicep, Pulumi (Milestone 6)
- ✅ Serverless blocks: Function, Queue, Event, Timer (Milestone 6)
- ✅ Drag-to-create block placement from palette (Milestone 6B)
- ✅ First-screen onboarding and selection states (Milestone 6B)
- ✅ Learning Mode with guided scenarios (Milestone 6C)
- ✅ Sound effects with mute preference (Phase 2)
- ✅ Lego minifigure DevOps engineer character (Phase 3)
- ✅ Architecture diff visualization with canvas overlays (Milestone 7)
- ✅ Compare with GitHub flow (Milestone 7)

## Not Yet Implemented

- EventFlow / Dependency connection types

## Build

```bash
# Type check + build
pnpm --filter @cloudblocks/web build

# Or directly
npx tsc -b && npx vite build
```

## Architecture Notes

- The **internal coordinate system is 2D** (x, y grid) with a containment hierarchy. The top-down rendering is a visual projection only.
- **ArchitectureModel** is the source of truth — the visual layer projects from it.
- **Multi-workspace** support with workspace creation, switching, and deletion.
- See [docs/ARCHITECTURE.md](../../docs/concept/ARCHITECTURE.md) and [docs/PRD.md](../../docs/concept/PRD.md) for full specs.
