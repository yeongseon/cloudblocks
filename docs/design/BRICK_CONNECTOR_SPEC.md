# Connection Renderer Design Specification

**Status**: Active  
**Date**: 2026-03-21  
**Related issues**: #1014 (Epic), #1015, #1016, #1017, #1018, #1019  
**Related**: [CLOUDBLOCKS_SPEC_V2.md §11](./CLOUDBLOCKS_SPEC_V2.md), [BRICK_DESIGN_SPEC.md §0](./BRICK_DESIGN_SPEC.md) (port standard reference)

---

## 1. Problem Statement

Connections between blocks currently render as thin SVG bezier curves — generic diagram-tool lines that break the block-based visual metaphor. Container blocks and blocks look cohesive with ports, but connections look like arrows from a flowchart tool. This visual inconsistency undermines the entire block-based design language.

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

Replace bezier lines with **Technic flat-tile style connectors** that:

- Conform to the Universal Port Standard
- Render correctly in 2.5D isometric projection
- Visually distinguish 5 connection types
- Preserve all existing interactions and diff-aware coloring

---

## 2. Design Decisions

### 2.1 Connector Shape: Flat Tile (1×N×⅓)

Connectors use the **flat tile** metaphor — thin rectangular pieces (⅓ block height) that lie flat on the isometric plane. This was chosen over Technic beams because:

- **Simpler geometry** — fewer SVG elements per connector, better performance with 20+ connections
- **Less visual clutter** — thin tiles don't compete with blocks for attention
- **Natural at any angle** — tiles can be rotated to follow connection paths without looking broken
- **Clear hierarchy** — blocks are tall, connectors are flat (tiles), maintaining visual depth

Each connector is composed of **segments** — individual flat tile pieces that chain together from source to target.

### 2.2 Segment Geometry (Isometric)

A single connector segment in isometric view:

```
Segment width:  16px screen (≈0.5 CU)
Segment height: 3px screen (≈⅓ of port height)
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

### 2.3 Port Placement on Connectors

To maintain the Universal Port Standard, connectors include **one port at each endpoint** (source and target attachment points). Mid-segment ports are omitted to keep connectors visually clean and distinguishable from blocks.

Endpoint ports use the canonical dimensions:

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
3. Elbow joints render as small square connector pieces (like Technic angle connectors)

The routing algorithm projects screen-space endpoints back to world coordinates, then routes along world X and Z axes (which render as isometric diagonals on screen).

**Phase 2 (future)**: Orthogonal Manhattan routing with collision avoidance.

---

## 3. Connection Type Visual Language

Each of the 5 connection types is differentiated by **color** and **surface pattern**. The flat tile metaphor makes color the primary differentiator, with a subtle SVG pattern overlay for accessibility.

### 3.1 Color Palette

| Type       | Tile Color          | Shadow Color | Accent    | Pattern            |
| ---------- | ------------------- | ------------ | --------- | ------------------ |
| `dataflow` | `#64748b` (slate)   | `#475569`    | `#94a3b8` | Solid — no pattern |
| `http`     | `#3b82f6` (blue)    | `#2563eb`    | `#60a5fa` | Double line — ═    |
| `internal` | `#8b5cf6` (violet)  | `#7c3aed`    | `#a78bfa` | Dashed — ┄         |
| `data`     | `#f59e0b` (amber)   | `#d97706`    | `#fbbf24` | Dotted — ···       |
| `async`    | `#10b981` (emerald) | `#059669`    | `#34d399` | Zigzag — ⚡        |

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

| Diff State  | Tile Color   | Shadow       | Opacity |
| ----------- | ------------ | ------------ | ------- |
| `added`     | `#22c55e`    | `#166534`    | 1.0     |
| `removed`   | `#ef4444`    | `#991b1b`    | 0.4     |
| `modified`  | `#eab308`    | `#854d0e`    | 1.0     |
| `unchanged` | Type default | Type default | 1.0     |

The surface pattern (§3.2) is still rendered in diff mode, using white at 30% opacity for contrast.

---

## 7. External Actor Connections

External actors (Internet → Gateway) use the same connection renderer. The connector originates from the external actor's world position and terminates at the target block.

No special geometry changes — external actor connections render identically to block-to-block connections, preserving visual consistency.

---

## 8. Performance Considerations

