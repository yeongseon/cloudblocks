/**
 * Stub-aware connection endpoint resolver.
 *
 * Replaces the center-based `getEndpointWorldPosition` with stub-aware
 * anchor resolution. Falls back to block center when stub info is missing.
 *
 * Design decisions:
 * - Returns world-space points (projected to screen downstream by routing).
 * - External actors always use their existing position (no stubs).
 * - Missing/invalid stub → fallback to center (backward compat).
 */

import type { Connection, ContainerNode, Endpoint, EndpointSemantic, ExternalActor, LeafNode } from '@cloudblocks/schema';
import { CATEGORY_PORTS } from '@cloudblocks/schema';
import { getBlockWorldPosition, EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, EXTERNAL_ACTOR_POSITION } from '../../shared/utils/position';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import { getBlockWorldAnchors } from '../block/blockGeometry';
import type { StubSide, WorldPoint } from '../block/blockGeometry';

export interface EndpointAnchors {
  src: WorldPoint;
  tgt: WorldPoint;
  srcSide?: StubSide;
  tgtSide?: StubSide;
}

/**
 * Resolve world-space connection endpoints, accounting for stub positions.
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

  const tgt = resolveEndpoint(
    connection.to,
    'inbound',
    blocks,
    plates,
    endpoints,
    externalActors,
  );
  if (!tgt) return null;

  return {
    src: src.point,
    tgt: tgt.point,
    srcSide: src.side,
    tgtSide: tgt.side,
  };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

interface ResolvedEndpoint {
  point: WorldPoint;
  side?: StubSide;
}

function resolveEndpoint(
  endpointId: string,
  side: StubSide,
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
    const cu = getBlockDimensions(block.category, block.provider, block.subtype);
    const anchors = getBlockWorldAnchors(worldPos, cu);

    const ports = CATEGORY_PORTS[block.category];
    const total = side === 'inbound' ? ports.inbound : ports.outbound;
    const stubIndex = semanticToStubIndex(endpoint.semantic, total);

    if (stubIndex !== null) {
      return {
        point: anchors.stub(side, stubIndex, total),
        side,
      };
    }

    return { point: anchors.center };
  }

  // Try external actor
  const actor = externalActors.find((a) => a.id === endpoint.nodeId);
  if (actor) {
    const base: WorldPoint = actor.position
      ? [actor.position.x, actor.position.y + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, actor.position.z]
      : [EXTERNAL_ACTOR_POSITION[0], EXTERNAL_ACTOR_POSITION[1] + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, EXTERNAL_ACTOR_POSITION[2]];
    return { point: base };
  }

  return null;
}

function semanticToStubIndex(semantic: EndpointSemantic, total: number): number | null {
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
