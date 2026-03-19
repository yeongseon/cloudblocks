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
import type { ArchitectureModel, Block, Plate, Workspace } from '../shared/types';
import { SCHEMA_VERSION, deserialize, serialize } from '../shared/types/schema';

function makePlate(overrides: Partial<Plate> = {}): Plate {
  return {
    id: 'plate-subnet-private',
    name: 'Private Subnet',
    type: 'subnet',
    subnetAccess: 'private',
    profileId: 'subnet-service',
    parentId: 'plate-network-1',
    children: [],
    position: { x: 0, y: 0.7, z: 0 },
    size: { width: 8, height: 0.5, depth: 8 },
    metadata: {},
    ...overrides,
  };
}

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'plate-subnet-private',
    position: { x: 1, y: 0.5, z: 1 },
    metadata: {},
    ...overrides,
  };
}

function makeArchitecture(overrides: Partial<ArchitectureModel> = {}): ArchitectureModel {
  return {
    id: 'arch-1',
    name: 'Milestone 12 Integration',
    version: '1',
    plates: [makePlate()],
    blocks: [],
    connections: [],
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
    ...overrides,
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

function expectProviderSubtypeMappings(provider: ProviderDefinition, registry: Record<string, Record<string, unknown> | undefined>): void {
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

      const expected = provider.subtypeBlockMappings?.[category as keyof ProviderDefinition['blockMappings']]?.[subtype];
      expect(resolved).toEqual(expected);
      expect(resolved).toBeDefined();
    }
  }
}

