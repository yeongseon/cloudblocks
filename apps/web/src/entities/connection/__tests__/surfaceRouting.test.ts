import { describe, it, expect } from 'vitest';
import type {
  Connection,
  ContainerNode,
  Endpoint,
  ExternalActor,
  LeafNode,
} from '@cloudblocks/schema';
import { CATEGORY_PORTS, endpointId, generateEndpointsForNode } from '@cloudblocks/schema';
import {
  getConnectionSurfaceRoute,
  resolveSurfacePort,
  routeSameSurface,
  SURFACE_EXIT_OFFSET_CU,
} from '../surfaceRouting';
import type { SurfacePort } from '../surfaceRouting';

function makePlate(overrides?: Partial<ContainerNode>): ContainerNode {
  return {
    id: 'plate-1',
    kind: 'container',
    name: 'Test Plate',
    category: 'network',
    position: { x: 10, y: 2, z: 20 },
    size: { width: 16, depth: 16, height: 1 },
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
    from: endpointId('block-a', 'output', 'data'),
    to: endpointId('block-b', 'input', 'data'),
    ...overrides,
  } as Connection;
}

function makeEndpoints(nodeIds: string[]): Endpoint[] {
  return nodeIds.flatMap((nodeId) => generateEndpointsForNode(nodeId));
}

function makeSurfacePort(overrides?: Partial<SurfacePort>): SurfacePort {
  return {
    surfaceBase: [0, 3, 0],
    surfaceExit: [0, 3, -0.75],
    plateId: 'plate-1',
    surfaceY: 3,
    normal: 'neg-z',
    ...overrides,
  };
}

describe('SURFACE_EXIT_OFFSET_CU', () => {
  it('is fixed to 0.75 CU', () => {
    expect(SURFACE_EXIT_OFFSET_CU).toBe(0.75);
  });
});

describe('resolveSurfacePort', () => {
  it('resolves inbound side using t=0.5 for single-port distribution', () => {
    const plate = makePlate({
      position: { x: 10, y: 2, z: 20 },
      size: { width: 16, depth: 16, height: 1 },
    });
    const block = makeBlock({ category: 'data', position: { x: 2, y: 0, z: 4 } });

    const result = resolveSurfacePort(block, plate, 'inbound', 0, 1);

    expect(result.plateId).toBe(plate.id);
    expect(result.surfaceY).toBe(3);
    expect(result.normal).toBe('neg-x');
    expect(result.surfaceBase).toEqual([12, 3, 25.5]);
    expect(result.surfaceExit).toEqual([11.25, 3, 25.5]);
  });

  it('resolves outbound side using t=0.25 for three-port distribution', () => {
    const plate = makePlate({
      position: { x: 10, y: 2, z: 20 },
      size: { width: 16, depth: 16, height: 1 },
    });
    const block = makeBlock({ category: 'compute', position: { x: 2, y: 0, z: 4 } });

    const result = resolveSurfacePort(block, plate, 'outbound', 0, 3);

    expect(result.plateId).toBe(plate.id);
    expect(result.surfaceY).toBe(3);
    expect(result.normal).toBe('neg-z');
    expect(result.surfaceBase).toEqual([12.5, 3, 24]);
    expect(result.surfaceExit).toEqual([12.5, 3, 23.25]);
  });

  it('applies category port counts with semantic modulo mapping for output data endpoints', () => {
    const plate = makePlate({
      position: { x: 0, y: 5, z: 0 },
      size: { width: 10, depth: 10, height: 2 },
    });
    const block = makeBlock({ category: 'compute', position: { x: 1, y: 0, z: 1 } });
    const totalPorts = CATEGORY_PORTS.compute.outbound;

    const result = resolveSurfacePort(block, plate, 'outbound', 0, totalPorts);

    expect(totalPorts).toBe(2);
    expect(result.surfaceBase).toEqual([1 + (1 / 3) * 2, 7, 1]);
    expect(result.surfaceExit).toEqual([1 + (1 / 3) * 2, 7, 1 - SURFACE_EXIT_OFFSET_CU]);
  });
});

