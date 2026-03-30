import { describe, it, expect } from 'vitest';
import type {
  Connection,
  ContainerBlock,
  Endpoint,
  ExternalActor,
  ResourceBlock,
} from '@cloudblocks/schema';
import { CATEGORY_PORTS, endpointId, generateEndpointsForBlock } from '@cloudblocks/schema';
import {
  EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
  EXTERNAL_ACTOR_POSITION,
} from '../../../shared/utils/position';
import {
  findLCA,
  getConnectionSurfaceRoute,
  resolveSurfacePort,
  routeCrossContainer,
  routeSameSurface,
  SURFACE_EXIT_OFFSET_CU,
} from '../surfaceRouting';
import type { SurfacePort } from '../surfaceRouting';

function makeContainerBlock(overrides?: Partial<ContainerBlock>): ContainerBlock {
  return {
    id: 'container-1',
    kind: 'container',
    name: 'Test ContainerBlock',
    category: 'network',
    position: { x: 10, y: 2, z: 20 },
    frame: { width: 16, depth: 16, height: 1 },
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
    from: endpointId('block-a', 'output', 'data'),
    to: endpointId('block-b', 'input', 'data'),
    ...overrides,
  } as Connection;
}

function makeExternalActor(overrides?: Partial<ExternalActor>): ExternalActor {
  return {
    id: 'external-1',
    kind: 'external',
    name: 'External Actor',
    ...overrides,
  } as ExternalActor;
}

function makeEndpoints(blockIds: string[]): Endpoint[] {
  return blockIds.flatMap((blockId) => generateEndpointsForBlock(blockId));
}

