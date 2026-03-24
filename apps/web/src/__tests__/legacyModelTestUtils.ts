import type {
  ArchitectureModel,
  ContainerCapableResourceType,
  ContainerBlock,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import { generateEndpointsForBlock } from '@cloudblocks/schema';

type LegacyCategory =
  | 'database'
  | 'storage'
  | 'gateway'
  | 'function'
  | 'queue'
  | 'event'
  | 'analytics'
  | 'identity'
  | 'observability';

export type LegacyPlateOverrides = Partial<
  Omit<ContainerBlock, 'kind' | 'layer' | 'resourceType' | 'category' | 'provider'>
> & {
  type?: ContainerBlock['layer'];
  children?: string[];
};

export type LegacyBlockOverrides = Partial<
  Omit<ResourceBlock, 'kind' | 'layer' | 'resourceType' | 'category' | 'provider' | 'parentId'>
> & {
  resourceType?: string;
  category?: ResourceCategory | LegacyCategory;
  placementId?: string;
  parentId?: string | null;
  provider?: ResourceBlock['provider'];
};

export type LegacyArchitectureOverrides = Partial<Omit<ArchitectureModel, 'nodes'>> & {
  plates?: ContainerBlock[];
  blocks?: ResourceBlock[];
  nodes?: ArchitectureModel['nodes'];
};

const mapCategory = (category: ResourceCategory | LegacyCategory | undefined): ResourceCategory => {
  if (category === 'database' || category === 'storage') {
    return 'data';
  }
  if (category === 'gateway') {
    return 'delivery';
  }
  if (category === 'function') {
    return 'compute';
  }
  if (category === 'queue' || category === 'event') {
    return 'messaging';
  }
  if (category === 'analytics' || category === 'observability') {
    return 'operations';
  }
  if (category === 'identity') {
    return 'identity';
  }
  return category ?? 'compute';
};

export function makeTestPlate(overrides: LegacyPlateOverrides = {}): ContainerBlock {
  return {
    id: 'plate-1',
    name: 'Plate',
    kind: 'container',
    layer: overrides.type ?? 'subnet',
    resourceType: ((): ContainerCapableResourceType => {
      const t = overrides.type ?? 'subnet';
      if (t === 'subnet') return 'subnet';
      return 'virtual_network';
    })(),
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  };
}

export function makeTestBlock(overrides: LegacyBlockOverrides = {}): ResourceBlock {
  const {
    category: overrideCategory,
    placementId,
    parentId: overrideParentId,
    provider,
    ...rest
  } = overrides;
  const category = mapCategory(overrideCategory);
  const parentId = placementId ?? overrideParentId ?? 'plate-1';
  return {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: category,
    category,
    provider: provider ?? 'azure',
    parentId,
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...rest,
  };
}

export function makeTestArchitecture(
  overrides: LegacyArchitectureOverrides = {},
): ArchitectureModel {
  const now = '2026-01-01T00:00:00Z';
  const nodes = [
    ...(overrides.plates ?? []),
    ...(overrides.blocks ?? []),
    ...(overrides.nodes ?? []),
  ];
  const actors = overrides.externalActors ?? [];
  // Auto-generate endpoints from all node/actor IDs.
  // Empty endpoints array (the common test default) triggers auto-generation.
  // Only a non-empty explicit array is preserved as-is.
  const explicitEndpoints = overrides.endpoints;
  const shouldAutoGenerate = !explicitEndpoints || explicitEndpoints.length === 0;
  const endpoints = shouldAutoGenerate
    ? [...nodes.map((n) => n.id), ...actors.map((a) => a.id)].flatMap((id) =>
        generateEndpointsForBlock(id),
      )
    : explicitEndpoints;
  return {
    id: 'arch-1',
    name: 'Architecture',
    version: '1',
    nodes,
    connections: [],
    externalActors: actors,
    createdAt: now,
    updatedAt: now,
    ...overrides,
    // Always apply auto-generated endpoints (overrides spread may re-set endpoints to [])
    endpoints,
  };
}

export const getPlates = (architecture: ArchitectureModel): ContainerBlock[] =>
  architecture.nodes.filter((node): node is ContainerBlock => node.kind === 'container');

export const getBlocks = (architecture: ArchitectureModel): ResourceBlock[] =>
  architecture.nodes.filter((node): node is ResourceBlock => node.kind === 'resource');
