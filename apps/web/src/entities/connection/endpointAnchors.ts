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

import type { Connection, ContainerNode, ExternalActor, LeafNode } from '@cloudblocks/schema';
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
  externalActors: ExternalActor[],
): EndpointAnchors | null {
  const src = resolveEndpoint(
    connection.sourceId,
    connection.sourceStub,
    'outbound',
    blocks,
    plates,
    externalActors,
  );
  if (!src) return null;

  const tgt = resolveEndpoint(
    connection.targetId,
    connection.targetStub,
    'inbound',
    blocks,
    plates,
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
  id: string,
  stubIndex: number | undefined,
  side: StubSide,
  blocks: LeafNode[],
  plates: ContainerNode[],
  externalActors: ExternalActor[],
): ResolvedEndpoint | null {
  // Try block first
  const block = blocks.find((b) => b.id === id);
  if (block) {
    const plate = plates.find((p) => p.id === block.parentId);
    if (!plate) return null;

    const worldPos = getBlockWorldPosition(block, plate);
    const cu = getBlockDimensions(block.category, block.provider, block.subtype);
    const anchors = getBlockWorldAnchors(worldPos, cu);

    // Determine total stubs for this side from the category's port policy
    const ports = CATEGORY_PORTS[block.category];
    const total = side === 'inbound' ? ports.inbound : ports.outbound;

    // Validate stub index — fall back to center if invalid or missing
    if (stubIndex != null && stubIndex >= 0 && stubIndex < total) {
      return {
        point: anchors.stub(side, stubIndex, total),
        side,
      };
    }

    // Fallback: block center
    return { point: anchors.center };
  }

  // Try external actor
  const actor = externalActors.find((a) => a.id === id);
  if (actor) {
    const base: WorldPoint = actor.position
      ? [actor.position.x, actor.position.y + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, actor.position.z]
      : [EXTERNAL_ACTOR_POSITION[0], EXTERNAL_ACTOR_POSITION[1] + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, EXTERNAL_ACTOR_POSITION[2]];
    return { point: base };
  }

  return null;
}
