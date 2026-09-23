import type { ResourceBlock } from '@cloudblocks/schema';
import { validateBlockPlacement } from '@cloudblocks/domain';
import { blocksOverlapAABB } from '../../web/src/entities/store/slices/helpers';
import { getBlockDimensions } from '../../web/src/shared/types/visualProfile';
import { activeFixture } from './activeFixture';
import { location, parentOf } from './geometry';
import type { MovePositions } from './geometry';

const rootPaaS = new Set([
  'app_service',
  'function_compute',
  'sql_database',
  'key_vault',
  'cache_store',
]);

export interface StudyPlacement {
  x: number;
  z: number;
  parentId: string | null;
}

export type MoveResult =
  | { valid: true; position: StudyPlacement }
  | { valid: false; reason: 'boundary' | 'overlap' | 'parent' };

export function validateStudyMove(
  block: ResourceBlock,
  candidate: { x: number; z: number },
  moved: MovePositions,
  parentId: string | null = parentOf(block, moved),
): MoveResult {
  const position = { x: Math.round(candidate.x), z: Math.round(candidate.z), parentId };
  if (rootPaaS.has(block.resourceType) && parentId !== null) {
    return { valid: false, reason: 'parent' };
  }
  const candidateNode = { ...block, parentId, position: { ...block.position, ...position } };
  if (validateBlockPlacement(candidateNode, activeFixture.nodes).length > 0) {
    return { valid: false, reason: 'parent' };
  }
  const size = getBlockDimensions(block.category, block.provider, block.subtype);
  const current = moved.get(block.id) ?? { ...block.position, parentId: block.parentId };
  if (parentId === null) {
    const network = activeFixture.nodes.find((node) => node.id === 'vnet');
    if (
      network?.kind === 'container' &&
      Math.abs(position.x) < network.frame.width / 2 + size.width / 2 &&
      Math.abs(position.z) < network.frame.depth / 2 + size.depth / 2
    ) {
      return { valid: false, reason: 'boundary' };
    }
  }
  if (parentId) {
    const parent = activeFixture.nodes.find((node) => node.id === parentId);
    if (!parent || parent.kind !== 'container') return { valid: false, reason: 'parent' };
    if (
      Math.abs(position.x) + size.width / 2 > parent.frame.width / 2 ||
      Math.abs(position.z) + size.depth / 2 > parent.frame.depth / 2
    )
      return { valid: false, reason: 'boundary' };
  }
  const overlapsAt = (candidatePosition: { x: number; z: number }): boolean =>
    activeFixture.nodes.some((sibling) => {
      if (
        sibling.kind !== 'resource' ||
        sibling.id === block.id ||
        parentOf(sibling, moved) !== parentId
      )
        return false;
      const siblingSize = getBlockDimensions(sibling.category, sibling.provider, sibling.subtype);
      return blocksOverlapAABB(
        candidatePosition,
        size,
        moved.get(sibling.id) ?? sibling.position,
        siblingSize,
      );
    });
  if (overlapsAt(position) && !(current.parentId === parentId && overlapsAt(current))) {
    return { valid: false, reason: 'overlap' };
  }
  return { valid: true, position };
}

export function relativeFromWorld(
  block: ResourceBlock,
  world: { x: number; z: number },
  moved: MovePositions,
  parentId: string | null = parentOf(block, moved),
): { x: number; z: number } {
  const parent = activeFixture.nodes.find((node) => node.id === parentId);
  if (!parent) return world;
  const origin = location(parent, moved);
  return { x: world.x - origin.x, z: world.z - origin.z };
}

export function destinationParent(world: { x: number; z: number }): string | null {
  const subnet = activeFixture.nodes.find((node) => {
    if (node.kind !== 'container' || node.layer !== 'subnet') return false;
    const center = location(node);
    return (
      Math.abs(world.x - center.x) <= node.frame.width / 2 &&
      Math.abs(world.z - center.z) <= node.frame.depth / 2
    );
  });
  return subnet?.id ?? null;
}

export function firstAvailableInParent(
  block: ResourceBlock,
  moved: MovePositions,
  parentId: string,
): MoveResult {
  const parent = activeFixture.nodes.find((node) => node.id === parentId);
  if (!parent || parent.kind !== 'container') return { valid: false, reason: 'parent' };
  for (let z = Math.floor(parent.frame.depth / 2); z >= -Math.floor(parent.frame.depth / 2); z--) {
    for (
      let x = -Math.floor(parent.frame.width / 2);
      x <= Math.floor(parent.frame.width / 2);
      x++
    ) {
      const result = validateStudyMove(block, { x, z }, moved, parentId);
      if (result.valid) return result;
    }
  }
  return { valid: false, reason: 'overlap' };
}
