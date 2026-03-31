import type { ExternalActor, ResourceBlock, ResourceCategory } from '@cloudblocks/schema';
import { isExternalResourceType } from '@cloudblocks/schema';
import { EXTERNAL_ACTOR_POSITION } from '../../shared/utils/position';

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
  externalActors: ExternalActor[] = [],
): EndpointSource | null {
  // Post-bridge: prefer the node (ResourceBlock) when it exists, because
  // moveExternalBlockPosition() keeps both nodes[] and externalActors[] in sync,
  // and blocks use proper block geometry for port anchors.
  // Fall back to the actor copy only when no migrated node exists.
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

  const actor = externalActors.find((candidate) => candidate.id === blockId);
  if (actor) {
    return {
      id: actor.id,
      category: 'delivery',
      resourceType: actor.type,
      position: actor.position ?? {
        x: EXTERNAL_ACTOR_POSITION[0],
        y: EXTERNAL_ACTOR_POSITION[1],
        z: EXTERNAL_ACTOR_POSITION[2],
      },
      parentId: null,
      isExternal: true,
    };
  }

  return null;
}