function makeSurfacePort(overrides?: Partial<SurfacePort>): SurfacePort {
  return {
    surfaceBase: [0, 3, 0],
    surfaceExit: [0, 3, -0.75],
    containerId: 'container-1',
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
    const container = makeContainerBlock({
      position: { x: 10, y: 2, z: 20 },
      frame: { width: 16, depth: 16, height: 1 },
    });
    const block = makeBlock({ category: 'data', position: { x: 2, y: 0, z: 4 } });

    const result = resolveSurfacePort(block, container, 'inbound', 0, 1);

    expect(result.containerId).toBe(container.id);
    expect(result.surfaceY).toBe(3);
    expect(result.normal).toBe('neg-x');
    expect(result.surfaceBase).toEqual([12, 3, 25]);
    expect(result.surfaceExit).toEqual([11.25, 3, 25]);
  });

  it('resolves outbound side using t=0.25 for three-port distribution', () => {
    const container = makeContainerBlock({
      position: { x: 10, y: 2, z: 20 },
      frame: { width: 16, depth: 16, height: 1 },
    });
    const block = makeBlock({ category: 'compute', position: { x: 2, y: 0, z: 4 } });

    const result = resolveSurfacePort(block, container, 'outbound', 0, 3);

    expect(result.containerId).toBe(container.id);
    expect(result.surfaceY).toBe(3);
    expect(result.normal).toBe('neg-z');
    expect(result.surfaceBase).toEqual([12.5, 3, 24]);
    expect(result.surfaceExit).toEqual([12.5, 3, 23.25]);
  });

  it('applies category port counts with semantic modulo mapping for output data endpoints', () => {
    const container = makeContainerBlock({
      position: { x: 0, y: 5, z: 0 },
      frame: { width: 10, depth: 10, height: 2 },
    });
    const block = makeBlock({ category: 'compute', position: { x: 1, y: 0, z: 1 } });
    const totalPorts = CATEGORY_PORTS.compute.outbound;

    const result = resolveSurfacePort(block, container, 'outbound', 0, totalPorts);

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
      surfaceId: 'container-1',
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
      surfaceId: 'container-1',
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

  it('returns same-container route with surface segments and resolved ports', () => {
    const container = makeContainerBlock({
      id: 'container-a',
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 20, depth: 20, height: 1 },
    });
    const blockA = makeBlock({
      id: 'block-a',
      category: 'compute',
      parentId: container.id,
      position: { x: 1, y: 0, z: 1 },
    });
    const blockB = makeBlock({
      id: 'block-b',
      category: 'data',
      parentId: container.id,
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
      [container],
      endpoints,
      externalActors,
    );

    expect(route).not.toBeNull();
    expect(route!.srcPort.containerId).toBe('container-a');
    expect(route!.tgtPort.containerId).toBe('container-a');
    expect(route!.srcPort.normal).toBe('neg-z');
    expect(route!.tgtPort.normal).toBe('neg-x');
    expect(route!.segments.some((segment) => segment.kind === 'surface')).toBe(true);
    expect(route!.segments.every((segment) => segment.surfaceId === 'container-a')).toBe(true);
  });

  it('routes cross-container with exit, transition, and surface segments via ground', () => {
    const containerA = makeContainerBlock({ id: 'container-a', position: { x: 0, y: 1, z: 0 } });
    const containerB = makeContainerBlock({ id: 'container-b', position: { x: 20, y: 4, z: 20 } });
    const blockA = makeBlock({
      id: 'block-a',
      category: 'compute',
      parentId: containerA.id,
      position: { x: 2, y: 0, z: 2 },
    });
    const blockB = makeBlock({
      id: 'block-b',
      category: 'data',
      parentId: containerB.id,
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
      [containerA, containerB],
      endpoints,
      externalActors,
    );

    expect(route).not.toBeNull();
    expect(route!.srcPort.containerId).toBe('container-a');
    expect(route!.tgtPort.containerId).toBe('container-b');
    expect(route!.segments.length).toBeGreaterThanOrEqual(4);

    // First segment: exit from source block on source container surface
    expect(route!.segments[0].kind).toBe('exit');
    expect(route!.segments[0].surfaceId).toBe('container-a');

    // Last segment: exit into target block on target container surface
    const lastSeg = route!.segments[route!.segments.length - 1];
    expect(lastSeg.kind).toBe('exit');
    expect(lastSeg.surfaceId).toBe('container-b');

    // Should contain transition segments (vertical drops to/from ground)
    expect(route!.segments.some((s) => s.kind === 'transition')).toBe(true);

    // Transition segments should go to/from ground (y=0) since both are top-level
    const transitions = route!.segments.filter((s) => s.kind === 'transition');
    for (const t of transitions) {
      expect(t.start[1] === 0 || t.end[1] === 0).toBe(true);
    }
  });

  it('returns null when source endpoint is missing', () => {
    const container = makeContainerBlock({ id: 'container-a' });
    const blockB = makeBlock({ id: 'block-b', parentId: container.id });
    const endpoints = makeEndpoints([blockB.id]);
    const connection = makeConnection({
      from: endpointId('missing-block', 'output', 'data'),
      to: endpointId(blockB.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockB],
      [container],
      endpoints,
      externalActors,
    );

    expect(route).toBeNull();
  });

  it('returns null when endpoint exists but block is missing', () => {
    const container = makeContainerBlock({ id: 'container-a' });
    const blockB = makeBlock({ id: 'block-b', parentId: container.id });
    const endpoints = makeEndpoints(['ghost-block', blockB.id]);
    const connection = makeConnection({
      from: endpointId('ghost-block', 'output', 'data'),
      to: endpointId(blockB.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockB],
      [container],
      endpoints,
      externalActors,
    );

    expect(route).toBeNull();
  });

  it('returns null when parent container for an endpoint block is missing', () => {
    const blockA = makeBlock({ id: 'block-a', parentId: 'missing-container' });
    const blockB = makeBlock({ id: 'block-b', parentId: 'missing-container' });
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
    const container = makeContainerBlock({ id: 'container-a' });
    const blockA = makeBlock({ id: 'block-a', parentId: container.id });
    const blockB = makeBlock({ id: 'block-b', parentId: container.id });
    const endpoints = makeEndpoints([blockA.id, blockB.id]);
    const connection = makeConnection({
      from: endpointId(blockA.id, 'input', 'data'),
      to: endpointId(blockB.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(
      connection,
      [blockA, blockB],
      [container],
      endpoints,
      externalActors,
    );

    expect(route).toBeNull();
  });

  it('routes external actor -> block connection via ground plane', () => {
    const ctr = makeContainerBlock({ id: 'container-a', position: { x: 10, y: 2, z: 10 } });
    const block = makeBlock({ id: 'block-a', parentId: ctr.id, position: { x: 2, y: 0, z: 2 } });
    const actor = makeExternalActor({ id: 'external-a' });
    const endpoints = [
      ...makeEndpoints([block.id]),
      {
        id: endpointId(actor.id, 'output', 'data'),
        blockId: actor.id,
        direction: 'output',
        semantic: 'data',
      } as Endpoint,
    ];
    const connection = makeConnection({
      from: endpointId(actor.id, 'output', 'data'),
      to: endpointId(block.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(connection, [block], [ctr], endpoints, [actor]);

    expect(route).not.toBeNull();
    expect(route!.srcPort.containerId).toBe('external');
    expect(route!.tgtPort.containerId).toBe(ctr.id);
    expect(route!.segments.some((segment) => segment.kind === 'transition')).toBe(true);
    expect(route!.segments.some((segment) => segment.surfaceId === 'ground')).toBe(true);
  });

  it('routes block -> external actor connection', () => {
    const ctr = makeContainerBlock({ id: 'container-a', position: { x: 0, y: 1, z: 0 } });
    const block = makeBlock({ id: 'block-a', parentId: ctr.id, position: { x: 2, y: 0, z: 2 } });
    const actor = makeExternalActor({ id: 'external-b' });
    const endpoints = [
      ...makeEndpoints([block.id]),
      {
        id: endpointId(actor.id, 'input', 'data'),
        blockId: actor.id,
        direction: 'input',
        semantic: 'data',
      } as Endpoint,
    ];
    const connection = makeConnection({
      from: endpointId(block.id, 'output', 'data'),
      to: endpointId(actor.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(connection, [block], [ctr], endpoints, [actor]);

    expect(route).not.toBeNull();
    expect(route!.srcPort.containerId).toBe(ctr.id);
    expect(route!.tgtPort.containerId).toBe('external');
    expect(route!.segments[0].kind).toBe('exit');
    expect(route!.segments[route!.segments.length - 1].kind).toBe('exit');
  });

  it('routes external actor -> external actor connection', () => {
    const srcActor = makeExternalActor({ id: 'external-src' });
    const tgtActor = makeExternalActor({ id: 'external-tgt', position: { x: 8, y: 2, z: 10 } });
    const endpoints: Endpoint[] = [
      {
        id: endpointId(srcActor.id, 'output', 'http'),
        blockId: srcActor.id,
        direction: 'output',
        semantic: 'http',
      } as Endpoint,
      {
        id: endpointId(tgtActor.id, 'input', 'http'),
        blockId: tgtActor.id,
        direction: 'input',
        semantic: 'http',
      } as Endpoint,
    ];
    const connection = makeConnection({
      from: endpointId(srcActor.id, 'output', 'http'),
      to: endpointId(tgtActor.id, 'input', 'http'),
    });

    const route = getConnectionSurfaceRoute(connection, [], [], endpoints, [srcActor, tgtActor]);

    expect(route).not.toBeNull();
    expect(route!.srcPort.containerId).toBe('external');
    expect(route!.tgtPort.containerId).toBe('external');
    expect(
      route!.segments.every((segment) => segment.kind === 'exit' || segment.kind === 'surface'),
    ).toBe(true);
  });

  it('resolves external actor with custom position', () => {
    const actor = makeExternalActor({
      id: 'external-custom',
      position: { x: 11, y: 6, z: -3 },
    });
    const blockContainer = makeContainerBlock({ id: 'container-a' });
    const block = makeBlock({ id: 'block-a', parentId: blockContainer.id });
    const endpoints = [
      ...makeEndpoints([block.id]),
      {
        id: endpointId(actor.id, 'output', 'data'),
        blockId: actor.id,
        direction: 'output',
        semantic: 'data',
      } as Endpoint,
    ];
    const connection = makeConnection({
      from: endpointId(actor.id, 'output', 'data'),
      to: endpointId(block.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(connection, [block], [blockContainer], endpoints, [
      actor,
    ]);

    expect(route).not.toBeNull();
    const expectedY = actor.position!.y + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET;
    expect(route!.srcPort.surfaceBase).toEqual([actor.position!.x, expectedY, actor.position!.z]);
    expect(route!.srcPort.surfaceExit).toEqual([
      actor.position!.x,
      expectedY,
      actor.position!.z - SURFACE_EXIT_OFFSET_CU,
    ]);
  });

  it('resolves external actor using default position when actor position is absent', () => {
    const actor = makeExternalActor({ id: 'external-default', position: undefined });
    const blockContainer = makeContainerBlock({ id: 'container-a' });
    const block = makeBlock({ id: 'block-a', parentId: blockContainer.id });
    const endpoints = [
      ...makeEndpoints([block.id]),
      {
        id: endpointId(actor.id, 'output', 'data'),
        blockId: actor.id,
        direction: 'output',
        semantic: 'data',
      } as Endpoint,
    ];
    const connection = makeConnection({
      from: endpointId(actor.id, 'output', 'data'),
      to: endpointId(block.id, 'input', 'data'),
    });

    const route = getConnectionSurfaceRoute(connection, [block], [blockContainer], endpoints, [
      actor,
    ]);

    expect(route).not.toBeNull();
    const expectedY = EXTERNAL_ACTOR_POSITION[1] + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET;
    expect(route!.srcPort.surfaceBase).toEqual([
      EXTERNAL_ACTOR_POSITION[0],
      expectedY,
      EXTERNAL_ACTOR_POSITION[2],
    ]);
  });
});

describe('findLCA', () => {
  function buildContainerMap(containers: ContainerBlock[]): Map<string, ContainerBlock> {
    return new Map(containers.map((c) => [c.id, c]));
  }

  it('returns null for top-level siblings (no shared ancestor)', () => {
    const a = makeContainerBlock({ id: 'a', parentId: null });
    const b = makeContainerBlock({ id: 'b', parentId: null });
    const map = buildContainerMap([a, b]);
    expect(findLCA('a', 'b', map)).toBeNull();
  });

  it('returns the parent when two containers share the same parent', () => {
    const parent = makeContainerBlock({ id: 'parent', parentId: null });
    const a = makeContainerBlock({ id: 'a', parentId: 'parent' });
    const b = makeContainerBlock({ id: 'b', parentId: 'parent' });
    const map = buildContainerMap([parent, a, b]);
    expect(findLCA('a', 'b', map)).toBe('parent');
  });

  it('returns the ancestor container when one is nested inside the other', () => {
    const outer = makeContainerBlock({ id: 'outer', parentId: null });
    const inner = makeContainerBlock({ id: 'inner', parentId: 'outer' });
    const map = buildContainerMap([outer, inner]);
    expect(findLCA('outer', 'inner', map)).toBe('outer');
    expect(findLCA('inner', 'outer', map)).toBe('outer');
  });

  it('returns the same container when src and tgt are the same', () => {
    const a = makeContainerBlock({ id: 'a', parentId: null });
    const map = buildContainerMap([a]);
    expect(findLCA('a', 'a', map)).toBe('a');
  });

  it('finds LCA for deeply nested containers', () => {
    const root = makeContainerBlock({ id: 'root', parentId: null });
    const l1 = makeContainerBlock({ id: 'l1', parentId: 'root' });
    const l2a = makeContainerBlock({ id: 'l2a', parentId: 'l1' });
    const l2b = makeContainerBlock({ id: 'l2b', parentId: 'l1' });
    const map = buildContainerMap([root, l1, l2a, l2b]);
    expect(findLCA('l2a', 'l2b', map)).toBe('l1');
  });
});

describe('routeCrossContainer', () => {
  function buildContainerMap(containers: ContainerBlock[]): Map<string, ContainerBlock> {
    return new Map(containers.map((c) => [c.id, c]));
  }

  it('produces exit + transition + surface + transition + exit for top-level siblings', () => {
    const containerA = makeContainerBlock({
      id: 'a',
      parentId: null,
      position: { x: 0, y: 2, z: 0 },
      frame: { width: 10, depth: 10, height: 1 },
    });
    const containerB = makeContainerBlock({
      id: 'b',
      parentId: null,
      position: { x: 20, y: 5, z: 20 },
      frame: { width: 10, depth: 10, height: 1 },
    });
    const map = buildContainerMap([containerA, containerB]);

    const srcPort = makeSurfacePort({
      surfaceBase: [2, 3, 2],
      surfaceExit: [2, 3, 1.25],
      containerId: 'a',
      surfaceY: 3,
      normal: 'neg-z',
    });
    const tgtPort = makeSurfacePort({
      surfaceBase: [23, 6, 23],
      surfaceExit: [22.25, 6, 23],
      containerId: 'b',
      surfaceY: 6,
      normal: 'neg-x',
    });

    const segments = routeCrossContainer(srcPort, tgtPort, map);

    // First: exit on source surface
    expect(segments[0].kind).toBe('exit');
    expect(segments[0].surfaceId).toBe('a');

    // Last: exit on target surface
    const last = segments[segments.length - 1];
    expect(last.kind).toBe('exit');
    expect(last.surfaceId).toBe('b');

    // Should have transition segments (vertical drops)
    const transitions = segments.filter((s) => s.kind === 'transition');
    expect(transitions.length).toBeGreaterThanOrEqual(2);

    // Transition to ground: at least one endpoint should be y=0
    for (const t of transitions) {
      expect(t.start[1] === 0 || t.end[1] === 0).toBe(true);
    }

    // Should have surface segments on ground (horizontal routing)
    const surfaces = segments.filter((s) => s.kind === 'surface');
    expect(surfaces.length).toBeGreaterThanOrEqual(1);
    for (const s of surfaces) {
      expect(s.start[1]).toBe(0);
      expect(s.end[1]).toBe(0);
    }
  });

  it('produces segments through LCA surface for nested siblings', () => {
    const parent = makeContainerBlock({
      id: 'parent',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 40, depth: 40, height: 2 },
    });
    const childA = makeContainerBlock({
      id: 'child-a',
      parentId: 'parent',
      position: { x: 1, y: 0, z: 1 },
      frame: { width: 10, depth: 10, height: 1 },
    });
    const childB = makeContainerBlock({
      id: 'child-b',
      parentId: 'parent',
      position: { x: 20, y: 0, z: 20 },
      frame: { width: 10, depth: 10, height: 1 },
    });
    const map = buildContainerMap([parent, childA, childB]);

    // child-a surfaceY: parent(y=0+h=2) + child(y=0+h=1) → world depends on how nesting works
    // For now, surfaceY passed via the port directly
    const srcPort = makeSurfacePort({
      surfaceBase: [3, 3, 3],
      surfaceExit: [3, 3, 2.25],
      containerId: 'child-a',
      surfaceY: 3,
      normal: 'neg-z',
    });
    const tgtPort = makeSurfacePort({
      surfaceBase: [22, 3, 22],
      surfaceExit: [21.25, 3, 22],
      containerId: 'child-b',
      surfaceY: 3,
      normal: 'neg-x',
    });

    const segments = routeCrossContainer(srcPort, tgtPort, map);

    // Should route through parent surface (y=0+2=2), not ground (y=0)
    const transitions = segments.filter((s) => s.kind === 'transition');
    // At least one transition should involve the parent surface Y=2
    const reachesParentSurface = transitions.some((t) => t.start[1] === 2 || t.end[1] === 2);
    expect(reachesParentSurface).toBe(true);

    // Surface segments on parent should be at Y=2
    const surfaces = segments.filter((s) => s.kind === 'surface');
    if (surfaces.length > 0) {
      for (const s of surfaces) {
        expect(s.start[1]).toBe(2);
        expect(s.end[1]).toBe(2);
      }
    }
  });

  it('skips transition segments when source and target are at the same Y as shared surface', () => {
    const containerA = makeContainerBlock({
      id: 'a',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 10, depth: 10, height: 0 },
    });
    const containerB = makeContainerBlock({
      id: 'b',
      parentId: null,
      position: { x: 20, y: 0, z: 20 },
      frame: { width: 10, depth: 10, height: 0 },
    });
    const map = buildContainerMap([containerA, containerB]);

    // Both surfaces at Y=0, ground also Y=0 → no vertical transitions needed
    const srcPort = makeSurfacePort({
      surfaceBase: [2, 0, 2],
      surfaceExit: [2, 0, 1.25],
      containerId: 'a',
      surfaceY: 0,
      normal: 'neg-z',
    });
    const tgtPort = makeSurfacePort({
      surfaceBase: [22, 0, 22],
      surfaceExit: [21.25, 0, 22],
      containerId: 'b',
      surfaceY: 0,
      normal: 'neg-x',
    });

    const segments = routeCrossContainer(srcPort, tgtPort, map);

    // No transition segments since everything is at Y=0
    const transitions = segments.filter((s) => s.kind === 'transition');
    expect(transitions).toHaveLength(0);

    // Should still have exit + surface + exit
    expect(segments[0].kind).toBe('exit');
    expect(segments[segments.length - 1].kind).toBe('exit');
    expect(segments.some((s) => s.kind === 'surface')).toBe(true);
  });

  it('falls back to ground when LCA id exists but container is missing from map', () => {
    const childA = makeContainerBlock({
      id: 'child-a',
      parentId: 'ghost-parent',
      position: { x: 0, y: 1, z: 0 },
      frame: { width: 10, depth: 10, height: 1 },
    });
    const childB = makeContainerBlock({
      id: 'child-b',
      parentId: 'ghost-parent',
      position: { x: 12, y: 2, z: 12 },
      frame: { width: 10, depth: 10, height: 1 },
    });
    const map = buildContainerMap([childA, childB]);

    const srcPort = makeSurfacePort({
      surfaceBase: [2, 2, 2],
      surfaceExit: [2, 2, 1.25],
      containerId: 'child-a',
      surfaceY: 2,
      normal: 'neg-z',
    });
    const tgtPort = makeSurfacePort({
      surfaceBase: [13, 3, 13],
      surfaceExit: [12.25, 3, 13],
      containerId: 'child-b',
      surfaceY: 3,
      normal: 'neg-x',
    });

    const segments = routeCrossContainer(srcPort, tgtPort, map);
    const transitionSegments = segments.filter((segment) => segment.kind === 'transition');
    const surfaceSegments = segments.filter((segment) => segment.kind === 'surface');

    expect(transitionSegments.length).toBeGreaterThan(0);
    expect(
      transitionSegments.some((segment) => segment.start[1] === 0 || segment.end[1] === 0),
    ).toBe(true);
    expect(surfaceSegments.every((segment) => segment.surfaceId === 'ground')).toBe(true);
  });

  it('routes straight on shared surface when shared source/target align on one axis', () => {
    const containerA = makeContainerBlock({
      id: 'a',
      parentId: null,
      position: { x: 0, y: 2, z: 0 },
      frame: { width: 10, depth: 10, height: 1 },
    });
    const containerB = makeContainerBlock({
      id: 'b',
      parentId: null,
      position: { x: 10, y: 4, z: 10 },
      frame: { width: 10, depth: 10, height: 1 },
    });
    const map = buildContainerMap([containerA, containerB]);

    const srcPort = makeSurfacePort({
      surfaceBase: [2, 3, 2],
      surfaceExit: [1, 3, 2],
      containerId: 'a',
      surfaceY: 3,
      normal: 'neg-x',
    });
    const tgtPort = makeSurfacePort({
      surfaceBase: [1, 5, 10],
      surfaceExit: [1, 5, 9],
      containerId: 'b',
      surfaceY: 5,
      normal: 'neg-z',
    });

    const segments = routeCrossContainer(srcPort, tgtPort, map);
    const surfaceSegments = segments.filter((segment) => segment.kind === 'surface');

    expect(surfaceSegments).toHaveLength(1);
    expect(surfaceSegments[0]).toMatchObject({
      start: [1, 0, 2],
      end: [1, 0, 9],
      surfaceId: 'ground',
    });
  });

  it('uses existing LCA surface even when LCA parent link is missing from map', () => {
    const parent = makeContainerBlock({
      id: 'parent',
      parentId: 'missing-root',
      position: { x: 0, y: 1, z: 0 },
      frame: { width: 30, depth: 30, height: 2 },
    });
    const childA = makeContainerBlock({
      id: 'child-a',
      parentId: 'parent',
      position: { x: 2, y: 0, z: 2 },
      frame: { width: 8, depth: 8, height: 1 },
    });
    const childB = makeContainerBlock({
      id: 'child-b',
      parentId: 'parent',
      position: { x: 16, y: 0, z: 16 },
      frame: { width: 8, depth: 8, height: 1 },
    });
    const map = buildContainerMap([parent, childA, childB]);

    const srcPort = makeSurfacePort({
      surfaceBase: [4, 4, 4],
      surfaceExit: [4, 4, 3.25],
      containerId: 'child-a',
      surfaceY: 4,
      normal: 'neg-z',
    });
    const tgtPort = makeSurfacePort({
      surfaceBase: [18, 4, 18],
      surfaceExit: [17.25, 4, 18],
      containerId: 'child-b',
      surfaceY: 4,
      normal: 'neg-x',
    });

    const segments = routeCrossContainer(srcPort, tgtPort, map);
    const transitions = segments.filter((segment) => segment.kind === 'transition');
    const surfaces = segments.filter((segment) => segment.kind === 'surface');

    expect(transitions.some((segment) => segment.start[1] === 3 || segment.end[1] === 3)).toBe(
      true,
    );
    expect(surfaces.every((segment) => segment.start[1] === 3 && segment.end[1] === 3)).toBe(true);
  });
});
