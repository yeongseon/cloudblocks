/**
 * Surface routing — world-space Manhattan routing on container surfaces.
 *
 * Connections are routed as flat PCB-style traces on the container top face
 * (X/Z plane at container surfaceY). This replaces the screen-space L-route
 * in routing.ts with a world-space surface-first system.
 */

import type {
  Connection,
  ContainerBlock,
  Endpoint,
  EndpointSemantic,
  ExternalActor,
  ResourceBlock,
} from '@cloudblocks/schema';
import { CATEGORY_PORTS } from '@cloudblocks/schema';
import {
  EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
  getBlockWorldPosition,
} from '../../shared/utils/position';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import type { PortSide } from '../block/blockGeometry';
import { resolveEndpointSource } from './endpointResolver';

export type WorldPoint3 = [number, number, number];

export interface SurfacePort {
  surfaceBase: WorldPoint3;
  surfaceExit: WorldPoint3;
  containerId: string;
  surfaceY: number;
  normal: 'neg-x' | 'neg-z';
}

export type RouteSegmentKind = 'exit' | 'surface' | 'transition';

export interface WorldRouteSegment {
  start: WorldPoint3;
  end: WorldPoint3;
  kind: RouteSegmentKind;
  surfaceId?: string;
}

export interface SurfaceRoute {
  segments: WorldRouteSegment[];
  srcPort: SurfacePort;
  tgtPort: SurfacePort;
}

/** Visual clearance (CU) so routes don't start under the block footprint. */
export const SURFACE_EXIT_OFFSET_CU = 0.75;

/**
 * Compute the surface port for a block endpoint.
 *
 * Inbound ports: LEFT face (world-X edge), offset in neg-X.
 * Outbound ports: RIGHT face (world-Z edge), offset in neg-Z.
 * Ports are distributed along the face edge with t = (i+1)/(n+1).
 */
export function resolveSurfacePort(
  block: ResourceBlock,
  container: ContainerBlock,
  side: PortSide,
  portIndex: number,
  totalPorts: number,
): SurfacePort {
  const [bx, , bz] = getBlockWorldPosition(block, container);
  const cu = getBlockDimensions(block.category, block.provider, block.subtype);
  const surfaceY = container.position.y + (container.frame?.height ?? 0);
  const t = (portIndex + 1) / (totalPorts + 1);

  if (side === 'inbound') {
    const portZ = bz + t * cu.depth;
    const surfaceBase: WorldPoint3 = [bx, surfaceY, portZ];
    const surfaceExit: WorldPoint3 = [bx - SURFACE_EXIT_OFFSET_CU, surfaceY, portZ];
    return { surfaceBase, surfaceExit, containerId: container.id, surfaceY, normal: 'neg-x' };
  }

  const portX = bx + t * cu.width;
  const surfaceBase: WorldPoint3 = [portX, surfaceY, bz];
  const surfaceExit: WorldPoint3 = [portX, surfaceY, bz - SURFACE_EXIT_OFFSET_CU];
  return { surfaceBase, surfaceExit, containerId: container.id, surfaceY, normal: 'neg-z' };
}

function manhattanXZ(a: WorldPoint3, b: WorldPoint3): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]);
}

/**
 * Score an L-shape elbow candidate. Penalises routes whose first/last
 * segment does not align with the source/target port normal direction.
 */
function scoreElbow(
  srcExit: WorldPoint3,
  elbow: WorldPoint3,
  tgtExit: WorldPoint3,
  srcNormal: 'neg-x' | 'neg-z',
  tgtNormal: 'neg-x' | 'neg-z',
): number {
  let score = manhattanXZ(srcExit, elbow) + manhattanXZ(elbow, tgtExit);

  const firstDX = Math.abs(elbow[0] - srcExit[0]);
  const firstDZ = Math.abs(elbow[2] - srcExit[2]);
  if (srcNormal === 'neg-x' && firstDX < firstDZ) score += 2;
  if (srcNormal === 'neg-z' && firstDZ < firstDX) score += 2;

  const lastDX = Math.abs(tgtExit[0] - elbow[0]);
  const lastDZ = Math.abs(tgtExit[2] - elbow[2]);
  if (tgtNormal === 'neg-x' && lastDX < lastDZ) score += 2;
  if (tgtNormal === 'neg-z' && lastDZ < lastDX) score += 2;

  return score;
}

/**
 * Route between two surface ports on the SAME container.
 *
 * Produces exit → surface (L-shape via elbow) → exit segments.
 * Evaluates two elbow candidates and picks the lower-scoring one.
 */
