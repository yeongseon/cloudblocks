import { describe, it, expect } from 'vitest';
import type { Connection, ConnectionType, Endpoint, ExternalActor, LeafNode, ResourceCategory } from '@cloudblocks/schema';
import { validateConnection, validateStubIndices, canConnect, CONNECTION_VISUAL_STYLES } from './connection';
import { endpointId, generateEndpointsForNode } from '@cloudblocks/schema';

function makeBlock(
  overrides: Partial<LeafNode> = {}
): LeafNode {
  const category: ResourceCategory = overrides.category ?? 'compute';
  const resourceTypeByCategory: Record<ResourceCategory, string> = {
    compute: 'web_compute',
    data: 'relational_database',
    edge: 'load_balancer',
    security: 'firewall_security',
    operations: 'monitoring',
    messaging: 'message_queue',
    network: 'virtual_network',
  };
  return {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: resourceTypeByCategory[category],
    category,
    provider: 'azure',
    parentId: 'plate-1',
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
    from: endpointId('source-id', 'output', 'data'),
    to: endpointId('target-id', 'input', 'data'),
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
   position: { x: -3, y: 0, z: 5 } };
}

function makeEndpoints(blocks: LeafNode[], actors: ExternalActor[] = []): Endpoint[] {
  return [...blocks.map((block) => block.id), ...actors.map((actor) => actor.id)].flatMap((id) =>
    generateEndpointsForNode(id)
  );
}