describe('routeSameSurface', () => {
  it('returns only exit segments when exits are coincident', () => {
    const src = makeSurfacePort({
      surfaceBase: [1, 3, 1],
      surfaceExit: [0, 3, 1],
      normal: 'neg-x',
    });
    const tgt = makeSurfacePort({
      surfaceBase: [2, 3, 1],
      surfaceExit: [0, 3, 1],
      normal: 'neg-z',
    });

    const segments = routeSameSurface(src, tgt);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ kind: 'exit', start: [1, 3, 1], end: [0, 3, 1] });
    expect(segments[1]).toMatchObject({ kind: 'exit', start: [0, 3, 1], end: [2, 3, 1] });
  });

  it('routes with a single surface segment when exits share X', () => {
    const src = makeSurfacePort({
      surfaceExit: [1, 3, 2],
      surfaceBase: [2, 3, 2],
      normal: 'neg-x',
    });
    const tgt = makeSurfacePort({
      surfaceExit: [1, 3, 8],
      surfaceBase: [1, 3, 9],
      normal: 'neg-z',
    });

    const segments = routeSameSurface(src, tgt);

    expect(segments).toHaveLength(3);
    expect(segments[1]).toEqual({
      start: [1, 3, 2],
      end: [1, 3, 8],
      kind: 'surface',
      surfaceId: 'plate-1',
    });
  });

  it('routes with a single surface segment when exits share Z', () => {
    const src = makeSurfacePort({
      surfaceExit: [2, 3, 5],
      surfaceBase: [3, 3, 5],
      normal: 'neg-z',
    });
    const tgt = makeSurfacePort({
      surfaceExit: [9, 3, 5],
      surfaceBase: [9, 3, 6],
      normal: 'neg-x',
    });

    const segments = routeSameSurface(src, tgt);

    expect(segments).toHaveLength(3);
    expect(segments[1]).toEqual({
      start: [2, 3, 5],
      end: [9, 3, 5],
      kind: 'surface',
      surfaceId: 'plate-1',
    });
  });

  it('routes as L-shape with two surface segments when exits differ in both axes', () => {
    const src = makeSurfacePort({
      surfaceExit: [1, 3, 1],
      surfaceBase: [2, 3, 1],
      normal: 'neg-z',
    });
    const tgt = makeSurfacePort({
      surfaceExit: [4, 3, 6],
      surfaceBase: [4, 3, 7],
      normal: 'neg-x',
    });

    const segments = routeSameSurface(src, tgt);

    expect(segments).toHaveLength(4);
    expect(segments[1].kind).toBe('surface');
    expect(segments[2].kind).toBe('surface');
    expect(segments[1].end).toEqual(segments[2].start);

    const seg1 = segments[1];
    const seg2 = segments[2];
    const seg1AxisAligned = seg1.start[0] === seg1.end[0] || seg1.start[2] === seg1.end[2];
    const seg2AxisAligned = seg2.start[0] === seg2.end[0] || seg2.start[2] === seg2.end[2];
    expect(seg1AxisAligned).toBe(true);
    expect(seg2AxisAligned).toBe(true);
  });

  it('selects the lower-scored elbow candidate based on normal alignment', () => {
    const src = makeSurfacePort({
      surfaceBase: [2, 3, 1],
      surfaceExit: [1, 3, 1],
      normal: 'neg-x',
    });
    const tgt = makeSurfacePort({
      surfaceBase: [5, 3, 5],
      surfaceExit: [5, 3, 4],
      normal: 'neg-z',
    });

    const segments = routeSameSurface(src, tgt);

    expect(segments).toHaveLength(4);
    expect(segments[1].end).toEqual([5, 3, 1]);
    expect(segments[2].start).toEqual([5, 3, 1]);
  });
});

