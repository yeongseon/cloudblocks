import type { BrickSilhouette } from '../../shared/types/index';

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
  topFacePoints: string;
  leftSidePoints: string;
  rightSidePoints: string;
}

type Point = [number, number];
type SilhouetteGenerator = (dimensions: SilhouetteDimensions) => SilhouettePolygons;

function pointsToString(points: ReadonlyArray<Point>): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

const towerSilhouette: SilhouetteGenerator = ({
  screenWidth,
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
  const crownInset = Math.max(2, Math.min(padding * 0.6, (rightX - leftX) * 0.14, screenWidth * 0.08));
  const crownDrop = Math.max(2, Math.min(diamondHeight * 0.18, padding + margin * 0.4));

  const topFacePoints = pointsToString([
    [cx, topY],
    [cx + crownInset, topY + crownDrop],
    [rightX, midY],
    [cx, bottomY],
    [leftX, midY],
    [cx - crownInset, topY + crownDrop],
  ]);

  const leftSidePoints = pointsToString([
    [leftX, midY],
    [cx, bottomY],
    [cx, bottomY + sideWallPx],
    [leftX, midY + sideWallPx],
  ]);

  const rightSidePoints = pointsToString([
    [cx, bottomY],
    [rightX, midY],
    [rightX, midY + sideWallPx],
    [cx, bottomY + sideWallPx],
  ]);

  return { topFacePoints, leftSidePoints, rightSidePoints };
};

const heavySilhouette: SilhouetteGenerator = ({
  screenWidth,
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
  const expand = Math.max(2, Math.min(margin * 0.9 + padding * 0.2, screenWidth * 0.07));
  const frontInset = Math.max(2, Math.min(diamondHeight * 0.12, padding * 0.7));
  const heavyLeft = Math.max(0, leftX - expand);
  const heavyRight = Math.min(screenWidth, rightX + expand);
  const frontSpread = Math.max(4, (heavyRight - heavyLeft) * 0.12);

  const topFacePoints = pointsToString([
    [cx, topY + frontInset * 0.5],
    [heavyRight, midY],
    [cx + frontSpread, bottomY - frontInset],
    [cx, bottomY],
    [cx - frontSpread, bottomY - frontInset],
    [heavyLeft, midY],
  ]);

  const leftSidePoints = pointsToString([
    [heavyLeft, midY],
    [cx - frontSpread, bottomY - frontInset],
    [cx, bottomY],
    [cx, bottomY + sideWallPx],
    [heavyLeft, midY + sideWallPx],
  ]);

  const rightSidePoints = pointsToString([
    [cx, bottomY],
    [cx + frontSpread, bottomY - frontInset],
    [heavyRight, midY],
    [heavyRight, midY + sideWallPx],
    [cx, bottomY + sideWallPx],
  ]);

  return { topFacePoints, leftSidePoints, rightSidePoints };
};

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

  const topFacePoints = pointsToString([
    [cx, topY],
    [rightX, midY],
    [cx + noseOffset, bottomY - noseLift],
    [cx, bottomY],
    [leftX, midY],
  ]);

  const leftSidePoints = pointsToString([
    [leftX, midY],
    [cx, bottomY],
    [cx, bottomY + sideWallPx],
    [leftX, midY + sideWallPx],
  ]);

  const rightSidePoints = pointsToString([
    [cx, bottomY],
    [cx + noseOffset, bottomY - noseLift],
    [rightX, midY],
    [rightX, midY + sideWallPx],
    [cx + noseOffset * 0.45, bottomY + sideWallPx - notchDepth],
    [cx, bottomY + sideWallPx],
  ]);

  return { topFacePoints, leftSidePoints, rightSidePoints };
};

const moduleSilhouette: SilhouetteGenerator = ({
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
  const cornerInset = Math.max(1.5, Math.min((rightX - leftX) * 0.05, padding * 0.45, margin * 0.6));
  const cornerRise = Math.max(1, Math.min(diamondHeight * 0.05, cornerInset * 0.6));

  const topFacePoints = pointsToString([
    [cx, topY],
    [rightX - cornerInset, midY - cornerRise],
    [rightX, midY],
    [rightX - cornerInset, midY + cornerRise],
    [cx, bottomY],
    [leftX + cornerInset, midY + cornerRise],
    [leftX, midY],
    [leftX + cornerInset, midY - cornerRise],
  ]);

  const leftSidePoints = pointsToString([
    [leftX, midY],
    [cx, bottomY],
    [cx, bottomY + sideWallPx],
    [leftX, midY + sideWallPx],
  ]);

  const rightSidePoints = pointsToString([
    [cx, bottomY],
    [rightX, midY],
    [rightX, midY + sideWallPx],
    [cx, bottomY + sideWallPx],
  ]);

  return { topFacePoints, leftSidePoints, rightSidePoints };
};

export const SILHOUETTE_GENERATORS: Record<BrickSilhouette, SilhouetteGenerator> = {
  tower: towerSilhouette,
  heavy: heavySilhouette,
  shield: shieldSilhouette,
  module: moduleSilhouette,
};

export function getSilhouettePolygons(
  silhouette: BrickSilhouette,
  dimensions: SilhouetteDimensions,
): SilhouettePolygons {
  return SILHOUETTE_GENERATORS[silhouette](dimensions);
}