describe('validateConnection', () => {
  it('returns error when source endpoint is missing', () => {
    const connection = makeConnection({
      id: 'conn-source-missing',
      from: endpointId('missing-source', 'output', 'data'),
      to: endpointId('compute-1', 'input', 'data'),
    });
    const blocks = [makeBlock({ id: 'compute-1', category: 'compute' })];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toEqual({
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
      from: endpointId('gateway-1', 'output', 'data'),
      to: endpointId('missing-target', 'input', 'data'),
    });
    const blocks = [makeBlock({ id: 'gateway-1', category: 'edge' })];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toEqual({
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
      from: endpointId('compute-1', 'output', 'data'),
      to: endpointId('compute-1', 'input', 'data'),
    });
    const blocks = [makeBlock({ id: 'compute-1', category: 'compute' })];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toEqual({
      ruleId: 'rule-conn-self',
      severity: 'error',
      message: 'A block cannot connect to itself',
      suggestion: 'Connect to a different block',
      targetId: 'conn-self',
    });
  });

  it('accepts valid internet -> gateway connection', () => {
    const connection = makeConnection({
      from: endpointId('internet-1', 'output', 'data'),
      to: endpointId('gateway-1', 'input', 'data'),
    });
    const blocks = [makeBlock({ id: 'gateway-1', category: 'edge' })];
    const actors = [makeExternalActor({ id: 'internet-1' })];

    expect(validateConnection(connection, makeEndpoints(blocks, actors), blocks, actors)).toBeNull();
  });

  it('accepts valid gateway -> compute connection', () => {
    const connection = makeConnection({
      from: endpointId('gateway-1', 'output', 'data'),
      to: endpointId('compute-1', 'input', 'data'),
    });
    const blocks = [
      makeBlock({ id: 'gateway-1', category: 'edge' }),
      makeBlock({ id: 'compute-1', category: 'compute' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid compute -> database connection', () => {
    const connection = makeConnection({
      from: endpointId('compute-1', 'output', 'data'),
      to: endpointId('db-1', 'input', 'data'),
    });
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'db-1', category: 'data' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid compute -> storage connection', () => {
    const connection = makeConnection({
      from: endpointId('compute-1', 'output', 'data'),
      to: endpointId('storage-1', 'input', 'data'),
    });
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'storage-1', category: 'data' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid compute -> analytics connection', () => {
    const connection = makeConnection({ from: endpointId('compute-1', 'output', 'data'), to: endpointId('analytics-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'analytics-1', category: 'operations' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid compute -> identity connection', () => {
    const connection = makeConnection({ from: endpointId('compute-1', 'output', 'data'), to: endpointId('identity-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'identity-1', category: 'security' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid compute -> observability connection', () => {
    const connection = makeConnection({ from: endpointId('compute-1', 'output', 'data'), to: endpointId('observability-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'observability-1', category: 'operations' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('rejects invalid connection pairs with rule-conn-invalid', () => {
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'compute' }),
      makeBlock({ id: 'gateway-1', category: 'edge' }),
      makeBlock({ id: 'db-1', category: 'data' }),
      makeBlock({ id: 'storage-1', category: 'data' }),
    ];
    const actors = [makeExternalActor({ id: 'internet-1' })];

    const invalidConnections: Connection[] = [
      makeConnection({ id: 'conn-invalid-1', from: endpointId('internet-1', 'output', 'data'), to: endpointId('compute-1', 'input', 'data')}),
      makeConnection({ id: 'conn-invalid-2', from: endpointId('gateway-1', 'output', 'data'), to: endpointId('db-1', 'input', 'data')}),
      makeConnection({ id: 'conn-invalid-3', from: endpointId('db-1', 'output', 'data'), to: endpointId('compute-1', 'input', 'data')}),
      makeConnection({ id: 'conn-invalid-4', from: endpointId('storage-1', 'output', 'data'), to: endpointId('gateway-1', 'input', 'data')}),
    ];

    for (const connection of invalidConnections) {
      const error = validateConnection(connection, makeEndpoints(blocks, actors), blocks, actors);
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
      makeBlock({ id: 'db-1', category: 'data' }),
      makeBlock({ id: 'storage-1', category: 'data' }),
      makeBlock({ id: 'compute-1', category: 'compute' }),
    ];

    const dbAsSource = makeConnection({
      id: 'conn-db-source',
      from: endpointId('db-1', 'output', 'data'),
      to: endpointId('compute-1', 'input', 'data'),
    });
    const storageAsSource = makeConnection({
      id: 'conn-storage-source',
      from: endpointId('storage-1', 'output', 'data'),
      to: endpointId('compute-1', 'input', 'data'),
    });

    expect(validateConnection(dbAsSource, makeEndpoints(blocks), blocks, [])).toMatchObject({
      ruleId: 'rule-conn-invalid',
      message: 'Invalid connection: data → compute',
      suggestion: 'data cannot initiate a request to compute',
      targetId: 'conn-db-source',
    });
    expect(validateConnection(storageAsSource, makeEndpoints(blocks), blocks, [])).toMatchObject({
      ruleId: 'rule-conn-invalid',
      message: 'Invalid connection: data → compute',
      suggestion: 'data cannot initiate a request to compute',
      targetId: 'conn-storage-source',
    });
  });

  it('uses external actor type for target endpoint resolution', () => {
    const connection = makeConnection({
      id: 'conn-compute-to-internet',
      from: endpointId('compute-1', 'output', 'data'),
      to: endpointId('internet-1', 'input', 'data'),
    });
    const blocks = [makeBlock({ id: 'compute-1', category: 'compute' })];
    const actors = [makeExternalActor({ id: 'internet-1' })];

    expect(validateConnection(connection, makeEndpoints(blocks, actors), blocks, actors)).toMatchObject({
      ruleId: 'rule-conn-invalid',
      message: 'Invalid connection: compute → internet',
      suggestion: 'compute cannot initiate a request to internet',
      targetId: 'conn-compute-to-internet',
    });
  });

  it('accepts valid gateway -> function connection', () => {
    const connection = makeConnection({ from: endpointId('gateway-1', 'output', 'data'), to: endpointId('func-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'gateway-1', category: 'edge' }),
      makeBlock({ id: 'func-1', category: 'compute' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid function -> storage connection', () => {
    const connection = makeConnection({ from: endpointId('func-1', 'output', 'data'), to: endpointId('storage-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'func-1', category: 'compute' }),
      makeBlock({ id: 'storage-1', category: 'data' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid function -> database connection', () => {
    const connection = makeConnection({ from: endpointId('func-1', 'output', 'data'), to: endpointId('db-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'func-1', category: 'compute' }),
      makeBlock({ id: 'db-1', category: 'data' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid function -> queue connection', () => {
    const connection = makeConnection({ from: endpointId('func-1', 'output', 'data'), to: endpointId('queue-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'func-1', category: 'compute' }),
      makeBlock({ id: 'queue-1', category: 'messaging' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid queue -> function connection', () => {
    const connection = makeConnection({ from: endpointId('queue-1', 'output', 'data'), to: endpointId('func-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'queue-1', category: 'messaging' }),
      makeBlock({ id: 'func-1', category: 'compute' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('accepts valid event -> function connection', () => {
    const connection = makeConnection({ from: endpointId('event-1', 'output', 'data'), to: endpointId('func-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'event-1', category: 'messaging' }),
      makeBlock({ id: 'func-1', category: 'compute' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('rejects invalid function -> gateway connection', () => {
    const connection = makeConnection({ id: 'conn-func-gw', from: endpointId('func-1', 'output', 'data'), to: endpointId('gateway-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'func-1', category: 'compute' }),
      makeBlock({ id: 'gateway-1', category: 'edge' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toMatchObject({
      ruleId: 'rule-conn-invalid',
      targetId: 'conn-func-gw',
    });
  });

  it('rejects invalid function -> compute connection', () => {
    const connection = makeConnection({ id: 'conn-func-compute', from: endpointId('func-1', 'output', 'data'), to: endpointId('compute-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'func-1', category: 'compute' }),
      makeBlock({ id: 'compute-1', category: 'compute' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toMatchObject({
      ruleId: 'rule-conn-invalid',
      targetId: 'conn-func-compute',
    });
  });

  it('accepts valid queue -> compute connection', () => {
    const connection = makeConnection({ id: 'conn-queue-compute', from: endpointId('queue-1', 'output', 'data'), to: endpointId('compute-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'queue-1', category: 'messaging' }),
      makeBlock({ id: 'compute-1', category: 'compute' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toBeNull();
  });

  it('rejects invalid event -> database connection', () => {
    const connection = makeConnection({ id: 'conn-event-db', from: endpointId('event-1', 'output', 'data'), to: endpointId('db-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'event-1', category: 'messaging' }),
      makeBlock({ id: 'db-1', category: 'data' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toMatchObject({
      ruleId: 'rule-conn-invalid',
      targetId: 'conn-event-db',
    });
  });

  it('rejects invalid queue -> queue connection', () => {
    const connection = makeConnection({ id: 'conn-queue-queue', from: endpointId('queue-1', 'output', 'data'), to: endpointId('queue-2', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'queue-1', category: 'messaging' }),
      makeBlock({ id: 'queue-2', category: 'messaging' }),
    ];

    expect(validateConnection(connection, makeEndpoints(blocks), blocks, [])).toMatchObject({
      ruleId: 'rule-conn-invalid',
      targetId: 'conn-queue-queue',
    });
  });
});

describe('validateStubIndices', () => {
  it('returns null when stubs are within capacity', () => {
    const connection = makeConnection({ from: endpointId('edge-1', 'output', 'data'), to: endpointId('compute-1', 'input', 'data')});
    const blocks = [
      makeBlock({ id: 'edge-1', category: 'edge' }),
      makeBlock({ id: 'compute-1', category: 'compute' }),
    ];

    expect(validateStubIndices(connection, blocks)).toBeNull();
  });

  it('returns source stub error when outbound index is out of range', () => {
    const connection = makeConnection({
      id: 'conn-stub-source',
      from: endpointId('data-1', 'output', 'data'),
      to: endpointId('compute-1', 'input', 'data'),
    });
    const blocks = [
      makeBlock({ id: 'data-1', category: 'data' }),
      makeBlock({ id: 'compute-1', category: 'compute' }),
    ];

    expect(validateStubIndices(connection, blocks)).toMatchObject({
      ruleId: 'rule-conn-stub-source',
      targetId: 'conn-stub-source',
    });
  });

  it('returns target stub error when inbound index is out of range', () => {
    const connection = makeConnection({
      id: 'conn-stub-target',
      from: endpointId('compute-1', 'output', 'data'),
      to: endpointId('security-1', 'input', 'data'),
    });
    const blocks = [
      makeBlock({ id: 'compute-1', category: 'edge' }),
      makeBlock({ id: 'security-1', category: 'security' }),
    ];

    expect(validateStubIndices(connection, blocks)).toMatchObject({
      ruleId: 'rule-conn-stub-target',
      targetId: 'conn-stub-target',
    });
  });

  it('ignores stub checks when endpoint is not a resource', () => {
    const connection = makeConnection({
      from: endpointId('internet-1', 'output', 'data'),
      to: endpointId('compute-1', 'input', 'data'),
    });
    const blocks = [makeBlock({ id: 'compute-1', category: 'compute' })];

    expect(validateStubIndices(connection, blocks)).toBeNull();
  });
});

describe('canConnect', () => {
  it('returns true for allowed connection pairs', () => {
    expect(canConnect('internet', 'edge')).toBe(true);
    expect(canConnect('edge', 'compute')).toBe(true);
    expect(canConnect('edge', 'compute')).toBe(true);
    expect(canConnect('compute', 'data')).toBe(true);
    expect(canConnect('compute', 'data')).toBe(true);
    expect(canConnect('compute', 'operations')).toBe(true);
    expect(canConnect('compute', 'security')).toBe(true);
    expect(canConnect('compute', 'operations')).toBe(true);
    expect(canConnect('compute', 'data')).toBe(true);
    expect(canConnect('compute', 'data')).toBe(true);
    expect(canConnect('compute', 'messaging')).toBe(true);
    expect(canConnect('messaging', 'compute')).toBe(true);
    expect(canConnect('messaging', 'compute')).toBe(true);
  });

  it('returns false for disallowed connection pairs', () => {
    expect(canConnect('data', 'compute')).toBe(false);
    expect(canConnect('data', 'edge')).toBe(false);
    expect(canConnect('compute', 'edge')).toBe(false);
    expect(canConnect('internet', 'compute')).toBe(false);
    expect(canConnect('messaging', 'operations')).toBe(false);
    expect(canConnect('messaging', 'data')).toBe(false);
  });

  it('returns false for receiver-only categories as source', () => {
    expect(canConnect('data', 'data')).toBe(false);
    expect(canConnect('data', 'operations')).toBe(false);
    expect(canConnect('operations', 'compute')).toBe(false);
    expect(canConnect('security', 'compute')).toBe(false);
    expect(canConnect('operations', 'compute')).toBe(false);
  });
});

describe('CONNECTION_VISUAL_STYLES', () => {
  it('defines a style for every ConnectionType', () => {
    const connectionTypes: ConnectionType[] = ['dataflow', 'http', 'internal', 'data', 'async'];
    for (const type of connectionTypes) {
      expect(CONNECTION_VISUAL_STYLES[type]).toBeDefined();
      expect(CONNECTION_VISUAL_STYLES[type].strokeWidth).toBeGreaterThan(0);
    }
  });

  it('dataflow has solid style (no dasharray)', () => {
    expect(CONNECTION_VISUAL_STYLES.dataflow.strokeWidth).toBe(2);
    expect(CONNECTION_VISUAL_STYLES.dataflow.strokeDasharray).toBeUndefined();
  });

  it('http has thicker stroke width', () => {
    expect(CONNECTION_VISUAL_STYLES.http.strokeWidth).toBe(3);
    expect(CONNECTION_VISUAL_STYLES.http.strokeDasharray).toBeUndefined();
  });

  it('internal has short dash pattern', () => {
    expect(CONNECTION_VISUAL_STYLES.internal.strokeWidth).toBe(2);
    expect(CONNECTION_VISUAL_STYLES.internal.strokeDasharray).toBe('4 4');
  });

  it('data has long dash pattern', () => {
    expect(CONNECTION_VISUAL_STYLES.data.strokeWidth).toBe(2);
    expect(CONNECTION_VISUAL_STYLES.data.strokeDasharray).toBe('8 4');
  });

  it('async has dot-dash pattern', () => {
    expect(CONNECTION_VISUAL_STYLES.async.strokeWidth).toBe(2);
    expect(CONNECTION_VISUAL_STYLES.async.strokeDasharray).toBe('8 4 2 4');
  });
});