describe('getConnectionSurfaceRoute', () => {
  const externalActors: ExternalActor[] = [];

  it('returns same-plate route with surface segments and resolved ports', () => {
    const plate = makePlate({
      id: 'plate-a',
      position: { x: 0, y: 0, z: 0 },
      size: { width: 20, depth: 20, height: 1 },
    });
    const blockA = makeBlock({
      id: 'block-a',
      category: 'compute',
      parentId: plate.id,
      position: { x: 1, y: 0, z: 1 },
    });
    const blockB = makeBlock({
      id: 'block-b',
      category: 'data',
      parentId: plate.id,
      position: { x: 6, y: 0, z: 5 },
    });
    const endpoints = makeEndpoints([blockA.id, blockB.id]);
    const connection = makeConnection({
      from: endpointId(blockA.id, 'output', 'data'),
      to: endpointId(blockB.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockA, blockB],
      [plate],
      endpoints,
      externalActors,
    );

    expect(route).not.toBeNull();
    expect(route!.srcPort.plateId).toBe('plate-a');
    expect(route!.tgtPort.plateId).toBe('plate-a');
    expect(route!.srcPort.normal).toBe('neg-z');
    expect(route!.tgtPort.normal).toBe('neg-x');
    expect(route!.segments.some((segment) => segment.kind === 'surface')).toBe(true);
    expect(route!.segments.every((segment) => segment.surfaceId === 'plate-a')).toBe(true);
  });

  it('falls back to cross-plate transition segments on ground surface', () => {
    const plateA = makePlate({ id: 'plate-a', position: { x: 0, y: 1, z: 0 } });
    const plateB = makePlate({ id: 'plate-b', position: { x: 20, y: 4, z: 20 } });
    const blockA = makeBlock({
      id: 'block-a',
      category: 'compute',
      parentId: plateA.id,
      position: { x: 2, y: 0, z: 2 },
    });
    const blockB = makeBlock({
      id: 'block-b',
      category: 'data',
      parentId: plateB.id,
      position: { x: 3, y: 0, z: 3 },
    });
    const endpoints = makeEndpoints([blockA.id, blockB.id]);
    const connection = makeConnection({
      from: endpointId(blockA.id, 'output', 'event'),
      to: endpointId(blockB.id, 'input', 'event'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockA, blockB],
      [plateA, plateB],
      endpoints,
      externalActors,
    );

    expect(route).not.toBeNull();
    expect(route!.srcPort.plateId).toBe('plate-a');
    expect(route!.tgtPort.plateId).toBe('plate-b');
    expect(route!.segments.length).toBeGreaterThanOrEqual(2);
    expect(route!.segments.every((segment) => segment.kind === 'transition')).toBe(true);
    expect(route!.segments.every((segment) => segment.start[1] === 0 && segment.end[1] === 0)).toBe(
      true,
    );
  });

  it('returns null when source endpoint is missing', () => {
    const plate = makePlate({ id: 'plate-a' });
    const blockB = makeBlock({ id: 'block-b', parentId: plate.id });
    const endpoints = makeEndpoints([blockB.id]);
    const connection = makeConnection({
      from: endpointId('missing-block', 'output', 'data'),
      to: endpointId(blockB.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockB],
      [plate],
      endpoints,
      externalActors,
    );

    expect(route).toBeNull();
  });

  it('returns null when endpoint exists but block is missing', () => {
    const plate = makePlate({ id: 'plate-a' });
    const blockB = makeBlock({ id: 'block-b', parentId: plate.id });
    const endpoints = makeEndpoints(['ghost-block', blockB.id]);
    const connection = makeConnection({
      from: endpointId('ghost-block', 'output', 'data'),
      to: endpointId(blockB.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockB],
      [plate],
      endpoints,
      externalActors,
    );

    expect(route).toBeNull();
  });

  it('returns null when parent plate for an endpoint block is missing', () => {
    const blockA = makeBlock({ id: 'block-a', parentId: 'missing-plate' });
    const blockB = makeBlock({ id: 'block-b', parentId: 'missing-plate' });
    const endpoints = makeEndpoints([blockA.id, blockB.id]);
    const connection = makeConnection({
      from: endpointId(blockA.id, 'output', 'data'),
      to: endpointId(blockB.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockA, blockB],
      [],
      endpoints,
      externalActors,
    );

    expect(route).toBeNull();
  });

  it('returns null on endpoint direction mismatch', () => {
    const plate = makePlate({ id: 'plate-a' });
    const blockA = makeBlock({ id: 'block-a', parentId: plate.id });
    const blockB = makeBlock({ id: 'block-b', parentId: plate.id });
    const endpoints = makeEndpoints([blockA.id, blockB.id]);
    const connection = makeConnection({
      from: endpointId(blockA.id, 'input', 'data'),
      to: endpointId(blockB.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockA, blockB],
      [plate],
      endpoints,
      externalActors,
    );

    expect(route).toBeNull();
  });
});