describe('Milestone 12 Integration Tests', () => {
  describe('serialization roundtrip with subtypes', () => {
    it('preserves subtype and config through serialize and deserialize', () => {
      const architecture = makeArchitecture({
        blocks: [
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
            category: 'database',
            provider: 'gcp',
            subtype: 'cloud-sql-postgres',
            config: { tier: 'db-f1-micro', databaseVersion: 'POSTGRES_15' },
          }),
        ],
      });

      const workspaces = [makeWorkspace({ architecture })];
      const roundtripped = deserialize(serialize(workspaces));

      expect(roundtripped[0].architecture.blocks[0].subtype).toBe('lambda');
      expect(roundtripped[0].architecture.blocks[0].config).toEqual({
        runtime: 'nodejs20.x',
        memorySize: 512,
      });
      expect(roundtripped[0].architecture.blocks[1].subtype).toBe('cloud-sql-postgres');
      expect(roundtripped[0].architecture.blocks[1].config).toEqual({
        tier: 'db-f1-micro',
        databaseVersion: 'POSTGRES_15',
      });
    });

    it('keeps mixed subtype and non-subtype blocks stable through roundtrip', () => {
      const architecture = makeArchitecture({
        blocks: [
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
      const [legacyBlock, subtypedBlock] = parsed[0].architecture.blocks;

      expect(legacyBlock.subtype).toBeUndefined();
      expect(legacyBlock.config).toBeUndefined();
      expect(subtypedBlock.subtype).toBe('cloud-run');
      expect(subtypedBlock.config).toEqual({ maxInstances: 20 });
    });
  });

  describe('validation with provider-specific rules', () => {
    it('returns warnings for AWS Lambda on subnet and unknown subtype in one architecture', () => {
      const architecture = makeArchitecture({
        blocks: [
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
        blocks: [
          makeBlock({ id: 'aws-compute-1', name: 'AWS Compute', provider: 'aws', category: 'compute' }),
        ],
      });

      const result = validateArchitecture(architecture);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('does not warn for known provider subtype outside special warning rules', () => {
      const architecture = makeArchitecture({
        blocks: [
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
    it('migrates 0.1.0 payload with blocks missing subtype fields', () => {
      const legacyData = {
        schemaVersion: '0.1.0',
        workspaces: [
          makeWorkspace({
            architecture: makeArchitecture({
              blocks: [
                {
                  id: 'legacy-block-1',
                  name: 'Legacy Compute',
                  category: 'compute',
                  placementId: 'plate-subnet-private',
                  position: { x: 1, y: 0.5, z: 1 },
                  metadata: {},
                  provider: 'aws',
                },
              ],
            }),
          }),
        ],
      };

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const migrated = deserialize(JSON.stringify(legacyData));
      const migratedBlock = migrated[0].architecture.blocks[0];

      expect(migratedBlock.subtype).toBeUndefined();
      expect(migratedBlock.config).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith('Migrating schema from 0.1.0 to 0.2.0.');
    });

    it('re-serializes migrated data using current schema version', () => {
      const legacyJson = JSON.stringify({
        schemaVersion: '0.1.0',
        workspaces: [
          makeWorkspace({
            architecture: makeArchitecture({
              blocks: [
                {
                  id: 'legacy-block-2',
                  name: 'Legacy Database',
                  category: 'database',
                  placementId: 'plate-subnet-private',
                  position: { x: 2, y: 0.5, z: 2 },
                  metadata: {},
                  provider: 'aws',
                },
              ],
            }),
          }),
        ],
      });

      const migratedWorkspaces = deserialize(legacyJson);
      const serialized = serialize(migratedWorkspaces);
      const parsed = JSON.parse(serialized) as { schemaVersion: string; workspaces: Workspace[] };

      expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
      expect(parsed.workspaces[0].architecture.blocks[0].subtype).toBeUndefined();
      expect(parsed.workspaces[0].architecture.blocks[0].config).toBeUndefined();
    });

    it('keeps existing subtype/config while leaving legacy blocks optional during migration', () => {
      const legacyJson = JSON.stringify({
        schemaVersion: '0.1.0',
        workspaces: [
          makeWorkspace({
            architecture: makeArchitecture({
              blocks: [
                {
                  id: 'legacy-block-3',
                  name: 'Legacy Block',
                  category: 'compute',
                  placementId: 'plate-subnet-private',
                  position: { x: 1, y: 0.5, z: 1 },
                  metadata: {},
                  provider: 'aws',
                },
                {
                  id: 'new-block-3',
                  name: 'New Block',
                  category: 'compute',
                  placementId: 'plate-subnet-private',
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
      });

      const migrated = deserialize(legacyJson);
      const [legacyBlock, newBlock] = migrated[0].architecture.blocks;

      expect(legacyBlock.subtype).toBeUndefined();
      expect(legacyBlock.config).toBeUndefined();
      expect(newBlock.subtype).toBe('lambda');
      expect(newBlock.config).toEqual({ memorySize: 256 });
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
        blocks: [
          makeBlock({ id: 'legacy-compute-4', name: 'Legacy Compute', provider: 'aws', category: 'compute' }),
          makeBlock({ id: 'legacy-storage-4', name: 'Legacy Storage', provider: 'aws', category: 'storage' }),
        ],
      });

      const roundtripped = deserialize(serialize([makeWorkspace({ architecture })]))[0].architecture;
      const validation = validateArchitecture(roundtripped);
      const resolvedCompute = resolveBlockMapping(
        awsProviderDefinition.blockMappings,
        awsProviderDefinition.subtypeBlockMappings,
        roundtripped.blocks[0].category,
        roundtripped.blocks[0].subtype,
      );

      expect(roundtripped.blocks.every((block) => block.subtype === undefined)).toBe(true);
      expect(roundtripped.blocks.every((block) => block.config === undefined)).toBe(true);
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
      state.addPlate('network', 'VNet', null);
      const networkId = useArchitectureStore.getState().workspace.architecture.plates[0].id;
      state.addPlate('subnet', 'Private Subnet', networkId, 'private');
      const subnetId = useArchitectureStore.getState().workspace.architecture.plates[1].id;

      state.addBlock('compute', 'Lambda API', subnetId, 'aws', 'lambda', {
        runtime: 'nodejs20.x',
        memorySize: 512,
      });

      const architecture = useArchitectureStore.getState().workspace.architecture;
      const block = architecture.blocks[0];
      const parentPlate = architecture.plates.find((plate) => plate.id === subnetId);

      expect(block.provider).toBe('aws');
      expect(block.subtype).toBe('lambda');
      expect(block.config).toEqual({ runtime: 'nodejs20.x', memorySize: 512 });
      expect(parentPlate?.children).toContain(block.id);
    });

    it('keeps subtype and config undefined when adding block without subtype metadata', () => {
      const state = useArchitectureStore.getState();
      state.addPlate('network', 'VNet', null);
      const networkId = useArchitectureStore.getState().workspace.architecture.plates[0].id;
      state.addPlate('subnet', 'Private Subnet', networkId, 'private');
      const subnetId = useArchitectureStore.getState().workspace.architecture.plates[1].id;

      state.addBlock('compute', 'Generic Compute', subnetId, 'aws');

      const block = useArchitectureStore.getState().workspace.architecture.blocks[0];
      expect(block.provider).toBe('aws');
      expect(block.subtype).toBeUndefined();
      expect(block.config).toBeUndefined();
    });
  });
});
