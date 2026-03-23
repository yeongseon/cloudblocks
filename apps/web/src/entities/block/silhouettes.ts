import type { BrickSilhouette } from '../../shared/types/index';
import type { BlockDimensionsCU } from '../../shared/types/visualProfile';
import {
  BLOCK_MARGIN,
  BLOCK_PADDING,
  TILE_H,
  TILE_W,
  TILE_Z,
} from '../../shared/tokens/designTokens';

export interface SilhouetteDimensions {
  screenWidth: number;
  diamondHeight: number;
  sideWallPx: number;
  cx: number;
  topY: number;
  midY: number;
  bottomY: number;
  leftX: number;
  rightX: number;
  margin: number;
  padding: number;
}

export interface SilhouettePolygons {
  renderMode: 'polygon' | 'cylinder' | 'circle';
  topFacePoints: string;
  leftSidePoints: string;
  rightSidePoints: string;
  ellipseCenter?: { cx: number; cy: number };
  ellipseRadii?: { rx: number; ry: number };
  bodyRect?: { x: number; y: number; width: number; height: number };
  bottomArcPath?: string;
}

type Point = [number, number];
type SilhouetteGenerator = (dimensions: SilhouetteDimensions) => SilhouettePolygons;

function pointsToString(points: ReadonlyArray<Point>): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

const rectSilhouette: SilhouetteGenerator = ({
  sideWallPx,
  cx,
  topY,
  midY,
  bottomY,
  leftX,
  rightX,
}) => ({
  renderMode: 'polygon',
  topFacePoints: pointsToString([
    [cx, topY],
    [rightX, midY],
    [cx, bottomY],
    [leftX, midY],
  ]),
  leftSidePoints: pointsToString([
    [leftX, midY],
    [cx, bottomY],
    [cx, bottomY + sideWallPx],
    [leftX, midY + sideWallPx],
  ]),
  rightSidePoints: pointsToString([
    [cx, bottomY],
    [rightX, midY],
    [rightX, midY + sideWallPx],
    [cx, bottomY + sideWallPx],
  ]),
});

const shieldSilhouette: SilhouetteGenerator = ({
  diamondHeight,
  sideWallPx,
  cx,
  topY,
  midY,
  bottomY,
  leftX,
  rightX,
  margin,
  padding,
}) => {
  const noseOffset = Math.max(4, Math.min((rightX - leftX) * 0.14, padding + margin * 0.35));
  const noseLift = Math.max(3, Math.min(diamondHeight * 0.12, padding * 0.8));
  const notchDepth = Math.max(3, Math.min(sideWallPx * 0.4, padding + 1));

  return {
    renderMode: 'polygon' as const,
    topFacePoints: pointsToString([
      [cx, topY],
      [rightX, midY],
      [cx + noseOffset, bottomY - noseLift],
      [cx, bottomY],
      [leftX, midY],
    ]),
    leftSidePoints: pointsToString([
      [leftX, midY],
      [cx, bottomY],
      [cx, bottomY + sideWallPx],
      [leftX, midY + sideWallPx],
    ]),
    rightSidePoints: pointsToString([
      [cx, bottomY],
      [cx + noseOffset, bottomY - noseLift],
      [rightX, midY],
      [rightX, midY + sideWallPx],
      [cx + noseOffset * 0.45, bottomY + sideWallPx - notchDepth],
      [cx, bottomY + sideWallPx],
    ]),
  };
};

const gatewaySilhouette: SilhouetteGenerator = ({
  diamondHeight,
  sideWallPx,
  cx,
  topY,
  midY,
  bottomY,
  leftX,
  rightX,
  margin,
  padding,
}) => {
  const noseOffset = Math.max(6, Math.min((rightX - leftX) * 0.18, padding + margin * 0.5));
  const noseLift = Math.max(4, Math.min(diamondHeight * 0.15, padding));
  const notchDepth = Math.max(3, Math.min(sideWallPx * 0.35, padding + 1));

  return {
    renderMode: 'polygon' as const,
    topFacePoints: pointsToString([
      [cx, topY],
      [rightX, midY],
      [cx + noseOffset, bottomY - noseLift],
      [cx, bottomY],
      [leftX, midY],
    ]),
    leftSidePoints: pointsToString([
      [leftX, midY],
      [cx, bottomY],
      [cx, bottomY + sideWallPx],
      [leftX, midY + sideWallPx],
    ]),
    rightSidePoints: pointsToString([
      [cx, bottomY],
      [cx + noseOffset, bottomY - noseLift],
      [rightX, midY],
      [rightX, midY + sideWallPx],
      [cx + noseOffset * 0.45, bottomY + sideWallPx - notchDepth],
      [cx, bottomY + sideWallPx],
    ]),
  };
};

