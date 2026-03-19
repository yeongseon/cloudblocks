import type { Block, Plate, ExternalActor } from '../types/index';

// ─── Constants ────────────────────────────────────────────

/** @deprecated Import GRID_CELL from './isometric' instead. Re-exported for backward compatibility. */
export { GRID_CELL } from './isometric';

/** Fixed world position for ExternalActor entities (above and behind the scene). */
export const EXTERNAL_ACTOR_POSITION: [number, number, number] = [-3, 0, 5];

/** Label position offset above ExternalActor (y + 1 from actor position). */
export const EXTERNAL_ACTOR_LABEL_POSITION: [number, number, number] = [
  EXTERNAL_ACTOR_POSITION[0],
  EXTERNAL_ACTOR_POSITION[1] + 1,
  EXTERNAL_ACTOR_POSITION[2],
];

function toTuple(position: ExternalActor['position']): [number, number, number] {
  return [position.x, position.y, position.z];
}

// ─── Position Calculations ────────────────────────────────

/**
 * Calculate the absolute world position of a block, given its parent plate.
 * Block positions are stored relative to their parent plate.
 */
export function getBlockWorldPosition(
  block: Block,
  parentPlate: Plate
): [number, number, number] {
  return [
    parentPlate.position.x + block.position.x,
    parentPlate.position.y + parentPlate.size.height,
    parentPlate.position.z + block.position.z,
  ];
}

/**
 * Resolve the world position of a connection endpoint (block or external actor).
 * Returns null if the endpoint cannot be found.
 */
export function getEndpointWorldPosition(
  id: string,
  blocks: Block[],
  plates: Plate[],
  externalActors: ExternalActor[]
): [number, number, number] | null {
  // Check blocks
  const block = blocks.find((b) => b.id === id);
  if (block) {
    const plate = plates.find((p) => p.id === block.placementId);
    if (plate) {
      return getBlockWorldPosition(block, plate);
    }
  }

  // Check external actors (fixed position above the scene)
  const actor = externalActors.find((a) => a.id === id);
  if (actor) {
    if (actor.position) {
      return toTuple(actor.position);
    }

    return [...EXTERNAL_ACTOR_POSITION];
  }

  return null;
}
