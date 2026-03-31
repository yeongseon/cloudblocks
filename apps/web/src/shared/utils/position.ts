import type { ContainerBlock, ExternalActor, ResourceBlock } from '@cloudblocks/schema';
import { isExternalResourceType } from '@cloudblocks/schema';

// ─── Constants ────────────────────────────────────────────

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
 * Calculate the absolute world position of a block, given its parent container.
 * Block positions are stored relative to their parent container.
 */
export function getBlockWorldPosition(
  block: ResourceBlock,
  parentPlate: ContainerBlock,
): [number, number, number] {
  return [
    parentPlate.position.x + block.position.x,
    parentPlate.position.y + parentPlate.frame.height,
    parentPlate.position.z + block.position.z,
  ];
}

/**
 * Resolve the world position of a connection endpoint (block or external actor).
 * Returns null if the endpoint cannot be found.
 */
export function getEndpointWorldPosition(
  id: string,
  blocks: ResourceBlock[],
  plates: ContainerBlock[],
  externalActors: ExternalActor[],
): [number, number, number] | null {
  // During the bridge period, prefer externalActors over nodes when IDs collide
  // (moveActorPosition only updates externalActors[], same as endpointResolver).
  const actor = externalActors.find((a) => a.id === id);
  if (actor) {
    const base = actor.position
      ? toTuple(actor.position)
      : ([...EXTERNAL_ACTOR_POSITION] as [number, number, number]);
    base[1] += EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET;
    return base;
  }

  // Check blocks
  const block = blocks.find((b) => b.id === id);
  if (block) {
    if (
      block.parentId === null &&
      (Boolean(block.roles?.includes('external')) || isExternalResourceType(block.resourceType))
    ) {
      return [
        block.position.x,
        block.position.y + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
        block.position.z,
      ];
    }

    const container = plates.find((p) => p.id === block.parentId);
    if (container) {
      return getBlockWorldPosition(block, container);
    }
  }

  return null;
}