| Concern                      | Mitigation                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| SVG complexity per connector | Flat tiles use 3-4 paths per segment (top + 2 edges + optional pattern). ~10 SVG elements per connection. |
| 20+ connections              | React `memo` on connector component. SVG `<defs>` for shared patterns and port symbols.                   |
| Re-render on pan/zoom        | Connectors use world coordinates projected to screen — same as blocks. No extra calculation.              |
| Hit area accuracy            | Transparent stroke path follows actual connector geometry.                                                |

Target: **<16ms frame time** with 30 simultaneous connections.

---

## 9. Implementation Plan

| Issue | Deliverable                                                                         | Dependencies |
| ----- | ----------------------------------------------------------------------------------- | ------------ |
| #1015 | This design spec document                                                           | None         |
| #1016 | `ConnectionRenderer` (`ConnectionRenderer.tsx`) — SVG component with 5 type visuals | #1015        |
| #1017 | `routing.ts` — path computation (direct + L-shaped)                                 | #1015        |
| #1018 | Interaction migration (select, hover, delete)                                       | #1016        |
| #1019 | Diff-aware coloring + external actor support                                        | #1016        |

### File Structure

```
src/entities/connection/
├── ConnectionRenderer.tsx      # Main connection renderer component (replaces ConnectionPath.tsx)
├── ConnectionRenderer.css      # Styles
├── ConnectionRenderer.test.tsx # Tests
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
  Height: 3px (⅓ port height)
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

### Endpoint Port (Source/Target)

```svg
<!-- Universal Port Standard at connector endpoint -->
<g class="connector-port">
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

---

## 11. Technic Beam Redesign (M18)

**Date**: 2026-03-21  
**Issue**: #1060

### 11.1 Motivation

The original flat tile design (§2.1) used surface pattern overlays (§3.2) to distinguish connection types. While functionally correct, the thin lines and dash patterns were subtle and hard to read at typical zoom levels. The Technic Beam redesign replaces pattern overlays with **physically distinct beam geometries** — each connection type now has a unique 3D shape, making them instantly recognizable.

This follows the Technic principle: different beam pieces are physically different shapes, not painted-on decorations.

### 11.2 BeamShape Type

A new `BeamShape` type is added to `connectorTheme.ts`:

```typescript
type BeamShape = 'standard' | 'doubleRail' | 'segmented' | 'wide' | 'zigzag';
```

Each connector theme gains a `beamShape` field. The mapping is:

| Connection Type | BeamShape    | Visual Description                            |
| --------------- | ------------ | --------------------------------------------- |
| `dataflow`      | `standard`   | Classic smooth beam — single 3D extrusion     |
| `http`          | `doubleRail` | Two parallel track beams — rail pair          |
| `internal`      | `segmented`  | Beam with visible gaps — dashed physical form |
| `data`          | `wide`       | 1.5× width beam — broad data pipe             |
| `async`         | `zigzag`     | Sawtooth path — physically jagged beam        |

### 11.3 Beam Geometry Constants

```
BEAM_HALF_WIDTH  = 8     (half-width of standard beam, screen px)
BEAM_THICKNESS   = 6     (3D depth, up from 3px flat tiles)
WIDE_HALF_WIDTH  = 12    (1.5× for 'data' type)
RAIL_HALF_WIDTH  = 3     (each rail in double-rail)
RAIL_GAP         = 4     (gap between rails)
SEGMENT_CHUNK    = 20    (chunk length before gap)
SEGMENT_GAP      = 4     (gap between chunks)
ZIGZAG_AMPLITUDE = 6     (zigzag offset)
ZIGZAG_WAVELENGTH= 16    (zigzag period)
ARROW_LENGTH     = 12    (unchanged)
HIT_AREA_WIDTH   = 20    (widened from 16px for easier clicking)
```

### 11.4 Beam Renderers

Each beam shape has a dedicated renderer function:

1. **`renderStandardBeam`** — 3 polygons per segment (top face + right side + front side). Identical geometry to the original flat tile but thicker (6px vs 3px).

2. **`renderDoubleRailBeam`** — 6 polygons per segment (3 per rail × 2). Two parallel beams with `RAIL_GAP` spacing, each using `RAIL_HALF_WIDTH`.

3. **`renderSegmentedBeam`** — Variable polygon count. Beam is split into chunks of `SEGMENT_CHUNK` length with `SEGMENT_GAP` gaps. Each chunk is a standard 3-polygon beam piece.

