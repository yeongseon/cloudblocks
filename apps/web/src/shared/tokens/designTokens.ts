// ═══════════════════════════════════════════════════════════════
// RENDER_SCALE — single source of truth for all spatial dimensions
// See CLOUDBLOCKS_SPEC_V2.md §1 (Unit System)
// At RENDER_SCALE=32, all derived values match v1.x production values.
// ═══════════════════════════════════════════════════════════════
export const RENDER_SCALE = 32; // px/CU — the ONLY magic number

// -- Isometric Grid (derived from RENDER_SCALE) --
export const TILE_W = RENDER_SCALE * 2; // 64
export const TILE_H = RENDER_SCALE; // 32
export const TILE_Z = RENDER_SCALE; // 32

// -- Block Rendering (derived from RENDER_SCALE) --
export const BLOCK_MARGIN = (RENDER_SCALE * 5) / 16; // 10
export const BLOCK_PADDING = (RENDER_SCALE * 5) / 16; // 10

// -- Edge Highlight --
export const EDGE_HIGHLIGHT_STROKE_WIDTH = 2;
export const EDGE_HIGHLIGHT_OPACITY = 0.18;
export const EDGE_HIGHLIGHT_COLOR = '#ffffff';

// -- Connection Trace --
// Flat 2-layer SVG path connections on container block surfaces.
// Replaces the previous 3D polygon beam system.
export const CONNECTION_WIDTH_CU = 1;
export const CONNECTION_HEIGHT_CU = 1 / 3;

// Trace stroke dimensions (screen-space px).
export const TRACE_STROKE_PX = 2; // inner visible stroke
export const TRACE_CASE_PX = 4; // outer casing stroke
export const TRACE_HOVER_PX = 3; // inner stroke on hover/selected (Oracle: 2.5 too subtle)
export const TRACE_FLASH_PX = 2; // snap-flash animation stroke
export const TRACE_HOVER_CASE_PX = 5; // outer casing on hover/selected

// Arrow marker dimensions (target-end arrowhead)
export const ARROW_MARKER_W = 6; // markerWidth
export const ARROW_MARKER_H = 6; // markerHeight
export const ARROW_MARKER_REF_X = 5.5; // refX — tip lands just before block edge

// -- Face Stroke --
export const TOP_FACE_STROKE_WIDTH = 1;
export const TOP_FACE_STROKE_OPACITY = 0.45;

// -- Port Visuals (Connection Anchor Points) --
// Small screen-space offset so connector endpoints sit just outside block face.
export const PORT_OUT_PX = 8;
// Port dot dimensions for visual rendering on block faces (BlockSvg).
export const PORT_DOT_RX = 12;
export const PORT_DOT_RY = 6;
export const PORT_DOT_HEIGHT = 5; // Isometric height offset for 3-layer port glyph shadow
export const PORT_DOT_STROKE_WIDTH = 1.5;
export const PORT_DOT_OPACITY = 0.7;
export const PORT_DOT_ACTIVE_OPACITY = 1.0;
export const PORT_DOT_OCCUPIED_OPACITY = 0.4; // Dim but always-visible occupied port
// -- Port Semantic Colors (Endpoint Types) --
// Colors match endpoint semantic types: http, event, data.
// Used for port dot rendering in connect mode.
export const PORT_COLOR_HTTP = '#3B82F6'; // Blue — HTTP traffic
export const PORT_COLOR_EVENT = '#F59E0B'; // Amber — event/async
export const PORT_COLOR_DATA = '#14B8A6'; // Teal — data/dataflow
export const PORT_COLOR_OCCUPIED = '#475569'; // Slate — occupied port (dimmed)
export const PORT_GLOW_RADIUS = 4; // SVG filter blur radius for port glow

// -- Face Label Typography (SVG text on block/container side walls) --
// Shared floor and scale factor for the face label font-size formula:
//   fontSize = Math.max(LABEL_FACE_MIN_PX, Math.round(sideWallPx * LABEL_FACE_SCALE))
export const LABEL_FACE_MIN_PX = 8;
export const LABEL_FACE_SCALE = 0.28;

// -- Connection Corner Radius --
// Radius in screen px for rounded orthogonal connection corners.
// Safe for 32-128px segment lengths. Must be ≤ min(segLen)/2.
export const CONNECTION_CORNER_RADIUS = 12;
