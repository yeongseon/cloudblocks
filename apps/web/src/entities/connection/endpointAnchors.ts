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
  ContainerNode,
  Endpoint,
  EndpointSemantic,
  ExternalActor,
  LeafNode,
} from '@cloudblocks/schema';
import { CATEGORY_PORTS } from '@cloudblocks/schema';
import {
  getBlockWorldPosition,
  EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
  EXTERNAL_ACTOR_POSITION,
} from '../../shared/utils/position';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import { getBlockWorldAnchors } from '../block/blockGeometry';
import type { PortSide, WorldPoint } from '../block/blockGeometry';

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
  blocks: LeafNode[],
  plates: ContainerNode[],
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
  blocks: LeafNode[],
  plates: ContainerNode[],
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

  // Try block first
  const block = blocks.find((b) => b.id === endpoint.nodeId);
  if (block) {
    const plate = plates.find((p) => p.id === block.parentId);
    if (!plate) return null;

    const worldPos = getBlockWorldPosition(block, plate);
    const floorY = plate.position.y + plate.size.height;
    const cu = getBlockDimensions(block.category, block.provider, block.subtype);
    const anchors = getBlockWorldAnchors(worldPos, cu);

    const ports = CATEGORY_PORTS[block.category];
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

  // Try external actor
  const actor = externalActors.find((a) => a.id === endpoint.nodeId);
  if (actor) {
    const pos = actor.position ?? {
      x: EXTERNAL_ACTOR_POSITION[0],
      y: EXTERNAL_ACTOR_POSITION[1],
      z: EXTERNAL_ACTOR_POSITION[2],
    };
    const base: WorldPoint = [pos.x, pos.y + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, pos.z];
    return { point: base, floorY: pos.y + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET };
  }

  return null;
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
