import { parseEndpointId } from '@cloudblocks/schema';
import { activeFixture } from './activeFixture';
import { endpointBlocks, resources } from './geometry';

export interface Relationship {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  semantic: 'http' | 'data';
}

export const relationships: Relationship[] = activeFixture.connections.map((connection) => {
  const [source, target] = endpointBlocks(connection);
  const semantic = parseEndpointId(connection.from)?.semantic;
  if (semantic !== 'http' && semantic !== 'data') {
    throw new Error(`Unsupported relationship semantic: ${connection.id}`);
  }
  return {
    id: connection.id,
    sourceId: source.id,
    sourceName: source.name,
    targetId: target.id,
    targetName: target.name,
    semantic,
  };
});

export function relationshipsForBlock(blockId: string): Relationship[] {
  return relationships.filter((item) => item.sourceId === blockId || item.targetId === blockId);
}

export function connectedBlockIds(blockId: string): string[] {
  return [
    ...new Set(relationshipsForBlock(blockId).flatMap((item) => [item.sourceId, item.targetId])),
  ];
}

export function blockName(blockId: string): string {
  return resources.find((node) => node.id === blockId)?.name ?? blockId;
}
