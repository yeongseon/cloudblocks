# ADR-0010: SVG-Only Rendering Model

**Status**: Accepted
**Date**: 2026-03

## Context

CloudBlocks uses a visual editor for modeling cloud infrastructure with an isometric (2.5D) visual style. [ADR-0005](0005-2d-first-editor-with-25d-rendering.md) established the foundational decision: a **2D-first editing model** projected into a 2.5D isometric view. However, ADR-0005 left the rendering technology open — at the time, React Three Fiber (R3F) was under evaluation alongside SVG-based approaches.

During early development, the project experimented with Three.js and React Three Fiber for the isometric view. R3F components were created for blocks (`BlockModel.tsx`), plates (`PlateModel.tsx`), and connections (`ConnectionLine.tsx`). These components required a WebGL context and were untestable in jsdom.

Over time, the team found that a fixed isometric projection does not benefit from a full 3D engine:

- **No free camera rotation** — the isometric angle is fixed, so Three.js camera controls are unnecessary.
- **No raycasting** — interaction targets are resolved in 2D screen coordinates, not 3D space.
- **No physics or lighting** — blocks are semantic, not physically simulated.
- **Bundle cost** — Three.js adds ~600KB to the bundle with no corresponding user value for a fixed-projection editor.

The R3F components were replaced by equivalent SVG+React components, and all Three.js dependencies were removed. The [M17 Rendering Audit](../audits/m17-rendering-audit.md) confirmed zero Three.js remnants: no dependencies, no imports, no 3D assets.

This ADR formalizes that outcome as a definitive architectural decision.

## Decision

**CloudBlocks uses SVG-only rendering with React components for all visual output.**

### Rendering Stack

```
ArchitectureModel (3D world coordinates: x, y, z)
    ↓ worldToScreen(worldX, worldY, worldZ) — isometric projection to 2D screen coords
SVG Components (React)
    ↓ CSS transforms (zoom, pan)
DOM (browser rendering)
```

### Key Components

| Component | Role |
|-----------|------|
| `SceneCanvas` | Root SVG scene — composites all sprites into a pannable/zoomable container |
| `PlateSvg` | Isometric plate (boundary) rendering with studs |
| `BlockSvg` | Isometric block (resource) rendering by category |
| `ConnectionPath` | SVG path connections between blocks with directional arrowheads |
| `MinifigureSvg` | Lego minifigure character sprite |
| `StudDefs` / `StudGrid` | Reusable stud SVG definitions and grid layout (Universal Stud Standard), defined in the `IsometricStud` module |
| `DragGhost` | SVG ghost during drag-to-place interactions |
| `ConnectionPreview` | SVG preview path during connection creation |
| `Minimap` | Miniature SVG overview of the canvas |

### Constraints

- **Fixed isometric projection** — no camera rotation, no perspective switching.
- **2D interaction model** — click targets resolved in screen coordinates, no raycasting.
- **No WebGL** — no `<canvas>` 3D context anywhere in the rendering pipeline.
- **Grid-aligned** — positions snap to an integer grid (`GRID_CELL = 1`).

### Options Considered

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **SVG-only** (React components) | ✅ Chosen | Matches fixed isometric projection exactly; testable in jsdom; minimal bundle; standard React tooling |
| **Hybrid SVG + Three.js** | ❌ Rejected | Maintaining two rendering pipelines adds complexity with no benefit for a fixed-angle view |
| **Full Three.js** | ❌ Rejected | Requires WebGL context, adds ~600KB bundle, introduces camera/raycasting complexity that contradicts the 2D-first editing model |

## Consequences

### Positive

- **Minimal bundle** — no Three.js dependency (~600KB savings), keeping the frontend lightweight.
- **Standard testing** — all rendering components are React + SVG, testable with Vitest/jsdom (except `SceneCanvas` which requires full DOM for complex interactions).
- **Simpler architecture** — no WebGL context management, no canvas lifecycle, no 3D render loop.
- **Accessible** — SVG elements are part of the DOM, enabling standard accessibility patterns.
- **Consistent with ADR-0005** — the 2D-first editing model is naturally expressed through SVG without translation to a 3D scene graph.

### Negative

- **No 3D preview** — users cannot rotate the view or see architectures from different angles.
- **Fixed perspective limits** — if the product ever needs true 3D visualization (e.g., data center floor plans with physical depth), this ADR would need to be revisited.
- **SVG performance ceiling** — very large architectures (hundreds of blocks) may hit SVG rendering limits; canvas-based 2D rendering (e.g., PixiJS) would be the next step, not Three.js.

### Relationship to ADR-0005

ADR-0005 remains **Accepted** — its core decision (2D-first editing model with isometric projection) is unchanged. This ADR resolves the open question of rendering technology that ADR-0005 left implicit: the answer is SVG + CSS transforms + DOM layering, definitively excluding Three.js/WebGL.

### Related Documents

- [ADR-0005: 2D-First Editor with 2.5D Rendering](0005-2d-first-editor-with-25d-rendering.md)
- [M17 Rendering Audit Report](../audits/m17-rendering-audit.md)
- [ARCHITECTURE.md — Rendering Layer](../concept/ARCHITECTURE.md)
