import type { ResourceBlock, ResourceCategory } from '@cloudblocks/schema';
import { isExternalResourceType } from '@cloudblocks/schema';

export type EndpointType = ResourceCategory | 'internet' | 'browser';

export interface EndpointSource {
  id: string;
  category: ResourceCategory;
  resourceType: string;
  position: { x: number; y: number; z: number };
  parentId: string | null;
  isExternal: boolean;
}

export function getEffectiveEndpointType(
  source: Pick<EndpointSource, 'category' | 'resourceType'>,
): EndpointType {
  if (isExternalResourceType(source.resourceType)) {
    return source.resourceType as EndpointType;
  }

  return source.category;
}

export function resolveEndpointSource(
  blockId: string,
  nodes: ResourceBlock[],
): EndpointSource | null {
  const block = nodes.find((candidate) => candidate.id === blockId);
  if (block) {
    return {
      id: block.id,
      category: block.category,
      resourceType: block.resourceType,
      position: block.position,
      parentId: block.parentId,
      isExternal:
        Boolean(block.roles?.includes('external')) || isExternalResourceType(block.resourceType),
    };
  }

  return null;
}
