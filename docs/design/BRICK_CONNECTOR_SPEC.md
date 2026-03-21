# Brick Connector Design Specification

**Status**: Active  
**Date**: 2026-03-21  
**Related issues**: #1014 (Epic), #1015, #1016, #1017, #1018, #1019  
**Related**: [CLOUDBLOCKS_SPEC_V2.md §11](./CLOUDBLOCKS_SPEC_V2.md), [BRICK_DESIGN_SPEC.md §0](./BRICK_DESIGN_SPEC.md) (stud standard reference)

---

## 1. Problem Statement

Connections between blocks currently render as thin SVG bezier curves — generic diagram-tool lines that break the Lego visual metaphor. Plates and blocks look like Lego bricks with studs, but connections look like arrows from a flowchart tool. This visual inconsistency undermines the entire brick-based design language.

### Current Implementation

```
ConnectionPath.tsx:
- SVG <path> with quadratic bezier curve (M ... Q ...)
- Two-layer stroke: 4px dark background + 2px colored foreground
- Arrow markers at end for direction
- 14px transparent hit area for click/hover
- 5 connection types differentiated by stroke dash pattern only
```

### Goal

Replace bezier lines with **Lego Technic flat-tile style connectors** that:
- Conform to the Universal Stud Standard
- Render correctly in 2.5D isometric projection
- Visually distinguish 5 connection types
- Preserve all existing interactions and diff-aware coloring

---

## 2. Design Decisions

### 2.1 Connector Shape: Flat Tile (1×N×⅓)

Connectors use the **Lego flat tile** metaphor — thin rectangular pieces (⅓ brick height) that lie flat on the isometric plane. This was chosen over Technic beams because:

- **Simpler geometry** — fewer SVG elements per connector, better performance with 20+ connections
- **Less visual clutter** — thin tiles don't compete with blocks for attention
- **Natural at any angle** — tiles can be rotated to follow connection paths without looking broken
- **Clear hierarchy** — blocks are tall (full bricks), connectors are flat (tiles), maintaining visual depth

Each connector is composed of **segments** — individual flat tile pieces that chain together from source to target.

### 2.2 Segment Geometry (Isometric)

A single connector segment in isometric view:

```
Segment width:  16px screen (≈0.5 CU)
Segment height: 3px screen (≈⅓ of stud height)
```

The segment renders as a parallelogram in isometric projection:

```svg
<!-- Single segment along X-axis (simplified) -->
<g>
  <!-- Top face (flat tile surface) -->
  <path d="M x1,y1 L x2,y2 L x3,y3 L x4,y4 Z" fill="{tile-color}" />
  <!-- Right edge (thin side face) -->
  <path d="M x2,y2 L x3,y3 L x3,y3+3 L x2,y2+3 Z" fill="{shadow-color}" />
  <!-- Front edge (thin front face) -->
  <path d="M x3,y3 L x4,y4 L x4,y4+3 L x3,y3+3 Z" fill="{dark-color}" />
</g>
```

### 2.3 Stud Placement on Connectors

To maintain the Universal Stud Standard, connectors include **one stud at each endpoint** (source and target attachment points). Mid-segment studs are omitted to keep connectors visually clean and distinguishable from blocks.

Endpoint studs use the canonical dimensions:
- rx=12, ry=6, height=5, 3-layer structure
- Color matches the connection type palette

### 2.4 Routing Strategy: Direct Segmented

**Phase 1 (M18)**: Direct point-to-point with up to 3 segments.

```
Source ──[segment]──[elbow]──[segment]──[elbow]──[segment]── Target
```

The path from source to target is computed as:
1. If source and target share the same X or Z axis: **single straight segment**
2. Otherwise: **L-shaped path** with one elbow joint (2 segments)
3. Elbow joints render as small square connector pieces (like Lego Technic angle connectors)

