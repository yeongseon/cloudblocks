# ADR-0005: 2D-First Editor with 2.5D Rendering

**Status**: Accepted

**Implementation note (2025-03):** The current implementation uses SVG + CSS transforms + DOM layering, not React Three Fiber. R3F was evaluated but not adopted due to simpler rendering needs. See `apps/web/src/entities/block/BlockSvg.tsx` and `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx`.
**Date**: 2025-01

## Context

CloudBlocks needs a visual editor for modeling cloud infrastructure. The visual style must balance aesthetics, usability, and technical complexity.

Options considered:

1. **2D flat editor** — SVG/Canvas-based boxes and arrows (like draw.io)
2. **Full 3D editor** — WebGL scene with free camera, physics, lighting (like Unity)
3. **2D-first editor with 2.5D (isometric) rendering** — 2D editing model, isometric visual projection

Option 1 is familiar but visually uncompelling — difficult to differentiate from dozens of existing diagram tools. Option 2 provides stunning visuals but introduces enormous complexity (camera control, occlusion, depth sorting, 3D interaction) that distracts from the core product value.

## Decision

**Build a 2D-first editor where the internal model uses 2D coordinates with containment hierarchy, and the rendering layer projects this into an isometric (2.5D) view.**

### Internal model (2D)

The architecture model uses a 2D coordinate system:

- **x/z plane** — layout plane (horizontal positioning)
- **y axis** — elevation (semantic depth, not physically simulated)
- **Containment** — plates contain blocks via `placementId` and `children[]`

```typescript
interface Position {
  x: number;  // layout plane
  y: number;  // elevation (semantic)
  z: number;  // layout plane
}
```

### Rendering layer (2.5D projection)

- React Three Fiber renders an isometric scene
- OrbitControls: zoom and pan only — **rotation is disabled**
- Depth is semantic, not physically simulated
- The visual layer is a **projection** of the 2D model

### Key constraints

- **No 3D interaction** — click targets are resolved in 2D space, not via raycasting
- **No physics** — blocks don't fall, collide, or simulate gravity
- **No free rotation** — camera angle is fixed isometric
- **Grid-aligned** — positions snap to a grid (`GRID_CELL = 1.5`)

### Technology

- **React Three Fiber** — React bindings for Three.js
- **@react-three/drei** — utility components (OrbitControls, Html labels)
- **Three.js** — rendering engine
- **Known constraint**: R3F `<line>` conflicts with SVG — use `<primitive object={new THREE.Line(...)} />` instead

## Consequences

### Positive

- **Visual distinction** — isometric view looks professional and distinctive, not another flat diagram tool
- **Simple editing model** — all editing logic operates in 2D, drastically reducing complexity
- **Predictable rendering** — fixed camera angle means no occlusion problems, no Z-fighting
- **Performant** — isometric rendering is simpler than full 3D, better performance on low-end devices
- **Accessible** — no 3D navigation skills required, just click and place

### Negative

- **Three.js overhead** — a full WebGL engine for what is essentially 2D editing is heavyweight
- **Fixed perspective** — users cannot rotate to view from different angles
- **Limited depth expression** — y-axis elevation is semantic only, complex vertical stacking is not supported
- **R3F ecosystem constraints** — some Three.js patterns don't map cleanly to React (e.g., `<line>` conflict)

### Alternatives Considered but Rejected

- **PixiJS** — good for 2D, but lacks the isometric depth illusion that makes CloudBlocks visually distinctive
- **Babylon.js** — full 3D engine, heavier than needed for a constrained isometric view
- **SVG + CSS transforms** — achievable but fragile for complex isometric scenes at scale

### Related Documents

- [ARCHITECTURE.md](../concept/ARCHITECTURE.md) — Rendering Layer Architecture (§6)
- [PRD.md](../concept/PRD.md) — Technical Constraints (§14)
