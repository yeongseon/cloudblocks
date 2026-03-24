/**
 * Block geometry helpers for port anchor positioning.
 *
 * Provides world-space anchor points for connection ports on block faces,
 * and SVG-local port positions for visual rendering inside BlockSvg.
 *
 * Design decisions:
 * - Ports are expressed in world coordinates, then projected to screen via worldToScreen.
 * - Inbound ports sit on the LEFT face bottom edge (y = wy, distributed along z).
 * - Outbound ports sit on the RIGHT face bottom edge (y = wy, distributed along x).
 * - All ports at block base (plate floor) for PCB-style floor routing.
 */

import type { BlockDimensionsCU } from '../../shared/types/visualProfile';
import { cuToSilhouetteDimensions } from './silhouettes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorldPoint = [number, number, number];
export type PortSide = 'inbound' | 'outbound';

export interface BlockWorldAnchors {
  center: WorldPoint;
  /** Get world-space anchor for a specific port on a given side. */
  port(side: PortSide, index: number, total: number): WorldPoint;
}

export interface SvgPortPoint {
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
    port(side: PortSide, index: number, total: number): WorldPoint {
      // Ports sit at the BOTTOM of the block (wy = block base = plate floor).
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
// SVG-local port positions (for BlockSvg rendering — Phase 4)
// ---------------------------------------------------------------------------

/**
 * Compute port dot positions in the block's local SVG coordinate system.
 *
 * Uses the side wall edges of the silhouette to place ports by interpolating
 * vertically between the wall top and wall bottom on each face.
 *
 * @param cu Block CU dimensions
 * @param inboundCount  Number of inbound ports
 * @param outboundCount Number of outbound ports
 */
export function getBlockSvgPortPoints(
  cu: BlockDimensionsCU,
  inboundCount: number,
  outboundCount: number,
): { inbound: SvgPortPoint[]; outbound: SvgPortPoint[] } {
  const dims = cuToSilhouetteDimensions(cu);

  // Bottom of left side wall: from leftX to cx at y = midY + sideWallPx
  const leftBottomY = dims.midY + dims.sideWallPx;
  const leftBottomLeftX = dims.leftX;
  const leftBottomRightX = dims.cx;

  // Bottom of right side wall: from cx to rightX at y = midY + sideWallPx
  const rightBottomY = dims.midY + dims.sideWallPx;
  const rightBottomLeftX = dims.cx;
  const rightBottomRightX = dims.rightX;

  const inbound: SvgPortPoint[] = [];
  for (let i = 0; i < inboundCount; i++) {
    const t = (i + 1) / (inboundCount + 1);
    inbound.push({
      x: leftBottomLeftX + t * (leftBottomRightX - leftBottomLeftX),
      y: leftBottomY,
    });
  }

  const outbound: SvgPortPoint[] = [];
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
// Port index ↔ endpoint semantic mapping
// ---------------------------------------------------------------------------

import type { EndpointSemantic } from '@cloudblocks/schema';

/** Canonical ordering of endpoint semantics on each face. */
const SEMANTIC_ORDER: readonly EndpointSemantic[] = ['http', 'event', 'data'] as const;

/**
 * Map a port index to its endpoint semantic.
 *
 * Ports are rendered in a fixed order: index 0 → http, 1 → event, 2 → data.
 * When the block has fewer ports than semantics, the mapping wraps (index % 3).
 *
 * This matches the `semanticToPortIndex` logic in `endpointAnchors.ts`.
 */
export function portIndexToSemantic(index: number): EndpointSemantic {
  return SEMANTIC_ORDER[index % SEMANTIC_ORDER.length];
}
