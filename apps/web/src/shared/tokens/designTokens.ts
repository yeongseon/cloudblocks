import { BLOCK_VISUAL_PROFILES } from '../types/visualProfile';
import type { BlockCategory } from '../types/index';
import type { BrickSizeTier } from '../types/visualProfile';

// -- Isometric Grid --
export const TILE_W = 64;
export const TILE_H = 32;
export const TILE_Z = 32;

// -- Block Rendering --
export const BLOCK_MARGIN = 10;
export const BLOCK_PADDING = 10;
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
export const STUD_RX = 12;
export const STUD_RY = 6;
export const STUD_HEIGHT = 5;
export const STUD_INNER_RX = 7.2;
export const STUD_INNER_RY = 3.6;
export const STUD_INNER_OPACITY = 0.3;

// -- Edge Highlight --
export const EDGE_HIGHLIGHT_STROKE_WIDTH = 2;
export const EDGE_HIGHLIGHT_OPACITY = 0.3;
export const EDGE_HIGHLIGHT_COLOR = '#ffffff';

// -- Face Stroke --
export const TOP_FACE_STROKE_WIDTH = 1;
export const TOP_FACE_STROKE_OPACITY = 0.6;
