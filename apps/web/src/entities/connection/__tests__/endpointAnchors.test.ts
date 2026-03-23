import { describe, it, expect } from 'vitest';
import type { Connection, ContainerNode, ExternalActor, LeafNode } from '@cloudblocks/schema';
import { getConnectionEndpointWorldAnchors } from '../endpointAnchors';
import {
  EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
  EXTERNAL_ACTOR_POSITION,
} from '../../../shared/utils/position';
import { endpointId, generateEndpointsForNode } from '@cloudblocks/schema';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makePlate(overrides?: Partial<ContainerNode>): ContainerNode {
  return {
    id: 'plate-1',
    kind: 'container',
    name: 'Test Plate',
    category: 'network',
    position: { x: 0, y: 0, z: 0 },
    size: { width: 10, depth: 10, height: 1 },
    children: [],
    ...overrides,
  } as ContainerNode;
}

function makeBlock(overrides?: Partial<LeafNode>): LeafNode {
  return {
    id: 'block-1',
    kind: 'resource',
    name: 'Test Block',
    category: 'compute',
    parentId: 'plate-1',
    position: { x: 2, y: 0, z: 3 },
    ...overrides,
  } as LeafNode;
}

function makeConnection(overrides?: Partial<Connection>): Connection {
  return {
    id: 'conn-1',
    from: endpointId('block-1', 'output', 'data'),
    to: endpointId('block-2', 'input', 'data'),
    ...overrides,
  } as Connection;
}

function makeActor(overrides?: Partial<ExternalActor>): ExternalActor {
  return {
    id: 'actor-1',
    type: 'user',
    name: 'User',
    ...overrides,
  } as ExternalActor;
}

function makeEndpoints(nodeIds: string[]) {
  return nodeIds.flatMap((nodeId) => generateEndpointsForNode(nodeId));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getConnectionEndpointWorldAnchors', () => {
  const plate = makePlate();
  const blockA = makeBlock({ id: 'block-a', category: 'compute', position: { x: 2, y: 0, z: 3 } });
  const blockB = makeBlock({ id: 'block-b', category: 'data', position: { x: 5, y: 0, z: 1 } });
  const blocks = [blockA, blockB];
  const blockEndpoints = makeEndpoints(blocks.map((block) => block.id));

  it('returns null when source block is not found', () => {
    const conn = makeConnection({
      from: endpointId('missing', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], blockEndpoints, []);
    expect(result).toBeNull();
  });

  it('returns null when target block is not found', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('missing', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], blockEndpoints, []);
    expect(result).toBeNull();
  });

  it('returns null when parent plate is missing', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [], blockEndpoints, []); // no plates
    expect(result).toBeNull();
  });

  it('returns null when endpoint direction does not match source/target side', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'input', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], blockEndpoints, []);

    expect(result).toBeNull();
  });

  it('returns stub-aware anchors for block endpoints with defined ports', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], blockEndpoints, []);
    expect(result).not.toBeNull();

    // With CATEGORY_PORTS defined, stubs are resolved (not center fallback)
    // Source stub is on outbound side, target on inbound side
    expect(result!.srcSide).toBe('outbound');
    expect(result!.tgtSide).toBe('inbound');

    // Stub positions differ from naive center
    expect(result!.src).toBeDefined();
    expect(result!.tgt).toBeDefined();
  });

  it('uses semantic-based stub anchors for block endpoints', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], blockEndpoints, []);
    expect(result).not.toBeNull();

    // Source stub should be on the outbound (RIGHT) face
    expect(result!.srcSide).toBe('outbound');

    // Target stub should be on the inbound (LEFT) face
    expect(result!.tgtSide).toBe('inbound');

    // Stub positions should differ from center
    expect(result!.src).not.toEqual([2, 1, 3]);
    expect(result!.tgt).not.toEqual([5, 1, 1]);
  });

  it('falls back to center when semantic does not map to a stub index', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'http'),
      to: endpointId('block-b', 'input', 'http'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], blockEndpoints, []);
    expect(result).not.toBeNull();

    // Source falls back to center (no side info)
    expect(result!.srcSide).toBe('outbound');
    expect(result!.src).not.toEqual([2, 1, 3]);

    // Target uses inbound side
    expect(result!.tgtSide).toBe('inbound');
  });

  it('supports event semantic endpoint anchors', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'event'),
      to: endpointId('block-b', 'input', 'event'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], blockEndpoints, []);
    expect(result).not.toBeNull();
    expect(result!.srcSide).toBe('outbound');
    expect(result!.tgtSide).toBe('inbound');
  });

  it('returns null when endpoint exists but node is neither block nor actor', () => {
    const conn = makeConnection({
      from: endpointId('orphan-node', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const endpoints = makeEndpoints([...blocks.map((block) => block.id), 'orphan-node']);
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], endpoints, []);

    expect(result).toBeNull();
  });

  it('falls back to center when endpoint semantic is unknown', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const endpoints = makeEndpoints(['block-a', 'block-b']).map((endpoint) =>
      endpoint.nodeId === 'block-b' && endpoint.direction === 'input'
        ? { ...endpoint, semantic: 'unknown' as never }
        : endpoint,
    );
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], endpoints, []);

    expect(result).not.toBeNull();
    expect(result!.tgtSide).toBeUndefined();
  });

  it('resolves external actor source endpoint', () => {
    const actor = makeActor({ id: 'actor-1' });
    const conn = makeConnection({
      from: endpointId('actor-1', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const endpoints = makeEndpoints([...blocks.map((block) => block.id), actor.id]);
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], endpoints, [actor]);
    expect(result).not.toBeNull();

    // External actor uses default position + Y offset
    expect(result!.src).toEqual([
      EXTERNAL_ACTOR_POSITION[0],
      EXTERNAL_ACTOR_POSITION[1] + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
      EXTERNAL_ACTOR_POSITION[2],
    ]);

    // No side info for external actors
    expect(result!.srcSide).toBeUndefined();
  });

  it('resolves external actor with custom position', () => {
    const actor = makeActor({
      id: 'actor-1',
      position: { x: 10, y: 5, z: 15 },
    });
    const conn = makeConnection({
      from: endpointId('actor-1', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const endpoints = makeEndpoints([...blocks.map((block) => block.id), actor.id]);
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], endpoints, [actor]);
    expect(result).not.toBeNull();
    expect(result!.src).toEqual([10, 5 + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, 15]);
  });

  it('resolves external actor as target', () => {
    const actor = makeActor({ id: 'actor-1' });
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('actor-1', 'input', 'data'),
    });
    const endpoints = makeEndpoints([...blocks.map((block) => block.id), actor.id]);
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], endpoints, [actor]);
    expect(result).not.toBeNull();
    expect(result!.tgt).toEqual([
      EXTERNAL_ACTOR_POSITION[0],
      EXTERNAL_ACTOR_POSITION[1] + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
      EXTERNAL_ACTOR_POSITION[2],
    ]);
  });
});
