/**
 * Block geometry helpers for stub anchor positioning.
 *
 * Provides world-space anchor points for connection stubs on block faces,
 * and SVG-local stub positions for visual rendering inside BlockSvg.
 *
 * Design decisions:
 * - Stubs are expressed in world coordinates, then projected to screen via worldToScreen.
 * - Inbound stubs sit on the LEFT face bottom edge (y = wy, distributed along z).
 * - Outbound stubs sit on the RIGHT face bottom edge (y = wy, distributed along x).
 * - All stubs at block base (plate floor) for PCB-style floor routing.
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
      // Stubs sit at the BOTTOM of the block (wy = block base = plate floor).
      // Distributed horizontally along the bottom edge of each face.
      const t = (index + 1) / (total + 1);

      if (side === 'inbound') {
        // LEFT face bottom edge: y = wy (base), distributed along depth (z-axis)
        return [wx, wy, wz + t * cu.depth];
      }
      // RIGHT face bottom edge: y = wy (base), distributed along width (x-axis)
      return [wx + t * cu.width, wy, wz];
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

  // Bottom of left side wall: from leftX to cx at y = midY + sideWallPx
  const leftBottomY = dims.midY + dims.sideWallPx;
  const leftBottomLeftX = dims.leftX;
  const leftBottomRightX = dims.cx;

  // Bottom of right side wall: from cx to rightX at y = midY + sideWallPx
  const rightBottomY = dims.midY + dims.sideWallPx;
  const rightBottomLeftX = dims.cx;
  const rightBottomRightX = dims.rightX;

  const inbound: SvgStubPoint[] = [];
  for (let i = 0; i < inboundCount; i++) {
    const t = (i + 1) / (inboundCount + 1);
    inbound.push({
      x: leftBottomLeftX + t * (leftBottomRightX - leftBottomLeftX),
      y: leftBottomY,
    });
  }

  const outbound: SvgStubPoint[] = [];
  for (let i = 0; i < outboundCount; i++) {
    const t = (i + 1) / (outboundCount + 1);
    outbound.push({
      x: rightBottomLeftX + t * (rightBottomRightX - rightBottomLeftX),
      y: rightBottomY,
    });
  }

  return { inbound, outbound };
}

// ---------------------------------------------------------------------------
// Stub index ↔ endpoint semantic mapping
// ---------------------------------------------------------------------------

import type { EndpointSemantic } from '@cloudblocks/schema';

/** Canonical ordering of endpoint semantics on each face. */
const SEMANTIC_ORDER: readonly EndpointSemantic[] = ['http', 'event', 'data'] as const;

/**
 * Map a stub index to its endpoint semantic.
 *
 * Stubs are rendered in a fixed order: index 0 → http, 1 → event, 2 → data.
 * When the block has fewer stubs than semantics, the mapping wraps (index % 3).
 *
 * This matches the `semanticToStubIndex` logic in `endpointAnchors.ts`.
 */
export function stubIndexToSemantic(index: number): EndpointSemantic {
  return SEMANTIC_ORDER[index % SEMANTIC_ORDER.length];
}