export function routeSameSurface(src: SurfacePort, tgt: SurfacePort): WorldRouteSegment[] {
  const y = src.surfaceY;
  const surfaceId = src.containerId;

  const exitSrc: WorldRouteSegment = {
    start: src.surfaceBase,
    end: src.surfaceExit,
    kind: 'exit',
    surfaceId,
  };
  const exitTgt: WorldRouteSegment = {
    start: tgt.surfaceExit,
    end: tgt.surfaceBase,
    kind: 'exit',
    surfaceId,
  };

  const [sx, , sz] = src.surfaceExit;
  const [tx, , tz] = tgt.surfaceExit;

  if (Math.abs(sx - tx) < 0.01 && Math.abs(sz - tz) < 0.01) {
    return [exitSrc, exitTgt];
  }

  if (Math.abs(sx - tx) < 0.01 || Math.abs(sz - tz) < 0.01) {
    const seg: WorldRouteSegment = {
      start: src.surfaceExit,
      end: tgt.surfaceExit,
      kind: 'surface',
      surfaceId,
    };
    return [exitSrc, seg, exitTgt];
  }

  const elbowA: WorldPoint3 = [sx, y, tz];
  const elbowB: WorldPoint3 = [tx, y, sz];

  const scoreA = scoreElbow(src.surfaceExit, elbowA, tgt.surfaceExit, src.normal, tgt.normal);
  const scoreB = scoreElbow(src.surfaceExit, elbowB, tgt.surfaceExit, src.normal, tgt.normal);
  const elbow = scoreA <= scoreB ? elbowA : elbowB;

  const seg1: WorldRouteSegment = {
    start: src.surfaceExit,
    end: elbow,
    kind: 'surface',
    surfaceId,
  };
  const seg2: WorldRouteSegment = {
    start: elbow,
    end: tgt.surfaceExit,
    kind: 'surface',
    surfaceId,
  };

  return [exitSrc, seg1, seg2, exitTgt];
}

/**
 * Walk up the container parentId chain and return the ancestor IDs
 * from the given container to the root (inclusive).
 */
function getAncestorChain(
  containerId: string,
  containerMap: Map<string, ContainerBlock>,
): string[] {
  const chain: string[] = [containerId];
  let current = containerMap.get(containerId);
  while (current?.parentId) {
    chain.push(current.parentId);
    current = containerMap.get(current.parentId);
  }
  return chain;
}

/**
 * Find the Lowest Common Ancestor (LCA) of two containers.
 * Returns the container ID of the LCA, or null if they share no ancestor
 * (both are top-level siblings — route via ground plane).
 */
export function findLCA(
  srcContainerId: string,
  tgtContainerId: string,
  containerMap: Map<string, ContainerBlock>,
): string | null {
  const srcChain = getAncestorChain(srcContainerId, containerMap);
  const tgtSet = new Set(getAncestorChain(tgtContainerId, containerMap));
  for (const ancestorId of srcChain) {
    if (tgtSet.has(ancestorId)) return ancestorId;
  }
  return null;
}

/**
 * Get the surface Y (top face) of a container in world space.
 * For nested containers, walks up the parentId chain to accumulate Y offsets.
 */
function getContainerWorldSurfaceY(
  container: ContainerBlock,
  containerMap: Map<string, ContainerBlock>,
): number {
  let y = container.position.y + (container.frame?.height ?? 0);
  let current = container;
  while (current.parentId) {
    const parent = containerMap.get(current.parentId);
    if (!parent) break;
    y += parent.position.y + (parent.frame?.height ?? 0);
    current = parent;
  }
  return y;
}

/**
 * Route between two surface ports on DIFFERENT containers.
 *
 * Strategy:
 * 1. Find the LCA (or use ground plane if both are top-level)
 * 2. Produce exit segments on source container surface
 * 3. Add vertical transition from source surface down to shared surface
 * 4. Route horizontally on the shared surface (Manhattan L-shape)
 * 5. Add vertical transition from shared surface up to target surface
 * 6. Produce exit segments on target container surface
 */
