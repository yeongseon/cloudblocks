import type { Block, Plate, ExternalActor } from '../types/index';

// ─── Constants ────────────────────────────────────────────

/** Grid cell spacing used for block snap-to-grid placement. */
export const GRID_CELL = 3.0;

/** Fixed world position for ExternalActor entities (above and behind the scene). */
export const EXTERNAL_ACTOR_POSITION: [number, number, number] = [-3, 0, 5];

/** Label position offset above ExternalActor (y + 1 from actor position). */
export const EXTERNAL_ACTOR_LABEL_POSITION: [number, number, number] = [
  EXTERNAL_ACTOR_POSITION[0],
  EXTERNAL_ACTOR_POSITION[1] + 1,
  EXTERNAL_ACTOR_POSITION[2],
];

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
    return [...EXTERNAL_ACTOR_POSITION];
  }

  return null;
}
