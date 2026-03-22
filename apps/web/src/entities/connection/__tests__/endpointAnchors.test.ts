import { describe, it, expect } from 'vitest';
import type { Connection, ContainerNode, ExternalActor, LeafNode } from '@cloudblocks/schema';
import { getConnectionEndpointWorldAnchors } from '../endpointAnchors';
import { EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, EXTERNAL_ACTOR_POSITION } from '../../../shared/utils/position';

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
    sourceId: 'block-1',
    targetId: 'block-2',
    type: 'dataflow',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getConnectionEndpointWorldAnchors', () => {
  const plate = makePlate();
  const blockA = makeBlock({ id: 'block-a', category: 'compute', position: { x: 2, y: 0, z: 3 } });
  const blockB = makeBlock({ id: 'block-b', category: 'data', position: { x: 5, y: 0, z: 1 } });
  const blocks = [blockA, blockB];

  it('returns null when source block is not found', () => {
    const conn = makeConnection({ sourceId: 'missing', targetId: 'block-b' });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], []);
    expect(result).toBeNull();
  });

  it('returns null when target block is not found', () => {
    const conn = makeConnection({ sourceId: 'block-a', targetId: 'missing' });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], []);
    expect(result).toBeNull();
  });

  it('returns null when parent plate is missing', () => {
    const conn = makeConnection({ sourceId: 'block-a', targetId: 'block-b' });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [], []); // no plates
    expect(result).toBeNull();
  });

  it('falls back to center when stubs are undefined', () => {
    const conn = makeConnection({ sourceId: 'block-a', targetId: 'block-b' });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], []);
    expect(result).not.toBeNull();

    // Center = plate.pos + block.pos for x/z, plate.y + plate.height for y
    // block-a world: [0+2, 0+1, 0+3] = [2, 1, 3]
    expect(result!.src).toEqual([2, 1, 3]);
    // block-b world: [0+5, 0+1, 0+1] = [5, 1, 1]
    expect(result!.tgt).toEqual([5, 1, 1]);

    // No side info when using center fallback
    expect(result!.srcSide).toBeUndefined();
    expect(result!.tgtSide).toBeUndefined();
  });

  it('uses stub anchors when sourceStub and targetStub are valid', () => {
    const conn = makeConnection({
      sourceId: 'block-a',
      targetId: 'block-b',
      sourceStub: 0,
      targetStub: 0,
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], []);
    expect(result).not.toBeNull();

    // Source stub should be on the outbound (RIGHT) face
    expect(result!.srcSide).toBe('outbound');

    // Target stub should be on the inbound (LEFT) face
    expect(result!.tgtSide).toBe('inbound');

    // Stub positions should differ from center
    expect(result!.src).not.toEqual([2, 1, 3]);
    expect(result!.tgt).not.toEqual([5, 1, 1]);
  });

  it('falls back to center for out-of-range stub index', () => {
    const conn = makeConnection({
      sourceId: 'block-a',
      targetId: 'block-b',
      sourceStub: 99, // way out of range
      targetStub: 0,
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], []);
    expect(result).not.toBeNull();

    // Source falls back to center (no side info)
    expect(result!.srcSide).toBeUndefined();
    expect(result!.src).toEqual([2, 1, 3]);

    // Target uses stub
    expect(result!.tgtSide).toBe('inbound');
  });

  it('falls back to center for negative stub index', () => {
    const conn = makeConnection({
      sourceId: 'block-a',
      targetId: 'block-b',
      sourceStub: -1,
      targetStub: 0,
    });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], []);
    expect(result).not.toBeNull();
    expect(result!.srcSide).toBeUndefined();
    expect(result!.src).toEqual([2, 1, 3]);
  });

  it('resolves external actor source endpoint', () => {
    const actor = makeActor({ id: 'actor-1' });
    const conn = makeConnection({ sourceId: 'actor-1', targetId: 'block-b' });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], [actor]);
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
    const conn = makeConnection({ sourceId: 'actor-1', targetId: 'block-b' });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], [actor]);
    expect(result).not.toBeNull();
    expect(result!.src).toEqual([10, 5 + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, 15]);
  });

  it('resolves external actor as target', () => {
    const actor = makeActor({ id: 'actor-1' });
    const conn = makeConnection({ sourceId: 'block-a', targetId: 'actor-1' });
    const result = getConnectionEndpointWorldAnchors(conn, blocks, [plate], [actor]);
    expect(result).not.toBeNull();
    expect(result!.tgt).toEqual([
      EXTERNAL_ACTOR_POSITION[0],
      EXTERNAL_ACTOR_POSITION[1] + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
      EXTERNAL_ACTOR_POSITION[2],
    ]);
  });
});
