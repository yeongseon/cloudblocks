import type { ArchitectureModel, ContainerCapableResourceType, ContainerNode, LeafNode, ResourceCategory } from '@cloudblocks/schema';

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

export type LegacyPlateOverrides = Partial<Omit<ContainerNode, 'kind' | 'layer' | 'resourceType' | 'category' | 'provider'>> & {
  type?: ContainerNode['layer'];
  children?: string[];
};

export type LegacyBlockOverrides = Partial<Omit<LeafNode, 'kind' | 'layer' | 'resourceType' | 'category' | 'provider' | 'parentId'>> & {
  resourceType?: string;
  category?: ResourceCategory | LegacyCategory;
  placementId?: string;
  parentId?: string | null;
  provider?: LeafNode['provider'];
};

export type LegacyArchitectureOverrides = Partial<Omit<ArchitectureModel, 'nodes'>> & {
  plates?: ContainerNode[];
  blocks?: LeafNode[];
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

export function makeTestPlate(overrides: LegacyPlateOverrides = {}): ContainerNode {
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

export function makeTestBlock(overrides: LegacyBlockOverrides = {}): LeafNode {
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

export const getPlates = (architecture: ArchitectureModel): ContainerNode[] =>
  architecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');

export const getBlocks = (architecture: ArchitectureModel): LeafNode[] =>
  architecture.nodes.filter((node): node is LeafNode => node.kind === 'resource');
