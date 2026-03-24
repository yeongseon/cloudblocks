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
import { getBlockWorldPosition } from '../../shared/utils/position';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import type { PortSide } from '../block/blockGeometry';

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
  const surfaceY = container.position.y + container.frame.height;
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

function resolveEndpointContext(
  endpointId: string,
  side: PortSide,
  blocks: ResourceBlock[],
  plates: ContainerBlock[],
  endpoints: Endpoint[],
): {
  block: ResourceBlock;
  container: ContainerBlock;
  portIndex: number;
  totalPorts: number;
} | null {
  const endpoint = endpoints.find((ep) => ep.id === endpointId);
  if (!endpoint) return null;

  const resolvedSide = endpoint.direction === 'output' ? 'outbound' : 'inbound';
  if (resolvedSide !== side) return null;

  const block = blocks.find((b) => b.id === endpoint.blockId);
  if (!block) return null;

  const container = plates.find((p) => p.id === block.parentId);
  if (!container) return null;

  const ports = CATEGORY_PORTS[block.category];
  const total = side === 'inbound' ? ports.inbound : ports.outbound;
  const portIndex = semanticToIndex(endpoint.semantic, total);
  if (portIndex === null) return null;

  return { block, container, portIndex, totalPorts: total };
}

function semanticToIndex(semantic: EndpointSemantic, total: number): number | null {
  if (total <= 0) return null;
  const order: EndpointSemantic[] = ['http', 'event', 'data'];
  const index = order.indexOf(semantic);
  if (index < 0) return null;
  return index % total;
}

/**
 * Compute the full surface route for a connection.
 *
 * Returns null if either endpoint cannot be resolved (external actors
 * are not yet supported in surface routing).
 */
export function getConnectionSurfaceRoute(
  connection: Connection,
  blocks: ResourceBlock[],
  plates: ContainerBlock[],
  endpoints: Endpoint[],
  _externalActors: ExternalActor[] = [],
): SurfaceRoute | null {
  const srcCtx = resolveEndpointContext(connection.from, 'outbound', blocks, plates, endpoints);
  if (!srcCtx) return null;

  const tgtCtx = resolveEndpointContext(connection.to, 'inbound', blocks, plates, endpoints);
  if (!tgtCtx) return null;

  const srcPort = resolveSurfacePort(
    srcCtx.block,
    srcCtx.container,
    'outbound',
    srcCtx.portIndex,
    srcCtx.totalPorts,
  );
  const tgtPort = resolveSurfacePort(
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

  // Cross-container: temporary fallback via ground surface (see #1357)
  const groundY = 0;
  const groundSrc: SurfacePort = {
    ...srcPort,
    surfaceY: groundY,
    surfaceBase: [srcPort.surfaceBase[0], groundY, srcPort.surfaceBase[2]],
    surfaceExit: [srcPort.surfaceExit[0], groundY, srcPort.surfaceExit[2]],
  };
  const groundTgt: SurfacePort = {
    ...tgtPort,
    surfaceY: groundY,
    surfaceBase: [tgtPort.surfaceBase[0], groundY, tgtPort.surfaceBase[2]],
    surfaceExit: [tgtPort.surfaceExit[0], groundY, tgtPort.surfaceExit[2]],
  };
  const segments = routeSameSurface(groundSrc, groundTgt);
  const transitionSegments = segments.map((seg) => ({
    ...seg,
    kind: 'transition' as RouteSegmentKind,
  }));
  return { segments: transitionSegments, srcPort: groundSrc, tgtPort: groundTgt };
}
