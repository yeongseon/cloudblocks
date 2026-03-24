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
export const EDGE_HIGHLIGHT_OPACITY = 0.3;
export const EDGE_HIGHLIGHT_COLOR = '#ffffff';

// -- Connection Block --
// Flat isometric connection indicators on container block surfaces.
// Width = 1 CU (same as block pitch), height = ⅓ block height.
export const CONNECTION_WIDTH_CU = 1;
export const CONNECTION_HEIGHT_CU = 1 / 3;

// -- Connector Beam --
// Derived from block connector proportions.
// Block pitch = 1 CU, container block height = ⅓ block.
// We use a thin beam (0.5 CU wide) for visual clarity at our render scale.
export const BEAM_WIDTH_CU = 0.5; // beam is half a block wide
export const BEAM_THICKNESS_CU = 1 / 3; // container block height = ⅓ block
export const BEAM_THICKNESS_PX = RENDER_SCALE * BEAM_THICKNESS_CU; // ~11px
export const PIN_HOLE_SPACING_CU = 1.0; // 1 hole per block pitch
export const PIN_HOLE_RX = (RENDER_SCALE * 3) / 20; // 4.8 (iso X radius)
export const PIN_HOLE_RY = PIN_HOLE_RX / 2; // 2.4 (iso Y radius)

// -- Face Stroke --
export const TOP_FACE_STROKE_WIDTH = 1;
export const TOP_FACE_STROKE_OPACITY = 0.6;

// -- Port Visuals (Connection Anchor Points) --
// Small screen-space offset so connector endpoints sit just outside block face.
export const PORT_OUT_PX = 8;
// Port dot dimensions for visual rendering on block faces (BlockSvg).
export const PORT_DOT_RX = 4;
export const PORT_DOT_RY = 2.5;
export const PORT_DOT_STROKE_WIDTH = 1.5;
export const PORT_DOT_OPACITY = 0.7;
export const PORT_DOT_ACTIVE_OPACITY = 1.0;
// -- Port Semantic Colors (Endpoint Types) --
// Colors match endpoint semantic types: http, event, data.
// Used for port dot rendering in connect mode.
export const PORT_COLOR_HTTP = '#3B82F6'; // Blue — HTTP traffic
export const PORT_COLOR_EVENT = '#F59E0B'; // Amber — event/async
export const PORT_COLOR_DATA = '#14B8A6'; // Teal — data/dataflow
export const PORT_COLOR_OCCUPIED = '#475569'; // Slate — occupied port (dimmed)
export const PORT_GLOW_RADIUS = 4; // SVG filter blur radius for port glow