4. **`renderWideBeam`** — 3 polygons per segment using `WIDE_HALF_WIDTH` (12px vs standard 8px). Visually reads as a wider data channel.

5. **`renderZigzagBeam`** — Multiple sub-segments per route segment. The beam path zigzags with `ZIGZAG_AMPLITUDE` offset at `ZIGZAG_WAVELENGTH` intervals. Each zig/zag is a standard 3-polygon piece.

### 11.5 3D Elbow Joints

Elbow joints (bend points) are upgraded from single-polygon diamonds to **3-polygon 3D pieces**:

```svg
<g data-elbow pointer-events="none">
  <!-- Top face: diamond -->
  <polygon points="{top-diamond}" fill="{tile}" stroke="{shadow}" stroke-width="0.5" />
  <!-- Right side face -->
  <polygon points="{right-side}" fill="{shadow}" />
  <!-- Front side face -->
  <polygon points="{front-side}" fill="{dark}" />
</g>
```

Elbow size scales with beam width via `getBeamHalfWidth(beamShape)`.

### 11.6 3D Arrow Tip

The directional arrow at the target end now includes a side face for 3D depth:

```svg
<g pointer-events="none">
  <!-- Top face: triangle -->
  <polygon points="{tip-triangle}" fill="{tile}" stroke="{shadow}" stroke-width="0.5" />
  <!-- Side face: parallelogram -->
  <polygon points="{side-face}" fill="{shadow}" />
</g>
```

### 11.7 Pattern Overlay Removal

The `renderPattern` function from the original implementation is **removed**. Pattern differentiation is now achieved through beam geometry alone — no SVG line overlays are needed.

The `pattern` field in `ConnectorTheme` is **retained** for backward compatibility and documentation reference, but is not rendered visually.

### 11.8 Test Coverage

Beam-shape-specific tests validate:

- Each connection type renders with the correct `data-beam-shape` attribute
- Each beam type produces the expected SVG structure (polygon counts, group nesting)
- `beamShape` values are unique across all 5 connection types
- Elbow joints have `data-elbow` attribute and 3-polygon structure
- Arrow tip renders with side face

---

## 12. Faithful Connector Redesign (Supersedes §11)

**Date**: 2026-03-21  
**Status**: Active — supersedes §11 (Technic Beam Redesign)  
**Problem**: §11 produced connectors that look like dark pillars and pipes — nothing like real connection renderers. The routing used screen-space coordinates instead of isometric axes, and beam proportions were arbitrary rather than grounded in actual block-based measurements.

### 12.1 Real Block-Based Measurement System

All connector dimensions derive from the **official block-based measurement system**, translated into our coordinate system. This is the single source of truth.

#### 12.1.1 Block-Based Physical Dimensions (Reference)

```
Port pitch (center-to-center):     8.0 mm
Port diameter:                     4.8 mm  (= 0.6 × pitch)
Port height:                       1.7 mm
Block height (with port):          9.6 mm  (= 1.2 × pitch)
Block height (without port):       7.8 mm
Thin layer height:                 3.2 mm  (= ⅓ block height)
Block wall thickness:              1.5 mm
Technic beam thickness (thick):    7.8 mm  (≈ 1 port width, 7:8 aspect)
Technic beam thickness (thin):     3.9 mm  (= ½ thick beam)
Technic pin hole diameter:         4.8 mm  (same as port diameter)
Technic pin hole spacing:          8.0 mm  (= port pitch)
```

#### 12.1.2 Key Block-Based Ratios

```
block height : port pitch     = 6:5  (9.6:8.0)
thin layer height : block height   = 1:3  (3.2:9.6)
port diameter : port pitch    = 3:5  (4.8:8.0)
beam thickness : port pitch   = ~1:1 (7.8:8.0)
thin beam : thick beam        = 1:2  (3.9:7.8)
pin hole : port pitch         = 3:5  (4.8:8.0)
```

#### 12.1.3 Mapping to CloudBlocks Coordinate System

CloudBlocks uses `RENDER_SCALE = 32` where 1 CU (Cloud Unit) = 1 port pitch.

```
1 CU = 1 port pitch
TILE_W = 64px (isometric tile width = 2 × RENDER_SCALE)
TILE_H = 32px (isometric tile height = RENDER_SCALE)
TILE_Z = 32px (elevation per CU)
```

The isometric projection is 2:1 dimetric:

