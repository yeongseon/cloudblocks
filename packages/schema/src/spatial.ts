// CloudBlocks Schema — Spatial types

/**
 * 2D position with z-layer ordering.
 */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D bounding size.
 */
export interface Size {
  width: number;
  height: number;
  depth: number;
}
