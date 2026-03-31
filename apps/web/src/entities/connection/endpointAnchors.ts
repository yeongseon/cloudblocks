/**
 * Port-aware connection endpoint resolver.
 *
 * Replaces the center-based `getEndpointWorldPosition` with port-aware
 * anchor resolution. Falls back to block center when port info is missing.
 *
 * Design decisions:
 * - Returns world-space points (projected to screen downstream by routing).
 * - External actors always use their existing position (no ports).
 * - Missing/invalid port → fallback to center (backward compat).
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
  getBlockWorldPosition,
  EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
} from '../../shared/utils/position';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import { getBlockWorldAnchors } from '../block/blockGeometry';
import type { PortSide, WorldPoint } from '../block/blockGeometry';
import { resolveEndpointSource } from './endpointResolver';

export interface EndpointAnchors {
  src: WorldPoint;
  tgt: WorldPoint;
  srcSide?: PortSide;
  tgtSide?: PortSide;
  srcFloorY?: number;
  tgtFloorY?: number;
}

/**
 * Resolve world-space connection endpoints, accounting for port positions.
 *
 * @returns World-space src/tgt points with optional side metadata, or null if
 *          either endpoint cannot be resolved.
 */
export function getConnectionEndpointWorldAnchors(
  connection: Connection,
  blocks: ResourceBlock[],
  plates: ContainerBlock[],
  endpoints: Endpoint[],
  externalActors: ExternalActor[] = [],
): EndpointAnchors | null {
  const src = resolveEndpoint(
    connection.from,
    'outbound',
    blocks,
    plates,
    endpoints,
    externalActors,
  );
  if (!src) return null;

  const tgt = resolveEndpoint(connection.to, 'inbound', blocks, plates, endpoints, externalActors);
  if (!tgt) return null;

  return {
    src: src.point,
    tgt: tgt.point,
    srcSide: src.side,
    tgtSide: tgt.side,
    srcFloorY: src.floorY,
    tgtFloorY: tgt.floorY,
  };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

interface ResolvedEndpoint {
  point: WorldPoint;
  side?: PortSide;
  floorY?: number;
}

function resolveEndpoint(
  endpointId: string,
  side: PortSide,
  blocks: ResourceBlock[],
  plates: ContainerBlock[],
  endpoints: Endpoint[],
  externalActors: ExternalActor[],
): ResolvedEndpoint | null {
  const endpoint = endpoints.find((candidate) => candidate.id === endpointId);
  if (!endpoint) {
    return null;
  }

  const resolvedSide = endpoint.direction === 'output' ? 'outbound' : 'inbound';
  if (resolvedSide !== side) {
    return null;
  }

  const source = resolveEndpointSource(endpoint.blockId, blocks, externalActors);
  if (!source) {
    return null;
  }

  if (source.parentId === null && source.isExternal) {
    // Node-backed external: use block geometry for proper port anchors
    const block = blocks.find((candidate) => candidate.id === source.id);
    if (block) {
      const worldPos: WorldPoint = [block.position.x, block.position.y, block.position.z];
      const cu = getBlockDimensions(block.category, block.provider, block.subtype);
      const anchors = getBlockWorldAnchors(worldPos, cu);
      const ports = CATEGORY_PORTS[block.category];
      if (!ports) {
        return { point: anchors.center, floorY: worldPos[1] };
      }
      const total = side === 'inbound' ? ports.inbound : ports.outbound;
      const portIndex = semanticToPortIndex(endpoint.semantic, total);
      if (portIndex !== null) {
        return { point: anchors.port(side, portIndex, total), side, floorY: worldPos[1] };
      }
      return { point: anchors.center, floorY: worldPos[1] };
    }

    // Legacy actor-only fallback
    const rootPoint: WorldPoint = [
      source.position.x,
      source.position.y + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
      source.position.z,
    ];
    return { point: rootPoint, floorY: rootPoint[1] };
  }

  const block = blocks.find((candidate) => candidate.id === source.id);
  if (!block) {
    return null;
  }

  const container = plates.find((candidate) => candidate.id === source.parentId);
  if (!container) {
    return null;
  }

  const worldPos = getBlockWorldPosition(block, container);
  const floorY = container.position.y + (container.frame?.height ?? 0);
  const cu = getBlockDimensions(block.category, block.provider, block.subtype);
  const anchors = getBlockWorldAnchors(worldPos, cu);

  const ports = CATEGORY_PORTS[block.category];
  if (!ports) {
    return { point: anchors.center, floorY };
  }

  const total = side === 'inbound' ? ports.inbound : ports.outbound;
  const portIndex = semanticToPortIndex(endpoint.semantic, total);

  if (portIndex !== null) {
    return {
      point: anchors.port(side, portIndex, total),
      side,
      floorY,
    };
  }

  return { point: anchors.center, floorY };
}

function semanticToPortIndex(semantic: EndpointSemantic, total: number): number | null {
  if (total <= 0) {
    return null;
  }

  const order: EndpointSemantic[] = ['http', 'event', 'data'];
  const index = order.indexOf(semantic);
  if (index < 0) {
    return null;
  }

  return index % total;
}