```
screenX = originX + (worldX - worldZ) × TILE_W / 2
screenY = originY + (worldX + worldZ) × TILE_H / 2 - worldY × TILE_Z
```

**Connector dimensions, derived from block-based ratios:**

| Block Concept                      | mm      | CU Equivalent | Screen px (approx)         |
| ---------------------------------- | ------- | ------------- | -------------------------- |
| Beam width (1 port)                | 8.0     | 1.0 CU        | 32 iso-X or 16 iso-Y       |
| Beam thickness (thin layer height) | 3.2     | 0.4 CU        | 13 elevation               |
| Pin hole spacing                   | 8.0     | 1.0 CU        | 1 grid cell                |
| Pin hole diameter                  | 4.8     | 0.6 CU        | ~19 iso-X                  |
| Port on beam                       | 4.8 dia | —             | Standard port (PORT_RX=12) |

### 12.2 Design: Technic Liftarm (Flat Beam with Pin Holes)

Connectors use the **Technic Liftarm** metaphor — flat beams with visible pin holes at regular intervals. This is what makes them instantly recognizable as connection renderers.

#### 12.2.1 Why Liftarms

Real Technic liftarms are:

- **Flat** — 1 thin layer height thick (3.2mm), lying on the isometric ground plane
- **Portless** — no ports on top, only pin holes along the beam
- **Rounded ends** — semi-circular terminations at both ends
- **Pin holes visible** — evenly spaced holes are the defining visual feature

This contrasts with §11's approach which used arbitrary extrusions with no recognizable block-based features.

#### 12.2.2 Liftarm Cross-Section in Isometric

```
   Top view (isometric diamond):
   ╭─── beam width (0.5 CU) ───╮
   ◇ ○ ─── ○ ─── ○ ─── ○ ─── ◇   ← pin holes at 1 CU intervals
   ╰───────────────────────────╯

   Side view (isometric):
   ┌─────────────────────────────┐  ← top face (tile color)
   │  ○     ○     ○     ○     ○ │  ← pin holes (accent circles)
  ├─────────────────────────────┤  ← side face (shadow color, thin layer height thick)
   └─────────────────────────────┘
```

### 12.3 Screen-Space Orthogonal Routing

**§11 Bug**: Routing computed elbows in screen-space with arbitrary diagonals.
**§12 v1 Bug**: World-space axis routing (X-first then Z) still produced screen diagonals because a single world-axis movement maps to a diagonal in isometric projection.

**Solution**: Route in **screen coordinates** — segments are strictly screen-vertical (constant screenX) or screen-horizontal (constant screenY). This guarantees visually clean right-angle connections regardless of isometric projection geometry.

#### 12.3.1 Algorithm

1. Convert source and target **world coordinates** to **screen coordinates** using isometric projection:
   ```
   screenX = originX + (worldX - worldZ) × TILE_W / 2
   screenY = originY + (worldX + worldZ) × TILE_H / 2 - worldY × TILE_Z
   ```
2. Compare screen positions (with `SAME_PX_TOLERANCE = 2`):
   - Same screenX → single **screen-v** segment (vertical line)
   - Same screenY → single **screen-h** segment (horizontal line)
   - Otherwise → L-route with height normalization
3. L-route uses `normalizedY = Math.min(srcScreen.y, tgtScreen.y)` (the higher point on screen)
4. Direction depends on which endpoint is lower on screen (higher Y value):
   - Source lower → **vertical-first**: src → elbow(srcX, normalizedY) → tgt
   - Source higher → **horizontal-first**: src → elbow(tgtX, normalizedY) → tgt

```
Screen-space routing:

Source (sx1, sy1)        ← lower on screen (larger Y)
  │
  ├── Segment 1: screen-v (constant screenX = sx1)    ← vertical line ↑
  │
  Elbow (sx1, normalizedY)
  │
  ├── Segment 2: screen-h (constant screenY = normalizedY)  ← horizontal line →
  │
Target (sx2, sy2)        ← higher on screen (smaller Y)
```

#### 12.3.2 Elbow Selection (Height Normalization)

The elbow is always placed at the **height of the topmost endpoint** (smallest screenY). This ensures beams rise to the higher resource before connecting horizontally, producing a clean "up then across" or "across then down" visual.

- Source is lower (srcScreen.y > tgtScreen.y): elbow at `(srcScreen.x, normalizedY)` — vertical-first
- Source is higher (srcScreen.y ≤ tgtScreen.y): elbow at `(tgtScreen.x, normalizedY)` — horizontal-first

