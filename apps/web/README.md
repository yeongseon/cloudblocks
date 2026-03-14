# CloudBlocks Web App

The main frontend application for CloudBlocks — a 2.5D isometric block-style visual cloud architecture builder.

## What This Package Does

This is the **visual editor** where users design cloud architectures by placing plates (networks, subnets) and blocks (compute, database, storage, gateway) on an isometric canvas. Connections between blocks represent data flow with initiator-direction semantics.

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
- **React Three Fiber (R3F)** + **drei** — 2.5D isometric rendering
- **Three.js** — 3D engine (used as 2.5D projection layer)
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
│   │   └── uiStore.ts            # UI state (tool mode, panel visibility)
│   ├── block/BlockModel.tsx      # R3F block component
│   ├── plate/PlateModel.tsx      # R3F plate component (with studs)
│   └── connection/ConnectionLine.tsx  # R3F connection lines + external actor
├── features/                     # Business logic (stateless)
│   └── validate/
│       ├── engine.ts             # Validation orchestrator
│       ├── placement.ts          # Placement rule validation
│       └── connection.ts         # Connection rule validation
├── shared/                       # Shared utilities & types
│   ├── types/
│   │   ├── index.ts              # Core domain types
│   │   └── schema.ts             # Serialization & schema versioning
│   └── utils/
│       ├── id.ts                 # ID generation
│       ├── position.ts           # Unified position calculations
│       └── storage.ts            # localStorage persistence
├── widgets/                      # Composed UI panels
│   ├── scene-canvas/SceneCanvas.tsx   # Main R3F canvas + camera
│   ├── toolbar/Toolbar.tsx            # Top toolbar
│   ├── block-palette/BlockPalette.tsx # Block creation palette
│   ├── properties-panel/PropertiesPanel.tsx  # Selection inspector
│   └── validation-panel/ValidationPanel.tsx  # Validation results
└── main.tsx                      # Entry point
```

## Current Implementation (v0.1 MVP)

- ✅ Isometric camera with fixed 2.5D view
- ✅ Network plate + public/private subnet plates
- ✅ Block placement with grid snapping (compute, database, storage, gateway)
- ✅ Connection lines with initiator-direction semantics
- ✅ Placement & connection rule validation
- ✅ Export architecture as JSON
- ✅ localStorage persistence (save/load/reset)
- ✅ Properties panel with block move between subnets

## Not Yet Implemented

- Code generation (IaC output)
- GitHub integration (Git-native storage)
- Multi-workspace support
- Backend orchestration layer
- EventFlow / Dependency connection types
- Drag-and-drop block placement
- Undo/redo

## Build

```bash
# Type check + build
pnpm --filter @cloudblocks/web build

# Or directly
npx tsc -b && npx vite build
```

## Architecture Notes

- The **internal coordinate system is 2D** (x, y grid) with a containment hierarchy. The 2.5D rendering is a visual projection only.
- **ArchitectureModel** is the source of truth — the visual layer projects from it.
- **Single workspace** in MVP. Storage format supports `Workspace[]` for forward compatibility.
- See [docs/ARCHITECTURE.md](../../docs/concept/ARCHITECTURE.md) and [docs/PRD.md](../../docs/concept/PRD.md) for full specs.