export function routeCrossContainer(
  srcPort: SurfacePort,
  tgtPort: SurfacePort,
  containerMap: Map<string, ContainerBlock>,
): WorldRouteSegment[] {
  const lca = findLCA(srcPort.containerId, tgtPort.containerId, containerMap);

  // Determine the shared surface Y: LCA top face, or ground (y=0) for top-level siblings
  let sharedY: number;
  let sharedSurfaceId: string;
  if (lca) {
    const lcaContainer = containerMap.get(lca);
    if (lcaContainer) {
      sharedY = getContainerWorldSurfaceY(lcaContainer, containerMap);
      sharedSurfaceId = lca;
    } else {
      sharedY = 0;
      sharedSurfaceId = 'ground';
    }
  } else {
    sharedY = 0;
    sharedSurfaceId = 'ground';
  }

  const segments: WorldRouteSegment[] = [];

  // 1. Exit from source block to source container surface edge
  segments.push({
    start: srcPort.surfaceBase,
    end: srcPort.surfaceExit,
    kind: 'exit',
    surfaceId: srcPort.containerId,
  });

  // 2. Vertical transition from source surface down to shared surface
  const srcDropStart = srcPort.surfaceExit;
  const srcDropEnd: WorldPoint3 = [srcDropStart[0], sharedY, srcDropStart[2]];
  if (Math.abs(srcDropStart[1] - sharedY) > 0.01) {
    segments.push({
      start: srcDropStart,
      end: srcDropEnd,
      kind: 'transition',
      surfaceId: sharedSurfaceId,
    });
  }

  // 3. Manhattan route on the shared surface (X/Z plane at sharedY)
  const sharedSrc: WorldPoint3 = srcDropEnd;
  const tgtRiseStart: WorldPoint3 = [tgtPort.surfaceExit[0], sharedY, tgtPort.surfaceExit[2]];

  // Route on shared surface: same logic as routeSameSurface but on shared plane
  const [sx, , sz] = sharedSrc;
  const [tx, , tz] = tgtRiseStart;

  if (Math.abs(sx - tx) < 0.01 && Math.abs(sz - tz) < 0.01) {
    // Directly aligned — no horizontal segment needed
  } else if (Math.abs(sx - tx) < 0.01 || Math.abs(sz - tz) < 0.01) {
    // Straight line on shared surface
    segments.push({
      start: sharedSrc,
      end: tgtRiseStart,
      kind: 'surface',
      surfaceId: sharedSurfaceId,
    });
  } else {
    // L-shape with elbow scoring
    const elbowA: WorldPoint3 = [sx, sharedY, tz];
    const elbowB: WorldPoint3 = [tx, sharedY, sz];
    const scoreA = scoreElbow(sharedSrc, elbowA, tgtRiseStart, srcPort.normal, tgtPort.normal);
    const scoreB = scoreElbow(sharedSrc, elbowB, tgtRiseStart, srcPort.normal, tgtPort.normal);
    const elbow = scoreA <= scoreB ? elbowA : elbowB;

    segments.push({
      start: sharedSrc,
      end: elbow,
      kind: 'surface',
      surfaceId: sharedSurfaceId,
    });
    segments.push({
      start: elbow,
      end: tgtRiseStart,
      kind: 'surface',
      surfaceId: sharedSurfaceId,
    });
  }

  // 4. Vertical transition from shared surface up to target surface
  const tgtRiseEnd = tgtPort.surfaceExit;
  if (Math.abs(sharedY - tgtRiseEnd[1]) > 0.01) {
    segments.push({
      start: tgtRiseStart,
      end: tgtRiseEnd,
      kind: 'transition',
      surfaceId: tgtPort.containerId,
    });
  }

  // 5. Exit into target block
  segments.push({
    start: tgtPort.surfaceExit,
    end: tgtPort.surfaceBase,
    kind: 'exit',
    surfaceId: tgtPort.containerId,
  });

  return segments;
}

function resolveEndpointContext(
  endpointId: string,
  side: PortSide,
  blocks: ResourceBlock[],
  plates: ContainerBlock[],
  endpoints: Endpoint[],
  externalActors: ExternalActor[],
):
  | {
      kind: 'block';
      block: ResourceBlock;
      container: ContainerBlock;
      portIndex: number;
      totalPorts: number;
    }
  | {
      kind: 'rootBlock';
      block: ResourceBlock;
      portIndex: number;
      totalPorts: number;
    }
  | {
      kind: 'root';
      position: { x: number; y: number; z: number };
    }
  | null {
  const endpoint = endpoints.find((ep) => ep.id === endpointId);
  if (!endpoint) return null;

  const resolvedSide = endpoint.direction === 'output' ? 'outbound' : 'inbound';
  if (resolvedSide !== side) return null;

  const source = resolveEndpointSource(endpoint.blockId, blocks, externalActors);
  if (!source) {
    return null;
  }

  if (source.parentId === null && source.isExternal) {
    // Node-backed root external: return as rootBlock for proper geometry
    const block = blocks.find((candidate) => candidate.id === source.id);
    if (block) {
      const ports = CATEGORY_PORTS[block.category];
      const total = side === 'inbound' ? ports.inbound : ports.outbound;
      const portIndex = semanticToIndex(endpoint.semantic, total);
      if (portIndex === null) return null;
      return { kind: 'rootBlock', block, portIndex, totalPorts: total };
    }
    // Legacy actor-only fallback
    return { kind: 'root', position: source.position };
  }

  const block = blocks.find((candidate) => candidate.id === source.id);
  if (!block) {
    return null;
  }

  const container = plates.find((p) => p.id === source.parentId);
  if (!container) return null;

  const ports = CATEGORY_PORTS[block.category];
  const total = side === 'inbound' ? ports.inbound : ports.outbound;
  const portIndex = semanticToIndex(endpoint.semantic, total);
  if (portIndex === null) return null;

  return { kind: 'block', block, container, portIndex, totalPorts: total };
}

