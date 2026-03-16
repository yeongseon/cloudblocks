import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ArchitectureModel,
  Block,
  Connection,
  ExternalActor,
  Plate,
} from '../../shared/types/index';
import { validateArchitecture } from './engine';
import * as placementModule from './placement';
import * as connectionModule from './connection';

function makePlate(
  overrides: Partial<Plate> = {}
): Plate {
  return {
    id: 'subnet-private-1',
    name: 'Private Subnet',
    type: 'subnet',
    subnetAccess: 'private',
    parentId: 'network-1',
    children: [],
    position: { x: 0, y: 0, z: 0 },
    size: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  };
}

function makeBlock(
  overrides: Partial<Block> = {}
): Block {
  return {
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'subnet-private-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  };
}

function makeConnection(
  overrides: Partial<Connection> = {}
): Connection {
  return {
    id: 'conn-1',
    sourceId: 'source-id',
    targetId: 'target-id',
    type: 'dataflow',
    metadata: {},
    ...overrides,
  };
}

function makeExternalActor(
  overrides: Partial<ExternalActor> = {}
): ExternalActor {
  return {
    id: 'internet-1',
    name: 'Internet',
    type: 'internet',
    ...overrides,
  };
}

function makeModel(
  overrides: Partial<ArchitectureModel> = {}
): ArchitectureModel {
  return {
    id: 'arch-1',
    name: 'Architecture',
    version: '1.0.0',
    plates: [],
    blocks: [],
    connections: [],
    externalActors: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
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
    const publicSubnet = makePlate({ id: 'subnet-public-1', subnetAccess: 'public' });
    const privateSubnet = makePlate({ id: 'subnet-private-1', subnetAccess: 'private' });

    const gateway = makeBlock({ id: 'gateway-1', category: 'gateway', placementId: 'subnet-public-1' });
    const compute = makeBlock({ id: 'compute-1', category: 'compute', placementId: 'subnet-private-1' });
    const database = makeBlock({ id: 'database-1', category: 'database', placementId: 'subnet-private-1' });
    const storage = makeBlock({ id: 'storage-1', category: 'storage', placementId: 'subnet-private-1' });

    const internet = makeExternalActor({ id: 'internet-1' });

    const model = makeModel({
      plates: [publicSubnet, privateSubnet],
      blocks: [gateway, compute, database, storage],
      externalActors: [internet],
      connections: [
        makeConnection({ id: 'conn-1', sourceId: 'internet-1', targetId: 'gateway-1' }),
        makeConnection({ id: 'conn-2', sourceId: 'gateway-1', targetId: 'compute-1' }),
        makeConnection({ id: 'conn-3', sourceId: 'compute-1', targetId: 'database-1' }),
        makeConnection({ id: 'conn-4', sourceId: 'compute-1', targetId: 'storage-1' }),
      ],
    });

    const result = validateArchitecture(model);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('returns invalid result with placement error', () => {
    const publicSubnet = makePlate({ id: 'subnet-public-1', subnetAccess: 'public' });
    const model = makeModel({
      plates: [publicSubnet],
      blocks: [
        makeBlock({
          id: 'db-1',
          name: 'Database A',
          category: 'database',
          placementId: 'subnet-public-1',
        }),
      ],
    });

    const result = validateArchitecture(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      ruleId: 'rule-db-private',
      severity: 'error',
      targetId: 'db-1',
    });
    expect(result.warnings).toEqual([]);
  });

  it('returns invalid result with connection error', () => {
    const publicSubnet = makePlate({ id: 'subnet-public-1', subnetAccess: 'public' });
    const privateSubnet = makePlate({ id: 'subnet-private-1', subnetAccess: 'private' });
    const gateway = makeBlock({ id: 'gateway-1', category: 'gateway', placementId: 'subnet-public-1' });
    const compute = makeBlock({ id: 'compute-1', category: 'compute', placementId: 'subnet-private-1' });

    const model = makeModel({
      plates: [publicSubnet, privateSubnet],
      blocks: [gateway, compute],
      connections: [
        makeConnection({
          id: 'conn-invalid',
          sourceId: 'compute-1',
          targetId: 'gateway-1',
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
    const publicSubnet = makePlate({ id: 'subnet-public-1', subnetAccess: 'public' });
    const privateSubnet = makePlate({ id: 'subnet-private-1', subnetAccess: 'private' });

    const gateway = makeBlock({ id: 'gateway-1', category: 'gateway', placementId: 'subnet-private-1' });
    const database = makeBlock({ id: 'db-1', category: 'database', placementId: 'subnet-public-1' });
    const storage = makeBlock({ id: 'storage-1', category: 'storage', placementId: 'subnet-public-1' });

    const model = makeModel({
      plates: [publicSubnet, privateSubnet],
      blocks: [gateway, database, storage],
      connections: [
        makeConnection({
          id: 'conn-invalid',
          sourceId: 'storage-1',
          targetId: 'gateway-1',
        }),
      ],
    });

    const result = validateArchitecture(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((error) => error.ruleId).sort()).toEqual([
      'rule-conn-invalid',
      'rule-db-private',
      'rule-gw-public',
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('routes warning severities to warnings array', () => {
    vi.spyOn(placementModule, 'validatePlacement').mockImplementation((block: Block) => ({
      ruleId: 'rule-placement-warning',
      severity: 'warning' as const,
      message: `Placement warning for ${block.id}`,
      suggestion: 'Placement suggestion',
      targetId: block.id,
    }));

    vi.spyOn(connectionModule, 'validateConnection').mockImplementation((connection: Connection) => ({
      ruleId: 'rule-connection-warning',
      severity: 'warning' as const,
      message: `Connection warning for ${connection.id}`,
      suggestion: 'Connection suggestion',
      targetId: connection.id,
    }));

    const model = makeModel({
      blocks: [makeBlock({ id: 'compute-1' })],
      connections: [makeConnection({ id: 'conn-1', sourceId: 'compute-1', targetId: 'compute-2' })],
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