#### 12.3.3 Straight Segments

If source and target align within `SAME_PX_TOLERANCE` (2px) on either screen axis, a single straight segment is used:

- Same screenX (within tolerance) → `screen-v` segment
- Same screenY (within tolerance) → `screen-h` segment
- Both within tolerance → degenerate, treated as `screen-v`

#### 12.3.4 Segment Types

| Direction  | Constant | Varies  | Visual                    |
| ---------- | -------- | ------- | ------------------------- |
| `screen-v` | screenX  | screenY | Vertical line on screen   |
| `screen-h` | screenY  | screenX | Horizontal line on screen |

Each `ScreenSegment` contains `start: ScreenPoint`, `end: ScreenPoint`, and `direction: 'screen-v' | 'screen-h'`.

#### 12.3.5 Length Calculations

Segment lengths are computed directly from screen coordinates:

- `screen-v`: `|end.y - start.y|` pixels, converted to CU by dividing by `TILE_H`
- `screen-h`: `|end.x - start.x|` pixels, converted to CU by dividing by `TILE_W`

### 12.4 Beam Geometry Constants (Derived from Block-Based Ratios)

All values derived from `RENDER_SCALE` and block-based ratios:

```typescript
// Screen-space beam half-thickness (perpendicular to beam direction)
const BEAM_HALF_THICKNESS = 4; // pixels

// Beam thickness = 1 thin layer height = 0.33 CU
const BEAM_THICKNESS_CU = 1 / 3;
const BEAM_THICKNESS_PX = TILE_Z * BEAM_THICKNESS_CU; // ~11px elevation

// Pin hole spacing = 1 CU (= 1 port pitch)
const PIN_HOLE_SPACING_CU = 1.0;

// Pin hole radius = 0.3 CU (= 0.6 × port pitch / 2)
const PIN_HOLE_RADIUS_CU = 0.3;

// Rounded end radius = beam half-thickness
const END_RADIUS = BEAM_HALF_THICKNESS;

// Alignment tolerance
const SAME_PX_TOLERANCE = 2; // pixels, for screen-aligned detection
```

### 12.5 Connection Type Differentiation

Types are differentiated by **beam color** (primary) and **pin hole style** (secondary). Beam shape is uniform — all types use the same liftarm geometry. This matches the Technic design where the same beam part comes in different colors.

| Type       | Beam Color           | Pin Hole Style            | Block Analogy           |
| ---------- | -------------------- | ------------------------- | ----------------------- |
| `dataflow` | Slate gray `#64748b` | Open circle               | Standard liftarm        |
| `http`     | Blue `#3b82f6`       | Filled dot (pin inserted) | Beam with pins          |
| `internal` | Violet `#8b5cf6`     | Cross (axle hole)         | Beam with axle holes    |
| `data`     | Amber `#f59e0b`      | Double circle             | Wide beam (2-port)      |
| `async`    | Emerald `#10b981`    | Dashed circle             | Thin beam (half-height) |

**Color is the primary differentiator.** Pin hole style adds secondary recognition at close zoom but is not required for identification.

### 12.6 Rendering Pipeline

#### 12.6.1 Per-Segment Rendering

Each segment renders as a **3D liftarm piece** along a screen axis:

```svg
<g data-connector-segment data-direction="screen-v|screen-h">
  <!-- 1. Side face (thin-layer-height thick, drawn first for depth) -->
  <polygon points="{side-face}" fill="{dark}" />

  <!-- 2. Top face (rectangle, beam thickness × segment length) -->
  <polygon points="{top-face}" fill="{tile}" stroke="{shadow}" stroke-width="0.5" />

  <!-- 3. Pin holes along beam (1 per CU of length) -->
  <ellipse cx="..." cy="..." rx="{hole-rx}" ry="{hole-ry}"
           fill="{accent}" opacity="0.4" />
  <!-- repeat per hole -->
</g>
```

The rectangle orientation depends on which screen direction the segment follows:

- **screen-v segment**: top face is a tall rectangle (constant X, varying Y)
- **screen-h segment**: top face is a wide rectangle (varying X, constant Y)

#### 12.6.2 Elbow Joint

At the bend point, a **square connector piece** joins the two segments:

