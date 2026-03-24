import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useArchitectureStore } from '../entities/store/architectureStore';
import { validateArchitecture } from '../entities/validation/engine';
import { awsProviderDefinition } from '../features/generate/providers/aws';
import { awsSubtypeRegistry } from '../features/generate/providers/aws/subtypes';
import { azureProviderDefinition } from '../features/generate/providers/azure';
import { azureSubtypeRegistry } from '../features/generate/providers/azure/subtypes';
import { gcpProviderDefinition } from '../features/generate/providers/gcp';
import { gcpSubtypeRegistry } from '../features/generate/providers/gcp/subtypes';
import { resolveBlockMapping } from '../features/generate/types';
import type { ProviderDefinition } from '../features/generate/types';
import type { Workspace } from '../shared/types';
import type { ArchitectureModel, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { deserialize, serialize } from '../shared/types/schema';

type ContainerOverrides = Partial<
  Omit<ContainerBlock, 'kind' | 'layer' | 'resourceType' | 'category' | 'provider'>
>;

type LeafOverrides = Partial<
  Omit<ResourceBlock, 'kind' | 'layer' | 'resourceType' | 'category' | 'provider' | 'parentId'>
> & {
  category?: ResourceBlock['category'];
  provider?: ResourceBlock['provider'];
  parentId?: string | null;
};

type ResourceInput = LeafOverrides & Pick<ResourceBlock, 'id' | 'name' | 'position' | 'metadata'>;

type ArchitectureOverrides = Omit<Partial<ArchitectureModel>, 'nodes' | 'plates' | 'blocks'> & {
  nodes?: ArchitectureModel['nodes'];
  containers?: ContainerBlock[];
  resources?: Array<ResourceBlock | ResourceInput>;
};

const platesOf = (architecture: ArchitectureModel): ContainerBlock[] =>
  architecture.nodes.filter((node): node is ContainerBlock => node.kind === 'container');
const blocksOf = (architecture: ArchitectureModel): ResourceBlock[] =>
  architecture.nodes.filter((node): node is ResourceBlock => node.kind === 'resource');

function makePlate(overrides: ContainerOverrides = {}): ContainerBlock {
  return {
    id: 'plate-subnet-private',
    name: 'Subnet',
    kind: 'container',
    layer: 'subnet',
    resourceType: 'subnet',
    category: 'network',
    provider: 'azure',
    profileId: 'subnet-service',
    parentId: 'plate-network-1',
    position: { x: 0, y: 0.7, z: 0 },
    frame: { width: 8, height: 0.5, depth: 8 },
    metadata: {},
    ...overrides,
  };
}

function makeBlock(overrides: LeafOverrides = {}): ResourceBlock {
  return {
    id: 'block-1',
    name: 'Block One',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'web_compute',
    category: 'compute',
    provider: 'azure',
    parentId: overrides.parentId ?? 'plate-subnet-private',
    position: { x: 1, y: 0.5, z: 1 },
    metadata: {},
    ...overrides,
  };
}

function makeArchitecture(overrides: ArchitectureOverrides = {}): ArchitectureModel {
  const { containers = [makePlate()], resources = [], nodes = [], ...rest } = overrides;
  const normalizedResources: ResourceBlock[] = resources.map((resource) => {
    if ('kind' in resource && resource.kind === 'resource') {
      return resource;
    }
    return makeBlock(resource);
  });
  return {
    id: 'arch-1',
    name: 'Milestone 12 Integration',
    version: '1',
    nodes: [...containers, ...normalizedResources, ...nodes],
    connections: [],
    endpoints: [],
    externalActors: [
      {
        id: 'ext-internet',
        name: 'Internet',
        type: 'internet',
        position: { x: -3, y: 0, z: 5 },
      },
    ],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...rest,
  };
}

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws-1',
    name: 'Workspace 1',
    architecture: makeArchitecture(),
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function expectProviderSubtypeMappings(
  provider: ProviderDefinition,
  registry: Record<string, Record<string, unknown> | undefined>,
): void {
  for (const [category, categorySubtypes] of Object.entries(registry)) {
    if (!categorySubtypes) {
      continue;
    }

    for (const subtype of Object.keys(categorySubtypes)) {
      const resolved = resolveBlockMapping(
        provider.blockMappings,
        provider.subtypeBlockMappings,
        category as keyof ProviderDefinition['blockMappings'],
        subtype,
      );

      const expected =
        provider.subtypeBlockMappings?.[category as keyof ProviderDefinition['blockMappings']]?.[
          subtype
        ];
      expect(resolved).toEqual(expected);
      expect(resolved).toBeDefined();
    }
  }
}

describe('Milestone 12 Integration Tests', () => {
  describe('serialization roundtrip with subtypes', () => {
    it('preserves subtype and config through serialize and deserialize', () => {
      const architecture = makeArchitecture({
        resources: [
          makeBlock({
            id: 'aws-lambda-1',
            name: 'Lambda API',
            provider: 'aws',
            subtype: 'lambda',
            config: { runtime: 'nodejs20.x', memorySize: 512 },
          }),
          makeBlock({
            id: 'gcp-sql-1',
            name: 'Cloud SQL',
            category: 'data',
            provider: 'gcp',
            subtype: 'cloud-sql-postgres',
            config: { tier: 'db-f1-micro', databaseVersion: 'POSTGRES_15' },
          }),
        ],
      });

      const workspaces = [makeWorkspace({ architecture })];
      const roundtripped = deserialize(serialize(workspaces));

      expect(blocksOf(roundtripped[0].architecture)[0].subtype).toBe('lambda');
      expect(blocksOf(roundtripped[0].architecture)[0].config).toEqual({
        runtime: 'nodejs20.x',
        memorySize: 512,
      });
      expect(blocksOf(roundtripped[0].architecture)[1].subtype).toBe('cloud-sql-postgres');
      expect(blocksOf(roundtripped[0].architecture)[1].config).toEqual({
        tier: 'db-f1-micro',
        databaseVersion: 'POSTGRES_15',
      });
    });

    it('keeps mixed subtype and non-subtype blocks stable through roundtrip', () => {
      const architecture = makeArchitecture({
        resources: [
          makeBlock({ id: 'compute-legacy-1', name: 'Legacy Compute', provider: 'aws' }),
          makeBlock({
            id: 'compute-subtyped-1',
            name: 'Cloud Run Service',
            provider: 'gcp',
            subtype: 'cloud-run',
            config: { maxInstances: 20 },
          }),
        ],
      });

      const parsed = deserialize(serialize([makeWorkspace({ architecture })]));
      const [legacyBlock, subtypedBlock] = blocksOf(parsed[0].architecture);

      expect(legacyBlock.subtype).toBeUndefined();
      expect(legacyBlock.config).toBeUndefined();
      expect(subtypedBlock.subtype).toBe('cloud-run');
      expect(subtypedBlock.config).toEqual({ maxInstances: 20 });
    });
  });

  describe('validation with provider-specific rules', () => {
    it('returns warnings for AWS Lambda on subnet and unknown subtype in one architecture', () => {
      const architecture = makeArchitecture({
        resources: [
          makeBlock({
            id: 'lambda-subnet-1',
            name: 'Lambda Worker',
            provider: 'aws',
            category: 'compute',
            subtype: 'lambda',
          }),
          makeBlock({
            id: 'unknown-subtype-1',
            name: 'Mystery Compute',
            provider: 'aws',
            category: 'compute',
            subtype: 'mystery-compute',
          }),
        ],
      });

      const result = validateArchitecture(architecture);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings.map((warning) => warning.ruleId).sort()).toEqual([
        'rule-provider-aws-lambda-subnet',
        'rule-provider-unknown-subtype',
      ]);
    });

    it('does not warn for provider block when subtype is omitted', () => {
      const architecture = makeArchitecture({
        resources: [
          makeBlock({
            id: 'aws-compute-1',
            name: 'AWS Compute',
            provider: 'aws',
            category: 'compute',
          }),
        ],
      });

      const result = validateArchitecture(architecture);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('does not warn for known provider subtype outside special warning rules', () => {
      const architecture = makeArchitecture({
        resources: [
          makeBlock({
            id: 'gcp-run-1',
            name: 'Cloud Run',
            provider: 'gcp',
            category: 'compute',
            subtype: 'cloud-run',
          }),
        ],
      });

      const result = validateArchitecture(architecture);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('schema migration', () => {
    it('rejects legacy 0.1.0 payload (clean start — no v1.x migration)', () => {
      const legacyData = {
        schemaVersion: '0.1.0',
        workspaces: [
          makeWorkspace({
            architecture: makeArchitecture({
              resources: [
                {
                  id: 'legacy-block-1',
                  name: 'Legacy Compute',
                  resourceType: 'web_compute',
                  category: 'compute',
                  parentId: 'plate-subnet-private',
                  position: { x: 1, y: 0.5, z: 1 },
                  metadata: {},
                  provider: 'aws',
                },
              ],
            }),
          }),
        ],
      };

      expect(() => deserialize(JSON.stringify(legacyData))).toThrow(
        'Incompatible workspace format: v0.1.0 is no longer supported.',
      );
    });

    it('rejects legacy 0.2.0 payload (clean start — no v1.x migration)', () => {
      const legacyData = {
        schemaVersion: '0.2.0',
        workspaces: [
          makeWorkspace({
            architecture: makeArchitecture({
              resources: [
                {
                  id: 'legacy-block-2',
                  name: 'Legacy Database',
                  resourceType: 'relational_database',
                  category: 'data',
                  parentId: 'plate-subnet-private',
                  position: { x: 2, y: 0.5, z: 2 },
                  metadata: {},
                  provider: 'aws',
                },
              ],
            }),
          }),
        ],
      };

      expect(() => deserialize(JSON.stringify(legacyData))).toThrow(
        'Incompatible workspace format: v0.2.0 is no longer supported.',
      );
    });

    it('rejects mixed legacy payloads regardless of block content', () => {
      const legacyData = {
        schemaVersion: '0.1.0',
        workspaces: [
          makeWorkspace({
            architecture: makeArchitecture({
              resources: [
                {
                  id: 'legacy-block-3',
                  name: 'Legacy Block',
                  resourceType: 'web_compute',
                  category: 'compute',
                  parentId: 'plate-subnet-private',
                  position: { x: 1, y: 0.5, z: 1 },
                  metadata: {},
                  provider: 'aws',
                },
                {
                  id: 'new-block-3',
                  name: 'New Block',
                  resourceType: 'web_compute',
                  category: 'compute',
                  parentId: 'plate-subnet-private',
                  position: { x: 2, y: 0.5, z: 2 },
                  metadata: {},
                  provider: 'aws',
                  subtype: 'lambda',
                  config: { memorySize: 256 },
                },
              ],
            }),
          }),
        ],
      };

      expect(() => deserialize(JSON.stringify(legacyData))).toThrow(
        'Incompatible workspace format: v0.1.0 is no longer supported.',
      );
    });
  });

  describe('cross-provider subtype resolution', () => {
    it('resolves mappings for every AWS registered subtype', () => {
      expectProviderSubtypeMappings(
        awsProviderDefinition,
        awsSubtypeRegistry as Record<string, Record<string, unknown> | undefined>,
      );
    });

    it('resolves mappings for every GCP registered subtype', () => {
      expectProviderSubtypeMappings(
        gcpProviderDefinition,
        gcpSubtypeRegistry as Record<string, Record<string, unknown> | undefined>,
      );
    });

    it('resolves mappings for every Azure registered subtype', () => {
      expectProviderSubtypeMappings(
        azureProviderDefinition,
        azureSubtypeRegistry as Record<string, Record<string, unknown> | undefined>,
      );
    });

    it('falls back to category mapping for unknown subtype across providers', () => {
      const providers = [awsProviderDefinition, gcpProviderDefinition, azureProviderDefinition];

      for (const provider of providers) {
        const fallback = resolveBlockMapping(
          provider.blockMappings,
          provider.subtypeBlockMappings,
          'compute',
          'not-registered',
        );

        expect(fallback).toEqual(provider.blockMappings.compute);
      }
    });
  });

  describe('backward compatibility without subtypes', () => {
    it('keeps pipeline behavior intact for architecture without subtype fields', () => {
      const architecture = makeArchitecture({
        resources: [
          makeBlock({
            id: 'legacy-compute-4',
            name: 'Legacy Compute',
            provider: 'aws',
            category: 'compute',
          }),
          makeBlock({
            id: 'legacy-storage-4',
            name: 'Legacy Storage',
            provider: 'aws',
            category: 'data',
          }),
        ],
      });

      const roundtripped = deserialize(serialize([makeWorkspace({ architecture })]))[0]
        .architecture;
      const validation = validateArchitecture(roundtripped);
      const resolvedCompute = resolveBlockMapping(
        awsProviderDefinition.blockMappings,
        awsProviderDefinition.subtypeBlockMappings,
        blocksOf(roundtripped)[0].category,
        blocksOf(roundtripped)[0].subtype,
      );

      expect(blocksOf(roundtripped).every((block) => block.subtype === undefined)).toBe(true);
      expect(blocksOf(roundtripped).every((block) => block.config === undefined)).toBe(true);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.warnings).toEqual([]);
      expect(resolvedCompute).toEqual(awsProviderDefinition.blockMappings.compute);
    });
  });

  describe('store integration for addBlock subtype fields', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
      const state = useArchitectureStore.getState();
      state.resetWorkspace();
      useArchitectureStore.setState({ workspaces: [] });
      localStorage.clear();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('stores provider, subtype, and config when adding block through store slice', () => {
      const state = useArchitectureStore.getState();
      state.addPlate('region', 'VNet', null);
      const networkId = platesOf(useArchitectureStore.getState().workspace.architecture)[0].id;
      state.addPlate('subnet', 'Subnet', networkId);
      const subnetId = platesOf(useArchitectureStore.getState().workspace.architecture)[1].id;

      state.addBlock('compute', 'Lambda API', subnetId, 'aws', 'lambda', {
        runtime: 'nodejs20.x',
        memorySize: 512,
      });

      const architecture = useArchitectureStore.getState().workspace.architecture;
      const block = blocksOf(architecture)[0];
      const parentPlate = platesOf(architecture).find((plate) => plate.id === subnetId);

      expect(block.provider).toBe('aws');
      expect(block.subtype).toBe('lambda');
      expect(block.config).toEqual({ runtime: 'nodejs20.x', memorySize: 512 });
      expect(block.parentId).toBe(parentPlate?.id);
    });

    it('keeps subtype and config undefined when adding block without subtype metadata', () => {
      const state = useArchitectureStore.getState();
      state.addPlate('region', 'VNet', null);
      const networkId = platesOf(useArchitectureStore.getState().workspace.architecture)[0].id;
      state.addPlate('subnet', 'Subnet', networkId);
      const subnetId = platesOf(useArchitectureStore.getState().workspace.architecture)[1].id;

      state.addBlock('compute', 'Generic Compute', subnetId, 'aws');

      const block = blocksOf(useArchitectureStore.getState().workspace.architecture)[0];
      expect(block.provider).toBe('aws');
      expect(block.subtype).toBeUndefined();
      expect(block.config).toBeUndefined();
    });
  });
});
