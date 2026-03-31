import type { ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { isExternalResourceType } from '@cloudblocks/schema';

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
 * Resolve the world position of a connection endpoint (block).
 * Returns null if the endpoint cannot be found.
 */
export function getEndpointWorldPosition(
  id: string,
  blocks: ResourceBlock[],
  plates: ContainerBlock[],
): [number, number, number] | null {
  const block = blocks.find((b) => b.id === id);
  if (block) {
    if (
      block.parentId === null &&
      (Boolean(block.roles?.includes('external')) || isExternalResourceType(block.resourceType))
    ) {
      return [block.position.x, block.position.y, block.position.z];
    }

    const container = plates.find((p) => p.id === block.parentId);
    if (container) {
      return getBlockWorldPosition(block, container);
    }
  }

  return null;
}
