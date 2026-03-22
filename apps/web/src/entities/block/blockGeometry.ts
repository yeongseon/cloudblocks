/**
 * Block geometry helpers for stub anchor positioning.
 *
 * Provides world-space anchor points for connection stubs on block faces,
 * and SVG-local stub positions for visual rendering inside BlockSvg.
 *
 * Design decisions (from Oracle consultation):
 * - Stubs are expressed in world coordinates, then projected to screen via worldToScreen.
 * - Inbound stubs sit on the LEFT face (plane x = wx), viewer-left in 2:1 dimetric.
 * - Outbound stubs sit on the RIGHT face (plane z = wz), viewer-right in 2:1 dimetric.
 * - Vertical distribution: t = (index + 1) / (total + 1) along block height.
 */

import type { BlockDimensionsCU } from '../../shared/types/visualProfile';
import { cuToSilhouetteDimensions } from './silhouettes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorldPoint = [number, number, number];
export type StubSide = 'inbound' | 'outbound';

export interface BlockWorldAnchors {
  center: WorldPoint;
  /** Get world-space anchor for a specific stub on a given side. */
  stub(side: StubSide, index: number, total: number): WorldPoint;
}

export interface SvgStubPoint {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// World-space anchors
// ---------------------------------------------------------------------------

/**
 * Compute world-space anchor points for a block.
 *
 * @param worldPos Block world position [wx, wy, wz] (top of parent plate)
 * @param cu       Block CU dimensions
 */
export function getBlockWorldAnchors(
  worldPos: WorldPoint,
  cu: BlockDimensionsCU,
): BlockWorldAnchors {
  const [wx, wy, wz] = worldPos;

  const center: WorldPoint = [wx, wy, wz];

  return {
    center,
    stub(side: StubSide, index: number, total: number): WorldPoint {
      // Evenly distribute stubs vertically. t avoids placing at exact edges.
      const t = (index + 1) / (total + 1);

      if (side === 'inbound') {
        // LEFT face: plane x = wx
        // Horizontally centered on left face (depth midpoint)
        return [wx, wy + t * cu.height, wz + cu.depth / 2];
      }
      // RIGHT face: plane z = wz
      // Horizontally centered on right face (width midpoint)
      return [wx + cu.width / 2, wy + t * cu.height, wz];
    },
  };
}

// ---------------------------------------------------------------------------
// SVG-local stub positions (for BlockSvg rendering — Phase 4)
// ---------------------------------------------------------------------------

/**
 * Compute stub dot positions in the block's local SVG coordinate system.
 *
 * Uses the side wall edges of the silhouette to place stubs by interpolating
 * vertically between the wall top and wall bottom on each face.
 *
 * @param cu Block CU dimensions
 * @param inboundCount  Number of inbound stubs
 * @param outboundCount Number of outbound stubs
 */
export function getBlockSvgStubPoints(
  cu: BlockDimensionsCU,
  inboundCount: number,
  outboundCount: number,
): { inbound: SvgStubPoint[]; outbound: SvgStubPoint[] } {
  const dims = cuToSilhouetteDimensions(cu);

  // Left face vertical edge: from (leftX, midY) down to (leftX, midY + sideWallPx)
  const leftEdgeTop = { x: dims.leftX, y: dims.midY };
  const leftEdgeBottom = { x: dims.leftX, y: dims.midY + dims.sideWallPx };

  // Right face vertical edge: from (rightX, midY) down to (rightX, midY + sideWallPx)
  const rightEdgeTop = { x: dims.rightX, y: dims.midY };
  const rightEdgeBottom = { x: dims.rightX, y: dims.midY + dims.sideWallPx };

  // Inset from the face edge toward the interior so stubs don't overlap silhouette stroke
  const FACE_INSET_PX = 3;

  const inbound: SvgStubPoint[] = [];
  for (let i = 0; i < inboundCount; i++) {
    const t = (i + 1) / (inboundCount + 1);
    inbound.push({
      x: leftEdgeTop.x + FACE_INSET_PX,
      y: leftEdgeTop.y + t * (leftEdgeBottom.y - leftEdgeTop.y),
    });
  }

  const outbound: SvgStubPoint[] = [];
  for (let i = 0; i < outboundCount; i++) {
    const t = (i + 1) / (outboundCount + 1);
    outbound.push({
      x: rightEdgeTop.x - FACE_INSET_PX,
      y: rightEdgeTop.y + t * (rightEdgeBottom.y - rightEdgeTop.y),
    });
  }

  return { inbound, outbound };
}