const hexSilhouette: SilhouetteGenerator = ({
  diamondHeight,
  sideWallPx,
  cx,
  topY,
  midY,
  bottomY,
  leftX,
  rightX,
  margin,
  padding,
}) => {
  const cornerInset = Math.max(2, Math.min((rightX - leftX) * 0.08, padding * 0.6, margin * 0.8));
  const cornerRise = Math.max(1.5, Math.min(diamondHeight * 0.08, cornerInset * 0.7));

  return {
    renderMode: 'polygon' as const,
    topFacePoints: pointsToString([
      [cx, topY],
      [rightX - cornerInset, midY - cornerRise],
      [rightX, midY],
      [rightX - cornerInset, midY + cornerRise],
      [cx, bottomY],
      [leftX + cornerInset, midY + cornerRise],
      [leftX, midY],
      [leftX + cornerInset, midY - cornerRise],
    ]),
    leftSidePoints: pointsToString([
      [leftX, midY],
      [cx, bottomY],
      [cx, bottomY + sideWallPx],
      [leftX, midY + sideWallPx],
    ]),
    rightSidePoints: pointsToString([
      [cx, bottomY],
      [rightX, midY],
      [rightX, midY + sideWallPx],
      [cx, bottomY + sideWallPx],
    ]),
  };
};

const cylinderSilhouette: SilhouetteGenerator = ({
  sideWallPx,
  cx,
  topY,
  midY,
  bottomY,
  leftX,
  rightX,
}) => {
  const rx = (rightX - leftX) / 2;
  const ry = (bottomY - topY) / 4;

  return {
    renderMode: 'cylinder' as const,
    topFacePoints: pointsToString([
      [cx, topY],
      [rightX, midY],
      [cx, bottomY],
      [leftX, midY],
    ]),
    leftSidePoints: pointsToString([
      [leftX, midY],
      [cx, bottomY],
      [cx, bottomY + sideWallPx],
      [leftX, midY + sideWallPx],
    ]),
    rightSidePoints: pointsToString([
      [cx, bottomY],
      [rightX, midY],
      [rightX, midY + sideWallPx],
      [cx, bottomY + sideWallPx],
    ]),
    ellipseCenter: { cx, cy: midY },
    ellipseRadii: { rx, ry },
    bodyRect: { x: leftX, y: midY, width: rightX - leftX, height: sideWallPx },
    bottomArcPath: `M ${leftX},${midY + sideWallPx} A ${rx},${ry} 0 0,0 ${rightX},${midY + sideWallPx}`,
  };
};

const circleSilhouette: SilhouetteGenerator = ({
  sideWallPx,
  cx,
  topY,
  midY,
  bottomY,
  leftX,
  rightX,
}) => {
  const rx = (rightX - leftX) / 2;
  const ry = (bottomY - topY) / 4;

  return {
    renderMode: 'circle' as const,
    topFacePoints: pointsToString([
      [cx, topY],
      [rightX, midY],
      [cx, bottomY],
      [leftX, midY],
    ]),
    leftSidePoints: pointsToString([
      [leftX, midY],
      [cx, bottomY],
      [cx, bottomY + sideWallPx],
      [leftX, midY + sideWallPx],
    ]),
    rightSidePoints: pointsToString([
      [cx, bottomY],
      [rightX, midY],
      [rightX, midY + sideWallPx],
      [cx, bottomY + sideWallPx],
    ]),
    ellipseCenter: { cx, cy: midY },
    ellipseRadii: { rx, ry },
    bodyRect: { x: leftX, y: midY, width: rightX - leftX, height: sideWallPx },
    bottomArcPath: `M ${leftX},${midY + sideWallPx} A ${rx},${ry} 0 0,0 ${rightX},${midY + sideWallPx}`,
  };
};

export const SILHOUETTE_GENERATORS: Record<BrickSilhouette, SilhouetteGenerator> = {
  rect: rectSilhouette,
  cylinder: cylinderSilhouette,
  gateway: gatewaySilhouette,
  circle: circleSilhouette,
  hex: hexSilhouette,
  shield: shieldSilhouette,
};

// ─── CU-Based Entry Point (v2.0) ──────────────────────────────

/**
 * Convert CU dimensions to pixel-based SilhouetteDimensions.
 * See CLOUDBLOCKS_SPEC_V2.md §13.
 *
 * Formulas:
 *   screenWidth   = (width + depth) × TILE_W / 2
 *   diamondHeight = (width + depth) × TILE_H / 2
 *   sideWallPx    = Math.round(height × TILE_Z)
 * All results are rounded to integers for pixel-perfect rendering (§1.5).
 */
export function cuToSilhouetteDimensions(cu: BlockDimensionsCU): SilhouetteDimensions {
  const screenWidth = ((cu.width + cu.depth) * TILE_W) / 2;
  const diamondHeight = ((cu.width + cu.depth) * TILE_H) / 2;
  const sideWallPx = Math.round(cu.height * TILE_Z);

  const cx = screenWidth / 2;
  const topY = BLOCK_PADDING;
  const midY = diamondHeight / 2 + BLOCK_PADDING;
  const bottomY = diamondHeight + BLOCK_PADDING;
  const leftX = BLOCK_MARGIN;
  const rightX = screenWidth - BLOCK_MARGIN;

  return {
    screenWidth,
    diamondHeight,
    sideWallPx,
    cx,
    topY,
    midY,
    bottomY,
    leftX,
    rightX,
    margin: BLOCK_MARGIN,
    padding: BLOCK_PADDING,
  };
}

/**
 * Generate silhouette polygons from CU dimensions.
 * This is the v2.0 entry point — accepts integer CU dimensions
 * and derives all pixel values via RENDER_SCALE.
 */
export function getSilhouetteFromCU(
  silhouette: BrickSilhouette,
  cu: BlockDimensionsCU,
): SilhouettePolygons {
  return SILHOUETTE_GENERATORS[silhouette](cuToSilhouetteDimensions(cu));
}
