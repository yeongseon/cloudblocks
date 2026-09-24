import type { Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import { activeFixture } from './activeFixture';

export type Mode = 'stacked' | 'three' | 'hybrid';
export type Moment = 'rest' | 'place' | 'reject' | 'connect' | 'select';

const byId = new Map(activeFixture.nodes.map((node) => [node.id, node]));
export const containers = activeFixture.nodes.filter(
  (node): node is ContainerBlock => node.kind === 'container',
);
export const resources = activeFixture.nodes.filter(
  (node): node is ResourceBlock => node.kind === 'resource',
);
export const colors: Record<Block['category'], string> = {
  network: '#286cd8',
  delivery: '#16a0d1',
  compute: '#13ab70',
  data: '#7955d8',
  messaging: '#dd9630',
  security: '#e98c37',
  identity: '#467cb1',
  operations: '#5d718c',
};

export type MovePositions = ReadonlyMap<string, { x: number; z: number; parentId: string | null }>;

export function parentOf(node: Block, moved: MovePositions): string | null {
  return moved.has(node.id) ? moved.get(node.id)!.parentId : node.parentId;
}

export function location(
  node: Block,
  moved: MovePositions = new Map(),
): { x: number; z: number; depth: number } {
  const position = moved.get(node.id) ?? node.position;
  const parentId = parentOf(node, moved);
  if (parentId === null) return { x: position.x, z: position.z, depth: 0 };
  const parent = byId.get(parentId);
  if (!parent || parent.kind !== 'container') throw new Error(`Missing parent for ${node.id}`);
  const origin = location(parent, moved);
  return { x: origin.x + position.x, z: origin.z + position.z, depth: origin.depth + 1 };
}

export function endpointBlocks(
  connection: (typeof activeFixture.connections)[number],
): [ResourceBlock, ResourceBlock] {
  const from = byId.get(parseEndpointId(connection.from)?.blockId ?? '');
  const to = byId.get(parseEndpointId(connection.to)?.blockId ?? '');
  if (!from || from.kind !== 'resource' || !to || to.kind !== 'resource') {
    throw new Error(`Invalid connection: ${connection.id}`);
  }
  return [from, to];
}
