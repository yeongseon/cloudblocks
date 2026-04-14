# ADR-0018: Canvas Improvement Strategy — Incremental Enhancement over Framework Migration

**Status**: Accepted
**Date**: 2026-04
**Related**: [Epic #1829](https://github.com/yeongseon/cloudblocks/issues/1829), [ADR-0005](0005-2d-first-editor-with-25d-rendering.md), [ADR-0010](0010-svg-only-rendering-model.md)

## Context

Milestone 49 (Canvas UX Polish & Enhancement) identified nine areas for canvas interaction improvement: rounded connection corners, preview/committed path consistency, label text measurement, hover/selection animation, deterministic lane allocation, MiniMap, ELKjs auto-layout, path transition animation, and accessibility. Before implementation, two framework alternatives were evaluated against the current incremental approach.

### Current Architecture

CloudBlocks uses a custom 2.5D isometric canvas (ADR-0005) with pure SVG rendering (ADR-0010). Connections are routed via Manhattan routing on container surfaces (`surfaceRouting.ts`) and rendered as 3-layer SVG polylines (`ConnectionRenderer.tsx`). Pan/zoom uses CSS `transform: translate3d() scale()` with Pointer API drag and Ctrl+wheel zoom. Block drag uses interactjs with isometric coordinate conversion.

### Alternative A: React Flow Migration

React Flow was evaluated as a potential replacement for the custom canvas. Key findings:

1. **Coordinate system incompatibility**: React Flow operates in Cartesian 2D space. CloudBlocks uses 2:1 dimetric isometric projection where world coordinates (x, y, z) map to screen via `screenX = (wx - wy) * TILE_W/2`, `screenY = (wx + wy) * TILE_H/2 - wz * TILE_Z`. React Flow's node positioning, viewport transforms, and edge routing all assume axis-aligned rectangles — incompatible with diamond-shaped isometric footprints.

2. **Edge interleaving impossible**: React Flow renders all edges in a single global SVG layer. CloudBlocks interleaves connections between container surfaces at different depth levels. This depth-correct rendering cannot be achieved with React Flow's single-layer edge architecture.

3. **Container geometry mismatch**: React Flow nodes are rectangular. CloudBlocks containers are isometric diamonds with 3D-extruded faces. React Flow's built-in grouping, nesting, and resize mechanics assume rectangular bounds.

4. **Surface routing incompatible**: CloudBlocks routes connections across container surfaces using LCA-based traversal and surface-aware Manhattan routing. React Flow's edge routing (straight, step, smoothstep, bezier) operates in flat Cartesian space with no concept of container surfaces.

5. **Migration cost vs. benefit**: Adopting React Flow would require reimplementing the isometric projection within React Flow's coordinate system, replacing the entire connection rendering pipeline, and losing the depth-interleaved rendering that gives CloudBlocks its distinctive visual quality. The isometric 2.5D view is a UX differentiator worth preserving.

### Alternative B: d3.js Adoption

d3.js (specifically d3-shape, d3-zoom, d3-transition) was evaluated for connection visualization improvement. Key findings:

1. **Presentation-layer problem**: The connection rendering issues (sharp corners, inconsistent previews, manual label sizing) are presentation-layer concerns. The routing algorithm (`surfaceRouting.ts`) correctly computes Manhattan paths. Adding d3 would introduce a heavyweight dependency to solve problems achievable with direct SVG path commands.

2. **d3-shape curve mismatch**: d3-shape's generic curve interpolators (curveBasis, curveCardinal, etc.) produce smooth flowing curves. CloudBlocks' PCB-trace aesthetic requires sharp orthogonal segments with rounded corners only at turns — a specific SVG path pattern (`L` + `Q`/`A` at corners) that is simpler to implement directly than to configure via d3-shape.

3. **d3-transition conflicts with React**: d3-transition directly manipulates DOM elements, conflicting with React's virtual DOM ownership. Using d3-transition alongside React requires careful ref management and lifecycle coordination, adding complexity without proportional benefit.

4. **d3-zoom redundancy**: CloudBlocks already has working pan/zoom via CSS transforms and Pointer API. d3-zoom would duplicate this functionality and require bridging d3's zoom state with the existing Zustand viewport store.

5. **Bundle size**: Adding d3-shape + d3-zoom + d3-transition would introduce approximately 30-50KB of additional bundle size for capabilities achievable with native SVG and CSS.

## Decision

**Incremental enhancement on the current architecture (no new rendering framework).**

All nine canvas improvements will be implemented as presentation-layer changes to the existing SVG rendering pipeline. The routing layer (`surfaceRouting.ts`) remains unchanged. The only new dependency is `elkjs` for the auto-layout sub-issue (#1836).

Rationale:

1. **Highest ROI, lowest risk.** Each improvement is a targeted change to existing rendering code. No migration risk, no coordinate system translation, no framework integration overhead.

2. **Preserves the isometric differentiator.** The 2.5D isometric view with depth-interleaved connections is CloudBlocks' visual identity. Framework migration would compromise or require extensive reimplementation of this capability.

3. **Pure SVG achieves the goal.** Rounded corners via quadratic Bezier curves (`Q` commands), hover animations via CSS transitions, and label measurement via `<canvas>` text metrics or SVG `getComputedTextLength()` are all achievable without additional dependencies.

4. **Incremental delivery.** Each sub-issue can be implemented, tested, and merged independently. No big-bang migration required.

## Consequences

### Positive

- No new rendering framework dependency (except `elkjs` for auto-layout).
- Each improvement ships independently with low regression risk.
- Isometric 2.5D view and depth-interleaved connections are fully preserved.
- Existing test coverage and rendering pipeline remain valid.
- Bundle size impact is minimal.

### Negative

- No access to React Flow's built-in features (minimap, controls, node toolbar) — these must be implemented from scratch when needed.
- No d3 animation primitives — CSS transitions and `requestAnimationFrame` must be used instead.
- Future canvas features (e.g., collaborative cursors, edge bundling) will require custom implementation rather than leveraging framework ecosystems.

### When to Revisit

- If CloudBlocks adds a non-isometric view mode (e.g., flat 2D schematic), React Flow could serve that specific view while the isometric view remains custom.
- If connection routing complexity grows beyond Manhattan routing (e.g., curved routing, edge bundling with many connections), a dedicated graph rendering library may become justified.
- If the team grows and maintenance cost of custom canvas code exceeds the integration cost of a framework.
