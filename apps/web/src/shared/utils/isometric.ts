/**
 * 2:1 Dimetric Isometric Projection
 *
 * World coordinates (worldX, worldY, worldZ) map to screen via:
 *   screenX = originX + (worldX - worldZ) * TILE_W / 2
 *   screenY = originY + (worldX + worldZ) * TILE_H / 2 - worldY * TILE_Z
 *
 * where TILE_W = SCALE, TILE_H = SCALE/2, TILE_Z = SCALE/2.
 *
 * World axes:
 *   X = right-back (screen: right-down)
 *   Z = left-back  (screen: left-down)
 *   Y = up         (screen: up, elevation)
 *
 * The 2:1 dimetric angle is ≈26.565° (atan(0.5)), giving clean 2:1
 * pixel ratios for crisp rendering.
 */

/** Pixels per world unit (tile width). */
export const SCALE = 64;

const TILE_W = SCALE;
const TILE_H = SCALE / 2;
const TILE_Z = SCALE / 2;

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Convert world position to screen position (2:1 dimetric isometric).
 *
 * @param worldX - World X position (right-back axis)
 * @param worldY - World Y position (elevation / up axis)
 * @param worldZ - World Z position (left-back axis)
 * @param originX - Screen origin X offset
 * @param originY - Screen origin Y offset
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  worldZ: number,
  originX = 0,
  originY = 0,
): ScreenPoint {
  return {
    x: originX + (worldX - worldZ) * TILE_W / 2,
    y: originY + (worldX + worldZ) * TILE_H / 2 - worldY * TILE_Z,
  };
}

/**
 * Convert screen position back to world position (2:1 dimetric isometric).
 *
 * Isometric screen→world is ambiguous without knowing the target worldY plane.
 * Provide the worldY value of the plane you're projecting onto (default 0 = ground).
 *
 * @param screenX - Screen X position
 * @param screenY - Screen Y position
 * @param worldY - Target world Y plane (elevation), default 0
 * @param originX - Screen origin X offset
 * @param originY - Screen origin Y offset
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  worldY = 0,
  originX = 0,
  originY = 0,
): { worldX: number; worldZ: number } {
  const sx = screenX - originX;
  const sy = screenY - originY + worldY * TILE_Z;
  return {
    worldX: sx / TILE_W + sy / TILE_H,
    worldZ: sy / TILE_H - sx / TILE_W,
  };
}

/**
 * Convert a screen-space drag delta to world-space delta.
 *
 * Used by drag handlers: when the mouse moves (dx, dy) pixels on screen,
 * this returns the corresponding (dWorldX, dWorldZ) movement in world space.
 *
 * @param dxScreen - Screen delta X (pixels)
 * @param dyScreen - Screen delta Y (pixels)
 */
export function screenDeltaToWorld(
  dxScreen: number,
  dyScreen: number,
): { dWorldX: number; dWorldZ: number } {
  return {
    dWorldX: dxScreen / TILE_W + dyScreen / TILE_H,
    dWorldZ: dyScreen / TILE_H - dxScreen / TILE_W,
  };
}

/**
 * Z-index / depth key for rendering order (isometric painter's algorithm).
 *
 * Uses layer-based sorting:
 *   sortKey = layer * 1_000_000 + frontness
 *
 * where frontness = worldX + worldZ + worldY (higher = closer to camera = rendered later).
 *
 * @param worldX - World X position
 * @param worldZ - World Z position
 * @param worldY - World Y position (elevation)
 * @param layer - Render layer: 0=plates, 1=actors, 2=blocks (default 0)
 */
export function depthKey(
  worldX: number,
  worldZ: number,
  worldY = 0,
  layer = 0,
): number {
  const frontness = worldX + worldZ + worldY;
  return Math.round(layer * 1_000_000 + frontness * 100);
}

/**
 * Convert world dimensions to screen pixel dimensions (isometric bounding box).
 *
 * Given a box of (width × depth × height) in world units, returns the screen
 * bounding box size. The isometric diamond for the floor is:
 *   screenWidth  = (width + depth) * TILE_W / 2
 *   screenHeight = (width + depth) * TILE_H / 2 + height * TILE_Z
 *
 * @param width - World width (X axis extent)
 * @param height - World height (Y axis extent / elevation)
 * @param depth - World depth (Z axis extent)
 */
export function worldSizeToScreen(
  width: number,
  height: number,
  depth: number,
): { screenWidth: number; screenHeight: number } {
  return {
    screenWidth: (width + depth) * TILE_W / 2,
    screenHeight: (width + depth) * TILE_H / 2 + height * TILE_Z,
  };
}

export const GRID_CELL = 3.0;

export function snapToGrid(worldX: number, worldZ: number): { x: number; z: number } {
  return {
    x: Math.round(worldX / GRID_CELL) * GRID_CELL,
    z: Math.round(worldZ / GRID_CELL) * GRID_CELL,
  };
}

export const ISO_X = TILE_W;
export const ISO_Y = TILE_H;
export const ELEV_Y = TILE_Z;
