const ISO_X = 64;
const ISO_Y = ISO_X * 0.38;
const ELEV_Y = 56;

export interface ScreenPoint {
  x: number;
  y: number;
}

// screenX = originX + (worldX - worldZ) * ISO_X
// screenY = originY + (worldX + worldZ) * ISO_Y - worldY * ELEV_Y
export function worldToScreen(
  worldX: number,
  worldY: number,
  worldZ: number,
  originX = 0,
  originY = 0,
): ScreenPoint {
  return {
    x: originX + (worldX - worldZ) * ISO_X,
    y: originY + (worldX + worldZ) * ISO_Y - worldY * ELEV_Y,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  worldY = 0,
  originX = 0,
  originY = 0,
): { worldX: number; worldZ: number } {
  const dx = screenX - originX;
  const dy = screenY - originY + worldY * ELEV_Y;
  return {
    worldX: (dx / ISO_X + dy / ISO_Y) / 2,
    worldZ: (dy / ISO_Y - dx / ISO_X) / 2,
  };
}

export function depthKey(worldX: number, worldZ: number, worldY = 0): number {
  return Math.round((worldX + worldZ) * 100 + worldY * 10000);
}

export function worldSizeToScreen(
  width: number,
  height: number,
  depth: number,
): { screenWidth: number; screenHeight: number } {
  return {
    screenWidth: (width + depth) * ISO_X,
    screenHeight: (width + depth) * ISO_Y + height * ELEV_Y,
  };
}

export const GRID_CELL = 3.0;

export function snapToGrid(worldX: number, worldZ: number): { x: number; z: number } {
  return {
    x: Math.round(worldX / GRID_CELL) * GRID_CELL,
    z: Math.round(worldZ / GRID_CELL) * GRID_CELL,
  };
}

export { ISO_X, ISO_Y, ELEV_Y };
