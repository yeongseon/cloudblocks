import { describe, it, expect } from 'vitest';
import type { Block, Connection, ExternalActor } from '../../shared/types/index';
import { validateConnection } from './connection';

function makeBlock(
  overrides: Partial<Block> = {}
): Block {
  return {
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'plate-1',
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
    id: 'actor-internet',
    name: 'Internet',
    type: 'internet',
    ...overrides,
  };
}

describe('validateConnection', () => {
  it('returns error when source endpoint is missing', () => {
    const connection = makeConnection({
      id: 'conn-source-missing',
      sourceId: 'missing-source',
      targetId: 'compute-1',
    });
    const blocks = [makeBlock({ id: 'compute-1', category: 'compute' })];

    expect(validateConnection(connection, blocks, [])).toEqual({
      ruleId: 'rule-conn-source',
      severity: 'error',
      message: 'Connection source "missing-source" not found',
      suggestion: 'Remove this connection or update the source',
      targetId: 'conn-source-missing',
    });
  });

  it('returns error when target endpoint is missing', () => {
    const connection = makeConnection({
      id: 'conn-target-missing',
      sourceId: 'gateway-1',
      targetId: 'missing-target',
    });
    const blocks = [makeBlock({ id: 'gateway-1', category: 'gateway' })];

    expect(validateConnection(connection, blocks, [])).toEqual({
      ruleId: 'rule-conn-target',
      severity: 'error',
      message: 'Connection target "missing-target" not found',
      suggestion: 'Remove this connection or update the target',
      targetId: 'conn-target-missing',
    });
  });

  it('returns error for self-connection', () => {
    const connection = makeConnection({
      id: 'conn-self',
      sourceId: 'compute-1',
      targetId: 'compute-1',
    });
    const blocks = [makeBlock({ id: 'compute-1', category: 'compute' })];

    expect(validateConnection(connection, blocks, [])).toEqual({
      ruleId: 'rule-conn-self',
      severity: 'error',
      message: 'A block cannot connect to itself',
      suggestion: 'Connect to a different block',
      targetId: 'conn-self',
    });
  });

  it('accepts valid internet -> gateway connection', () => {
    const connection = makeConnection({
      sourceId: 'internet-1',
      targetId: 'gateway-1',
    });
    const blocks = [makeBlock({ id: 'gateway-1', category: 'gateway' })];
    const actors = [makeExternalActor({ id: 'internet-1' })];

    expect(validateConnection(connection, blocks, actors)).toBeNull();
  });

  it('accepts valid gateway -> compute connection', () => {
    const connection = makeConnection({
      sourceId: 'gateway-1',
      targetId: 'compute-1',
    });
    const blocks = [
      makeBlock({ id: 'gateway-1', category: 'gateway' }),
      makeBlock({ id: 'compute-1', category: 'compute' }),
    ];

    expect(validateConnection(connection, blocks, [])).toBeNull();
  });

  it('accepts valid compute -> database connection', () => {
    const connection = makeConnection({
      sourceId: 'compute-1',
      targetId: 'db-1',
    });
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'db-1', category: 'database' }),
    ];

    expect(validateConnection(connection, blocks, [])).toBeNull();
  });

  it('accepts valid compute -> storage connection', () => {
    const connection = makeConnection({
      sourceId: 'compute-1',
      targetId: 'storage-1',
    });
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'storage-1', category: 'storage' }),
    ];

    expect(validateConnection(connection, blocks, [])).toBeNull();
  });

  it('rejects invalid connection pairs with rule-conn-invalid', () => {
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'gateway-1', category: 'gateway' }),
      makeBlock({ id: 'db-1', category: 'database' }),
      makeBlock({ id: 'storage-1', category: 'storage' }),
    ];
    const actors = [makeExternalActor({ id: 'internet-1' })];

    const invalidConnections: Connection[] = [
      makeConnection({ id: 'conn-invalid-1', sourceId: 'internet-1', targetId: 'compute-1' }),
      makeConnection({ id: 'conn-invalid-2', sourceId: 'gateway-1', targetId: 'db-1' }),
      makeConnection({ id: 'conn-invalid-3', sourceId: 'db-1', targetId: 'compute-1' }),
      makeConnection({ id: 'conn-invalid-4', sourceId: 'storage-1', targetId: 'gateway-1' }),
    ];

    for (const connection of invalidConnections) {
      const error = validateConnection(connection, blocks, actors);
      expect(error).toBeTruthy();
      expect(error).toMatchObject({
        ruleId: 'rule-conn-invalid',
        severity: 'error',
        targetId: connection.id,
      });
    }
  });

  it('rejects when source category is not allowed to initiate', () => {
    const blocks = [
      makeBlock({ id: 'db-1', category: 'database' }),
      makeBlock({ id: 'storage-1', category: 'storage' }),
      makeBlock({ id: 'compute-1', category: 'compute' }),
    ];

    const dbAsSource = makeConnection({
      id: 'conn-db-source',
      sourceId: 'db-1',
      targetId: 'compute-1',
    });
    const storageAsSource = makeConnection({
      id: 'conn-storage-source',
      sourceId: 'storage-1',
      targetId: 'compute-1',
    });

    expect(validateConnection(dbAsSource, blocks, [])).toMatchObject({
      ruleId: 'rule-conn-invalid',
      message: 'Invalid connection: database → compute',
      suggestion: 'database cannot initiate a request to compute',
      targetId: 'conn-db-source',
    });
    expect(validateConnection(storageAsSource, blocks, [])).toMatchObject({
      ruleId: 'rule-conn-invalid',
      message: 'Invalid connection: storage → compute',
      suggestion: 'storage cannot initiate a request to compute',
      targetId: 'conn-storage-source',
    });
  });

  it('uses external actor type for target endpoint resolution', () => {
    const connection = makeConnection({
      id: 'conn-compute-to-internet',
      sourceId: 'compute-1',
      targetId: 'internet-1',
    });
    const blocks = [makeBlock({ id: 'compute-1', category: 'compute' })];
    const actors = [makeExternalActor({ id: 'internet-1' })];

    expect(validateConnection(connection, blocks, actors)).toMatchObject({
      ruleId: 'rule-conn-invalid',
      message: 'Invalid connection: compute → internet',
      suggestion: 'compute cannot initiate a request to internet',
      targetId: 'conn-compute-to-internet',
    });
  });
});
