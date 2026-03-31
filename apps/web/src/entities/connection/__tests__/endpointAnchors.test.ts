import { describe, it, expect } from 'vitest';
import type { Connection, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { getConnectionEndpointWorldAnchors } from '../endpointAnchors';
import { endpointId, generateEndpointsForBlock } from '@cloudblocks/schema';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeContainerBlock(overrides?: Partial<ContainerBlock>): ContainerBlock {
  return {
    id: 'container-1',
    kind: 'container',
    name: 'Test ContainerBlock',
    category: 'network',
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 10, depth: 10, height: 1 },
    children: [],
    ...overrides,
  } as ContainerBlock;
}

function makeBlock(overrides?: Partial<ResourceBlock>): ResourceBlock {
  return {
    id: 'block-1',
    kind: 'resource',
    name: 'Test Block',
    category: 'compute',
    parentId: 'container-1',
    position: { x: 2, y: 0, z: 3 },
    ...overrides,
  } as ResourceBlock;
}

function makeConnection(overrides?: Partial<Connection>): Connection {
  return {
    id: 'conn-1',
    from: endpointId('block-1', 'output', 'data'),
    to: endpointId('block-2', 'input', 'data'),
    ...overrides,
  } as Connection;
}

function makeEndpoints(blockIds: string[]) {
  return blockIds.flatMap((blockId) => generateEndpointsForBlock(blockId));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getConnectionEndpointWorldAnchors', () => {
  const container = makeContainerBlock();
  const blockA = makeBlock({ id: 'block-a', category: 'compute', position: { x: 2, y: 0, z: 3 } });
  const blockB = makeBlock({ id: 'block-b', category: 'data', position: { x: 5, y: 0, z: 1 } });
  const blocks = [blockA, blockB];
  const blockEndpoints = makeEndpoints(blocks.map((block) => block.id));

  it('returns null when source block is not found', () => {
    const conn = makeConnection({
      from: endpointId('missing', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], blockEndpoints);
    expect(result).toBeNull();
  });

  it('returns null when target block is not found', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('missing', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], blockEndpoints);
    expect(result).toBeNull();
  });

  it('returns null when parent container is missing', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [], blockEndpoints); // no plates
    expect(result).toBeNull();
  });

  it('returns null when endpoint direction does not match source/target side', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'input', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], blockEndpoints);

    expect(result).toBeNull();
  });

  it('returns port-aware anchors for block endpoints with defined ports', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], blockEndpoints);
    expect(result).not.toBeNull();

    // With CATEGORY_PORTS defined, ports are resolved (not center fallback)
    // Source port is on outbound side, target on inbound side
    expect(result!.srcSide).toBe('outbound');
    expect(result!.tgtSide).toBe('inbound');

    // Port positions differ from naive center
    expect(result!.src).toBeDefined();
    expect(result!.tgt).toBeDefined();
  });

  it('uses semantic-based port anchors for block endpoints', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], blockEndpoints);
    expect(result).not.toBeNull();

    // Source port should be on the outbound (RIGHT) face
    expect(result!.srcSide).toBe('outbound');

    // Target port should be on the inbound (LEFT) face
    expect(result!.tgtSide).toBe('inbound');

    // Port positions should differ from center
    expect(result!.src).not.toEqual([2, 1, 3]);
    expect(result!.tgt).not.toEqual([5, 1, 1]);
  });

  it('falls back to center when semantic does not map to a port index', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'http'),
      to: endpointId('block-b', 'input', 'http'),
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], blockEndpoints);
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
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], blockEndpoints);
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
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], endpoints);

    expect(result).toBeNull();
  });

  it('resolves root-level block endpoints without container lookups', () => {
    const rootSource = makeBlock({
      id: 'root-source',
      parentId: null,
      category: 'delivery',
      resourceType: 'internet',
      position: { x: -2, y: 1, z: 4 },
    });
    const rootTarget = makeBlock({
      id: 'root-target',
      parentId: null,
      category: 'delivery',
      resourceType: 'browser',
      position: { x: 3, y: 2, z: 6 },
    });
    const endpoints = makeEndpoints([rootSource.id, rootTarget.id]);
    const conn = makeConnection({
      from: endpointId(rootSource.id, 'output', 'data'),
      to: endpointId(rootTarget.id, 'input', 'data'),
    });

    const result = getConnectionEndpointWorldAnchors(conn, [rootSource, rootTarget], [], endpoints);

    expect(result).not.toBeNull();
    // Node-backed root externals now use block geometry port anchors
    // rootSource: outbound side, delivery ports={inbound:1, outbound:2}
    // semantic='data', index=2%2=0, t=1/3, worldPos=[-2,1,4], cu.width=2
    // → [-2 + (1/3)*2, 1, 4] = [-4/3, 1, 4]
    expect(result!.src[1]).toBe(rootSource.position.y); // y = block.position.y (no offset)
    expect(result!.src[2]).toBe(rootSource.position.z);
    // rootTarget: inbound side, delivery ports={inbound:1, outbound:2}
    // semantic='data', index=2%1=0, t=1/2, worldPos=[3,2,6], cu.depth=2
    // → [3, 2, 6 + (1/2)*2] = [3, 2, 7]
    expect(result!.tgt).toEqual([3, 2, 7]);
  });

  it('falls back to center when endpoint semantic is unknown', () => {
    const conn = makeConnection({
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const endpoints = makeEndpoints(['block-a', 'block-b']).map((endpoint) =>
      endpoint.blockId === 'block-b' && endpoint.direction === 'input'
        ? { ...endpoint, semantic: 'unknown' as never }
        : endpoint,
    );
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [container], endpoints);

    expect(result).not.toBeNull();
    expect(result!.tgtSide).toBeUndefined();
  });

  it('falls back to center anchor when non-root block category has no port definition', () => {
    const oddBlock = makeBlock({
      id: 'odd-block',
      category: 'unknown' as unknown as ResourceBlock['category'],
      parentId: container.id,
      position: { x: 7, y: 0, z: 2 },
    });
    const conn = makeConnection({
      from: endpointId(oddBlock.id, 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const endpoints = makeEndpoints([oddBlock.id, 'block-b']);

    const result = getConnectionEndpointWorldAnchors(
      conn,
      [oddBlock, blockB],
      [container],
      endpoints,
    );

    expect(result).not.toBeNull();
    expect(result!.srcSide).toBeUndefined();
  });

  it('falls back to center anchor for root external block when category has no port definition', () => {
    const oddRoot = makeBlock({
      id: 'odd-root',
      parentId: null,
      roles: ['external'],
      resourceType: 'internet',
      category: 'unknown' as unknown as ResourceBlock['category'],
      position: { x: -1, y: 2, z: 8 },
    });
    const conn = makeConnection({
      from: endpointId(oddRoot.id, 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
    });
    const endpoints = makeEndpoints([oddRoot.id, 'block-b']);

    const result = getConnectionEndpointWorldAnchors(
      conn,
      [oddRoot, blockB],
      [container],
      endpoints,
    );

    expect(result).not.toBeNull();
    expect(result!.srcSide).toBeUndefined();
    expect(result!.src).toEqual([oddRoot.position.x, oddRoot.position.y, oddRoot.position.z]);
  });
});