The routing algorithm projects screen-space endpoints back to world coordinates, then routes along world X and Z axes (which render as isometric diagonals on screen).

**Phase 2 (future)**: Orthogonal Manhattan routing with collision avoidance.

---

## 3. Connection Type Visual Language

Each of the 5 connection types is differentiated by **color** and **surface pattern**. The flat tile metaphor makes color the primary differentiator, with a subtle SVG pattern overlay for accessibility.

### 3.1 Color Palette

| Type | Tile Color | Shadow Color | Accent | Pattern |
|------|-----------|-------------|--------|---------|
| `dataflow` | `#64748b` (slate) | `#475569` | `#94a3b8` | Solid — no pattern |
| `http` | `#3b82f6` (blue) | `#2563eb` | `#60a5fa` | Double line — ═ |
| `internal` | `#8b5cf6` (violet) | `#7c3aed` | `#a78bfa` | Dashed — ┄ |
| `data` | `#f59e0b` (amber) | `#d97706` | `#fbbf24` | Dotted — ··· |
| `async` | `#10b981` (emerald) | `#059669` | `#34d399` | Zigzag — ⚡ |

### 3.2 Pattern Implementation

Patterns are rendered as thin SVG lines/shapes on the tile's top face:

```svg
<!-- dataflow: solid (no pattern overlay) -->

<!-- http: double parallel line -->
<line x1="..." y1="..." x2="..." y2="..." stroke="{accent}" stroke-width="1" opacity="0.5" />
<line x1="..." y1="..." x2="..." y2="..." stroke="{accent}" stroke-width="1" opacity="0.5" />

<!-- internal: dashed center line -->
<line ... stroke-dasharray="4 3" stroke="{accent}" stroke-width="1" opacity="0.5" />

<!-- data: dotted center line -->
<line ... stroke-dasharray="2 3" stroke="{accent}" stroke-width="1" opacity="0.5" />

<!-- async: zigzag line (via polyline) -->
<polyline points="..." stroke="{accent}" stroke-width="1" fill="none" opacity="0.5" />
```

---

## 4. Directional Indicator

Direction is indicated by an **asymmetric end piece** at the target end of the connector:

- **Source end**: Flat tile terminates flush (square end)
- **Target end**: Arrow-shaped point — the tile narrows to a triangular tip

```
Source ═════════════════════▷ Target
  [flat]                   [arrow]
```

The arrow tip is a simple triangular polygon appended to the last segment, using the same color palette as the connection type.

---

## 5. Interaction Model

### 5.1 Hit Area

A transparent stroke along the connector path provides the clickable area, matching the current 14px hit zone:

```svg
<path d="{connector-path}" stroke="transparent" stroke-width="14" fill="none" pointer-events="stroke" />
```

### 5.2 Selection State

When selected, the connector receives:
- **Outline glow**: 2px outer stroke in white at 50% opacity around the entire connector
- **Brightness boost**: Tile color lightened by 15%
- Consistent with block selection visual (blue glow ring)

### 5.3 Hover State

On hover:
- **Brightness boost**: Tile color lightened by 10%
- **Cursor**: `pointer`

### 5.4 Delete

- Delete mode (tool mode = 'delete'): Click removes connection
- Keyboard: Del key removes selected connection
- Same behavior as current implementation

---

## 6. Diff-Aware Coloring

When diff mode is active, connector colors override the type-based palette:

| Diff State | Tile Color | Shadow | Opacity |
|-----------|-----------|--------|---------|
| `added` | `#22c55e` | `#166534` | 1.0 |
| `removed` | `#ef4444` | `#991b1b` | 0.4 |
| `modified` | `#eab308` | `#854d0e` | 1.0 |
| `unchanged` | Type default | Type default | 1.0 |

The surface pattern (§3.2) is still rendered in diff mode, using white at 30% opacity for contrast.

---

## 7. External Actor Connections

External actors (Internet → Gateway) use the same brick connector rendering. The connector originates from the external actor's world position and terminates at the target block.