```svg
<g data-connector-elbow>
  <!-- Square top face (screen-aligned) -->
  <rect x="..." y="..." width="{beam-width}" height="{beam-width}"
        fill="{tile}" stroke="{shadow}" stroke-width="0.5" />
  <!-- Side face -->
  <polygon points="{side}" fill="{dark}" />
  <!-- Center pin hole -->
  <ellipse cx="..." cy="..." rx="{hole-rx}" ry="{hole-ry}"
           fill="{accent}" opacity="0.4" />
</g>
```

#### 12.6.3 Directional Arrow

Direction is indicated by the **last pin hole being a filled triangle** (arrow shape) instead of a circle. No protruding arrow tip — the beam terminates flush, with only the pin hole shape changing.

This is more faithful to the block-based aesthetic than a protruding arrow — real Technic pieces don't have arrows.

#### 12.6.4 Endpoint Studs

Source and target endpoints render the **Universal Port Standard** port on top of the beam at the connection point. This represents the port that "plugs into" the block's anti-port.

### 12.7 Rendering Order

To avoid the "pillar through block" artifact from §11:

1. Connectors render at **layer 0.5** — between container blocks (layer 0) and blocks (layer 2)
2. Connector segments get depth keys based on their world position: `depthKey(worldX, worldZ, 0, 0.5)`
3. Segments closer to the camera (higher worldX + worldZ) render later (painter's algorithm)

### 12.8 Performance

| Concern                    | Mitigation                                                                   |
| -------------------------- | ---------------------------------------------------------------------------- |
| Pin holes add SVG elements | Max ~5 holes per segment. Clipped to visible viewport.                       |
| World→screen conversions   | One-time at route computation; results cached as `ScreenPoint` in `useMemo`. |
| 30+ connections            | `React.memo` on component. Route only recomputes on endpoint change.         |
| Rendering order            | Depth key computation is O(1) per segment.                                   |

Target: **<16ms frame time** with 30 simultaneous connections.

### 12.9 Design Token Additions

New tokens added to `designTokens.ts`, all derived from `RENDER_SCALE`:

```typescript
// -- Technic Liftarm (Connector Beam) --
// Screen-space beam dimensions
export const BEAM_HALF_THICKNESS = 4; // screen pixels
export const BEAM_THICKNESS_CU = 1 / 3; // thin layer height = 1/3 block
export const BEAM_THICKNESS_PX = RENDER_SCALE * BEAM_THICKNESS_CU; // ~11px
export const PIN_HOLE_SPACING_CU = 1.0; // 1 hole per port pitch
export const PIN_HOLE_RX = (RENDER_SCALE * 3) / 20; // 4.8 (hole X radius)
export const PIN_HOLE_RY = PIN_HOLE_RX / 2; // 2.4 (hole Y radius)
export const SAME_PX_TOLERANCE = 2; // alignment detection
```

### 12.10 Migration from §11

| §11 Artifact                              | §12 Replacement                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `buildBeamFaces()` — screen-space polygon | `renderLiftarmSegment()` — screen-axis-aligned rectangle with depth face       |
| `computeRoute()` — screen-space elbow     | `computeWorldRoute()` — world→screen conversion then screen-orthogonal routing |
| `WorldSegment` with `axis: 'x' \| 'z'`    | `ScreenSegment` with `direction: 'screen-v' \| 'screen-h'`                     |
| 5 beam shape renderers                    | 1 universal liftarm renderer with pin hole style variants                      |
| `BEAM_HALF_WIDTH = 8` (magic number)      | `BEAM_HALF_THICKNESS = 4` (screen pixels)                                      |
| `BEAM_THICKNESS = 6` (magic number)       | `BEAM_THICKNESS_CU = 1/3` (= thin layer height ratio)                          |
| Protruding arrow tip                      | Flush end with directional pin hole                                            |
| World-space axis hit path                 | Screen-orthogonal hit path via `buildHitPath(route)`                           |

### 12.11 Acceptance Criteria

- [x] Connectors visually resemble Technic liftarms with visible pin holes
- [x] All segments are screen-vertical or screen-horizontal — no diagonals
- [x] L-routes use height normalization (elbow at topmost endpoint height)
- [x] Beam proportions match block-based ratios (thickness = thin layer height)
- [x] 5 connection types differentiated by color (pin hole style is bonus)
- [ ] No "pillar through block" artifacts — correct depth ordering
- [x] All existing interactions preserved (select, hover, delete, diff)
- [x] Tests pass, lint clean, build succeeds
