import type { Block, Plate, ExternalActor } from '../types/index';

// ─── Constants ────────────────────────────────────────────

/** @deprecated Import GRID_CELL from './isometric' instead. Re-exported for backward compatibility. */
export { GRID_CELL } from './isometric';

/** Fixed world position for ExternalActor entities (above and behind the scene). */
export const EXTERNAL_ACTOR_POSITION: [number, number, number] = [-3, 0, 5];

/**
 * World-Y offset so that connection endpoints land on the visual center
 * of the ExternalActorSprite globe rather than its world-coordinate anchor.
 *
 * The sprite is rendered with CSS `translate(-50%, 58%)` on a 132×117 px
 * element whose SVG globe center sits at 51.4% of its height.
 * Total screen-Y displacement from the anchor = 117×0.58 + 117×(72/140) ≈ 128 px.
 * Converting to world units: 128 / TILE_Z(32) = 4.
 * Subtracting worldY pushes the screen position *down* (screenY increases),
 * so we apply −4 to shift the endpoint down to the globe's visual center.
 */
export const EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET = -4;

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

  const actor = externalActors.find((a) => a.id === id);
  if (actor) {
    const base = actor.position ? toTuple(actor.position) : [...EXTERNAL_ACTOR_POSITION] as [number, number, number];
    base[1] += EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET;
    return base;
  }

  return null;
}
