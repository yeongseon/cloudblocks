import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ArchitectureModel,
  Connection,
  ContainerBlock,
  ResourceBlock,
} from '@cloudblocks/schema';
import { validateArchitecture } from './engine';
import * as placementModule from './placement';
import * as connectionModule from './connection';
import { endpointId } from '@cloudblocks/schema';
import {
  makeTestArchitecture,
  makeTestBlock,
  makeTestPlate,
  type LegacyArchitectureOverrides,
  type LegacyBlockOverrides,
  type LegacyPlateOverrides,
} from '../../__tests__/legacyModelTestUtils';

function makePlate(overrides: LegacyPlateOverrides = {}): ContainerBlock {
  return makeTestPlate({
    id: 'subnet-1',
    name: 'Subnet',
    type: 'subnet',
    parentId: 'network-1',
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  });
}

function makeBlock(overrides: LegacyBlockOverrides = {}): ResourceBlock {
  return makeTestBlock({
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'subnet-private-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  });
}

function makeConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'conn-1',
    from: endpointId('source-id', 'output', 'data'),
    to: endpointId('target-id', 'input', 'data'),
    metadata: {},
    ...overrides,
  };
}

function makeExternalBlock(overrides: Partial<ResourceBlock> = {}): ResourceBlock {
  return {
    id: 'internet-1',
    name: 'Internet',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'internet',
    category: 'delivery',
    provider: 'azure',
    parentId: null,
    position: { x: -3, y: 0, z: 5 },
    metadata: {},
    roles: ['external'],
    ...overrides,
  };
}

function makeModel(overrides: LegacyArchitectureOverrides = {}): ArchitectureModel {
  return makeTestArchitecture({
    id: 'arch-1',
    name: 'Architecture',
    version: '1.0.0',
    plates: [],
    blocks: [],
    connections: [],
    endpoints: [],
    externalActors: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateArchitecture', () => {
  it('returns valid result for empty model', () => {
    const result = validateArchitecture(makeModel());

    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it('returns valid result for model with valid blocks and connections', () => {
    const subnet1 = makePlate({ id: 'subnet-1' });
    const subnet2 = makePlate({ id: 'subnet-2' });

    const gateway = makeBlock({ id: 'gateway-1', category: 'delivery', placementId: 'subnet-1' });
    const compute = makeBlock({ id: 'compute-1', category: 'compute', placementId: 'subnet-2' });
    const database = makeBlock({ id: 'database-1', category: 'data', placementId: 'subnet-2' });
    const storage = makeBlock({ id: 'storage-1', category: 'data', placementId: 'subnet-2' });

    const internet = makeExternalBlock({ id: 'internet-1' });

    const model = makeModel({
      plates: [subnet1, subnet2],
      blocks: [gateway, compute, database, storage, internet],
      externalActors: [],
      connections: [
        makeConnection({
          id: 'conn-1',
          from: endpointId('internet-1', 'output', 'data'),
          to: endpointId('gateway-1', 'input', 'data'),
        }),
        makeConnection({
          id: 'conn-2',
          from: endpointId('gateway-1', 'output', 'data'),
          to: endpointId('compute-1', 'input', 'data'),
        }),
        makeConnection({
          id: 'conn-3',
          from: endpointId('compute-1', 'output', 'data'),
          to: endpointId('database-1', 'input', 'data'),
        }),
        makeConnection({
          id: 'conn-4',
          from: endpointId('compute-1', 'output', 'data'),
          to: endpointId('storage-1', 'input', 'data'),
        }),
      ],
    });

    const result = validateArchitecture(model);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('returns invalid result with placement error', () => {
    const region = makePlate({ id: 'region-1', type: 'region' });
    const model = makeModel({
      plates: [region],
      blocks: [
        makeBlock({
          id: 'db-1',
          name: 'Database A',
          category: 'data',
          placementId: 'region-1',
        }),
      ],
    });

    const result = validateArchitecture(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      ruleId: 'rule-data-parent',
      severity: 'error',
      targetId: 'db-1',
    });
    expect(result.warnings).toEqual([]);
  });

  it('returns invalid result with connection error', () => {
    const subnet1 = makePlate({ id: 'subnet-1' });
    const subnet2 = makePlate({ id: 'subnet-2' });
    const gateway = makeBlock({ id: 'gateway-1', category: 'delivery', placementId: 'subnet-1' });
    const compute = makeBlock({ id: 'compute-1', category: 'compute', placementId: 'subnet-2' });

    const model = makeModel({
      plates: [subnet1, subnet2],
      blocks: [gateway, compute],
      connections: [
        makeConnection({
          id: 'conn-invalid',
          from: endpointId('compute-1', 'output', 'data'),
          to: endpointId('gateway-1', 'input', 'data'),
        }),
      ],
    });

    const result = validateArchitecture(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      ruleId: 'rule-conn-invalid',
      severity: 'error',
      targetId: 'conn-invalid',
    });
    expect(result.warnings).toEqual([]);
  });

  it('collects multiple errors from placement and connections', () => {
    const subnet1 = makePlate({ id: 'subnet-1' });
    const subnet2 = makePlate({ id: 'subnet-2' });

    const gateway = makeBlock({ id: 'gateway-1', category: 'delivery', placementId: 'subnet-2' });
    const database = makeBlock({ id: 'db-1', category: 'data', placementId: 'subnet-1' });
    const storage = makeBlock({ id: 'storage-1', category: 'data', placementId: 'subnet-1' });

    const model = makeModel({
      plates: [subnet1, subnet2],
      blocks: [gateway, database, storage],
      connections: [
        makeConnection({
          id: 'conn-invalid',
          from: endpointId('storage-1', 'output', 'data'),
          to: endpointId('gateway-1', 'input', 'data'),
        }),
      ],
    });

    const result = validateArchitecture(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      ruleId: 'rule-conn-invalid',
    });
    expect(result.warnings).toEqual([]);
  });

  it('routes warning severities to warnings array', () => {
    vi.spyOn(placementModule, 'validatePlacement').mockImplementation((block: ResourceBlock) => ({
      ruleId: 'rule-placement-warning',
      severity: 'warning' as const,
      message: `Placement warning for ${block.id}`,
      suggestion: 'Placement suggestion',
      targetId: block.id,
    }));

    vi.spyOn(connectionModule, 'validateConnection').mockImplementation(
      (connection: Connection) => ({
        ruleId: 'rule-connection-warning',
        severity: 'warning' as const,
        message: `Connection warning for ${connection.id}`,
        suggestion: 'Connection suggestion',
        targetId: connection.id,
      }),
    );

    const model = makeModel({
      blocks: [makeBlock({ id: 'compute-1' })],
      connections: [
        makeConnection({
          id: 'conn-1',
          from: endpointId('compute-1', 'output', 'data'),
          to: endpointId('compute-2', 'input', 'data'),
        }),
      ],
    });

    const result = validateArchitecture(model);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      {
        ruleId: 'rule-placement-warning',
        severity: 'warning',
        message: 'Placement warning for compute-1',
        suggestion: 'Placement suggestion',
        targetId: 'compute-1',
      },
      {
        ruleId: 'rule-connection-warning',
        severity: 'warning',
        message: 'Connection warning for conn-1',
        suggestion: 'Connection suggestion',
        targetId: 'conn-1',
      },
    ]);
  });
});
