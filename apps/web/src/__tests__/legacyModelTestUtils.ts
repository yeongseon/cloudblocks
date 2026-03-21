import type { ArchitectureModel, Block, ContainerCapableResourceType, Plate, ResourceCategory } from '@cloudblocks/schema';

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

export type LegacyPlateOverrides = Partial<Omit<Plate, 'kind' | 'layer' | 'resourceType' | 'category' | 'provider'>> & {
  type?: Plate['layer'];
  children?: string[];
};

export type LegacyBlockOverrides = Partial<Omit<Block, 'kind' | 'layer' | 'resourceType' | 'category' | 'provider' | 'parentId'>> & {
  resourceType?: string;
  category?: ResourceCategory | LegacyCategory;
  placementId?: string;
  parentId?: string | null;
  provider?: Block['provider'];
};

export type LegacyArchitectureOverrides = Partial<Omit<ArchitectureModel, 'nodes'>> & {
  plates?: Plate[];
  blocks?: Block[];
  nodes?: ArchitectureModel['nodes'];
};

const mapCategory = (category: ResourceCategory | LegacyCategory | undefined): ResourceCategory => {
  if (category === 'database' || category === 'storage') {
    return 'data';
  }
  if (category === 'gateway') {
    return 'edge';
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
    return 'security';
  }
  return category ?? 'compute';
};

export function makeTestPlate(overrides: LegacyPlateOverrides = {}): Plate {
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
    size: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  };
}

export function makeTestBlock(overrides: LegacyBlockOverrides = {}): Block {
  const { category: overrideCategory, placementId, parentId: overrideParentId, provider, ...rest } = overrides;
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

export function makeTestArchitecture(overrides: LegacyArchitectureOverrides = {}): ArchitectureModel {
  const now = '2026-01-01T00:00:00Z';
  return {
    id: 'arch-1',
    name: 'Architecture',
    version: '1',
    nodes: [...(overrides.plates ?? []), ...(overrides.blocks ?? []), ...(overrides.nodes ?? [])],
    connections: [],
    externalActors: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export const getPlates = (architecture: ArchitectureModel): Plate[] =>
  architecture.nodes.filter((node): node is Plate => node.kind === 'container');

export const getBlocks = (architecture: ArchitectureModel): Block[] =>
  architecture.nodes.filter((node): node is Block => node.kind === 'resource');
