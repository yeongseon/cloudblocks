/**
 * The one placement geometry contract (#1958).
 *
 * Before this module, three pieces of code disagreed:
 *
 * - live movement compared blocks as **centre + half-extents**
 * - `validateNoOverlap` compared them as **corner + full extents**, so an
 *   asymmetric pair could be "overlapping" during a drag and "fine" during
 *   validation, or the reverse
 * - `nextGridPosition` emitted tenths (0.2 spacing) while
 *   `validateGridAlignment` accepted integers only, so a position the editor
 *   generated could not pass the validator the editor ships
 *
 * Every placement path now goes through the definitions here.
 */

export interface PlanarPosition {
  readonly x: number;
  readonly z: number;
}

export interface PlanarSize {
  readonly width: number;
  readonly depth: number;
}

export interface PlanarBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/**
 * `position` is the **centre** of a block on the XZ plane, and `width`/`depth`
 * are its full extents — so a 2×2 block at `x: 3` spans `2..4`, not `3..5`.
 */
export function planarBounds(position: PlanarPosition, size: PlanarSize): PlanarBounds {
  const halfWidth = size.width / 2;
  const halfDepth = size.depth / 2;

  return {
    minX: position.x - halfWidth,
    maxX: position.x + halfWidth,
    minZ: position.z - halfDepth,
    maxZ: position.z + halfDepth,
  };
}

/**
 * Axis-aligned overlap on the XZ plane.
 *
 * Edge-touch is **not** overlap: two blocks whose faces meet exactly are
 * adjacent, not colliding. The comparison is strict on purpose so that a grid
 * with zero gap remains placeable.
 */
export function planarOverlap(
  positionA: PlanarPosition,
  sizeA: PlanarSize,
  positionB: PlanarPosition,
  sizeB: PlanarSize,
): boolean {
  const a = planarBounds(positionA, sizeA);
  const b = planarBounds(positionB, sizeB);

  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/**
 * Committed positions are integer Cloud Units.
 *
 * Transient drag coordinates are continuous — snapping happens once, when the
 * gesture commits — so this is the contract for anything stored in the model,
 * including generated and reflowed layouts.
 */
export function isGridAligned(position: PlanarPosition): boolean {
  return Number.isInteger(position.x) && Number.isInteger(position.z);
}

export function snapToGrid(position: PlanarPosition): PlanarPosition {
  return { x: Math.round(position.x), z: Math.round(position.z) };
}
