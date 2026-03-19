import { BLOCK_VISUAL_PROFILES } from '../types/visualProfile';
import type { BlockCategory } from '../types/index';
import type { BrickSizeTier } from '../types/visualProfile';

// ═══════════════════════════════════════════════════════════════
// RENDER_SCALE — single source of truth for all spatial dimensions
// See CLOUDBLOCKS_SPEC_V2.md §1 (Unit System)
// At RENDER_SCALE=32, all derived values match v1.x production values.
// ═══════════════════════════════════════════════════════════════
export const RENDER_SCALE = 32; // px/CU — the ONLY magic number

// -- Isometric Grid (derived from RENDER_SCALE) --
export const TILE_W = RENDER_SCALE * 2;        // 64
export const TILE_H = RENDER_SCALE;             // 32
export const TILE_Z = RENDER_SCALE;             // 32

// -- Block Rendering (derived from RENDER_SCALE) --
export const BLOCK_MARGIN = RENDER_SCALE * 5 / 16;   // 10
export const BLOCK_PADDING = RENDER_SCALE * 5 / 16;  // 10
export const BLOCK_WORLD_HEIGHT = 0.8;
export const TIER_HEIGHTS: Record<BrickSizeTier, number> = {
  signal: 0.5,
  light: 0.6,
  service: 0.8,
  core: 1.0,
  anchor: 1.2,
};

export function getBlockWorldHeight(category: BlockCategory): number {
  const { tier } = BLOCK_VISUAL_PROFILES[category];
  return TIER_HEIGHTS[tier];
}

// -- Universal Stud Standard (INVIOLABLE) --
// Geometry derived from RENDER_SCALE. At RENDER_SCALE=32:
//   STUD_RX=12, STUD_RY=6, STUD_HEIGHT=5, STUD_INNER_RX=7.2, STUD_INNER_RY=3.6
// Every stud in the system uses identical dimensions. Only colors vary.
export const STUD_RX = RENDER_SCALE * 3 / 8;        // 12
export const STUD_RY = STUD_RX / 2;                  // 6
export const STUD_HEIGHT = RENDER_SCALE * 5 / 32;    // 5
export const STUD_INNER_RX = RENDER_SCALE * 9 / 40;   // 7.2  (= STUD_RX × 0.6, integer-friendly)
export const STUD_INNER_RY = RENDER_SCALE * 9 / 80;   // 3.6  (= STUD_INNER_RX / 2)
export const STUD_INNER_OPACITY = 0.3;

// -- Edge Highlight --
export const EDGE_HIGHLIGHT_STROKE_WIDTH = 2;
export const EDGE_HIGHLIGHT_OPACITY = 0.3;
export const EDGE_HIGHLIGHT_COLOR = '#ffffff';

// -- Face Stroke --
export const TOP_FACE_STROKE_WIDTH = 1;
export const TOP_FACE_STROKE_OPACITY = 0.6;