function resolveSurfacePortForRootBlock(position: {
  x: number;
  y: number;
  z: number;
}): SurfacePort {
  const y = position.y + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET;
  const surfaceBase: WorldPoint3 = [position.x, y, position.z];
  const surfaceExit: WorldPoint3 = [position.x, y, position.z - SURFACE_EXIT_OFFSET_CU];

  return {
    surfaceBase,
    surfaceExit,
    containerId: 'ground',
    surfaceY: y,
    normal: 'neg-z',
  };
}

function resolveSurfacePortForNodeBackedRootBlock(
  block: ResourceBlock,
  side: PortSide,
  portIndex: number,
  totalPorts: number,
): SurfacePort {
  const [bx, , bz] = [block.position.x, block.position.y, block.position.z];
  const cu = getBlockDimensions(block.category, block.provider, block.subtype);
  const surfaceY = block.position.y;
  const t = (portIndex + 1) / (totalPorts + 1);

  if (side === 'inbound') {
    const portZ = bz + t * cu.depth;
    const surfaceBase: WorldPoint3 = [bx, surfaceY, portZ];
    const surfaceExit: WorldPoint3 = [bx - SURFACE_EXIT_OFFSET_CU, surfaceY, portZ];
    return { surfaceBase, surfaceExit, containerId: 'ground', surfaceY, normal: 'neg-x' };
  }

  const portX = bx + t * cu.width;
  const surfaceBase: WorldPoint3 = [portX, surfaceY, bz];
  const surfaceExit: WorldPoint3 = [portX, surfaceY, bz - SURFACE_EXIT_OFFSET_CU];
  return { surfaceBase, surfaceExit, containerId: 'ground', surfaceY, normal: 'neg-z' };
}

function semanticToIndex(semantic: EndpointSemantic, total: number): number | null {
  if (total <= 0) return null;
  const order: EndpointSemantic[] = ['http', 'event', 'data'];
  const index = order.indexOf(semantic);
  if (index < 0) return null;
  return index % total;
}

export function getConnectionSurfaceRoute(
  connection: Connection,
  blocks: ResourceBlock[],
  plates: ContainerBlock[],
  endpoints: Endpoint[],
  externalActors: ExternalActor[] = [],
): SurfaceRoute | null {
  const srcCtx = resolveEndpointContext(
    connection.from,
    'outbound',
    blocks,
    plates,
    endpoints,
    externalActors,
  );
  if (!srcCtx) return null;

  const tgtCtx = resolveEndpointContext(
    connection.to,
    'inbound',
    blocks,
    plates,
    endpoints,
    externalActors,
  );
  if (!tgtCtx) return null;

  const srcPort =
    srcCtx.kind === 'root'
      ? resolveSurfacePortForRootBlock(srcCtx.position)
      : srcCtx.kind === 'rootBlock'
        ? resolveSurfacePortForNodeBackedRootBlock(
            srcCtx.block,
            'outbound',
            srcCtx.portIndex,
            srcCtx.totalPorts,
          )
        : resolveSurfacePort(
            srcCtx.block,
            srcCtx.container,
            'outbound',
            srcCtx.portIndex,
            srcCtx.totalPorts,
          );

  const tgtPort =
    tgtCtx.kind === 'root'
      ? resolveSurfacePortForRootBlock(tgtCtx.position)
      : tgtCtx.kind === 'rootBlock'
        ? resolveSurfacePortForNodeBackedRootBlock(
            tgtCtx.block,
            'inbound',
            tgtCtx.portIndex,
            tgtCtx.totalPorts,
          )
        : resolveSurfacePort(
            tgtCtx.block,
            tgtCtx.container,
            'inbound',
            tgtCtx.portIndex,
            tgtCtx.totalPorts,
          );

  if (srcPort.containerId === tgtPort.containerId) {
    const segments = routeSameSurface(srcPort, tgtPort);
    return { segments, srcPort, tgtPort };
  }

  // Cross-container: route through nearest shared ancestor surface (or ground)
  const containerMap = new Map(plates.map((p) => [p.id, p]));
  const segments = routeCrossContainer(srcPort, tgtPort, containerMap);
  return { segments, srcPort, tgtPort };
}