No special geometry changes — external actor connections render identically to block-to-block connections, preserving visual consistency.

---

## 8. Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| SVG complexity per connector | Flat tiles use 3-4 paths per segment (top + 2 edges + optional pattern). ~10 SVG elements per connection. |
| 20+ connections | React `memo` on connector component. SVG `<defs>` for shared patterns and stud symbols. |
| Re-render on pan/zoom | Connectors use world coordinates projected to screen — same as blocks. No extra calculation. |
| Hit area accuracy | Transparent stroke path follows actual connector geometry. |

Target: **<16ms frame time** with 30 simultaneous connections.

---

## 9. Implementation Plan

| Issue | Deliverable | Dependencies |
|-------|------------|-------------|
| #1015 | This design spec document | None |
| #1016 | `BrickConnector.tsx` — SVG component with 5 type visuals | #1015 |
| #1017 | `routing.ts` — path computation (direct + L-shaped) | #1015 |
| #1018 | Interaction migration (select, hover, delete) | #1016 |
| #1019 | Diff-aware coloring + external actor support | #1016 |

### File Structure

```
src/entities/connection/
├── BrickConnector.tsx          # Main component (replaces ConnectionPath.tsx)
├── BrickConnector.css          # Styles
├── BrickConnector.test.tsx     # Tests
├── routing.ts                  # Path computation algorithm
├── routing.test.ts             # Routing tests
├── connectorTheme.ts           # Color palettes and pattern definitions
├── ConnectionPath.tsx          # DEPRECATED — kept for rollback
└── ConnectionPath.test.tsx     # Existing tests (kept)
```

---

## 10. SVG Reference: Flat Tile Connector Segment

Complete SVG for a single isometric flat tile segment along the world X-axis:

```svg
<!-- 
  Flat tile segment at world position, projected to isometric.
  Width: 0.5 CU along X-axis
  Height: 3px (⅓ stud height) 
-->
<g class="connector-segment" data-type="dataflow">
  <!-- Top face (isometric parallelogram) -->
  <polygon 
    points="{p1x},{p1y} {p2x},{p2y} {p3x},{p3y} {p4x},{p4y}"
    fill="#64748b" 
    stroke="#475569" 
    stroke-width="0.5"
  />
  <!-- Right side face (3px tall) -->
  <polygon 
    points="{p2x},{p2y} {p3x},{p3y} {p3x},{p3y+3} {p2x},{p2y+3}"
    fill="#475569"
  />
  <!-- Front face (3px tall) -->
  <polygon 
    points="{p3x},{p3y} {p4x},{p4y} {p4x},{p4y+3} {p3x},{p3y+3}"
    fill="#334155"
  />
</g>
```

### Elbow Joint (Corner Piece)

```svg
<!-- Square connector piece at bend point -->
<g class="connector-elbow">
  <polygon 
    points="{top-face-diamond}" 
    fill="{tile-color}" 
    stroke="{shadow-color}" 
    stroke-width="0.5"
  />
  <!-- side faces omitted for brevity — same pattern as segment -->
</g>
```

### Endpoint Stud (Source/Target)

```svg
<!-- Universal Stud Standard at connector endpoint -->
<g class="connector-stud">
  <ellipse cx="{cx}" cy="{cy}" rx="12" ry="6" fill="{shadow-color}" />
  <ellipse cx="{cx}" cy="{cy-5}" rx="12" ry="6" fill="{tile-color}" />
  <ellipse cx="{cx}" cy="{cy-5}" rx="7.2" ry="3.6" fill="{accent}" opacity="0.3" />
</g>
```

### Arrow Tip (Target End)

```svg
<!-- Directional arrow at target endpoint -->
<polygon 
  points="{tip-triangle}" 
  fill="{tile-color}" 
  stroke="{shadow-color}" 
  stroke-width="0.5"
/>
```
