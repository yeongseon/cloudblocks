import { memo, useId, useMemo } from 'react';
import type { BlockCategory, ProviderType } from '../../shared/types/index';
import { STUD_LAYOUTS, BLOCK_SHORT_NAMES, BLOCK_ICONS } from '../../shared/types/index';
import { getBlockVisualProfile } from '../../shared/types/visualProfile';
import { StudDefs, StudGrid } from '../../shared/components/IsometricStud';
import {
  BLOCK_MARGIN,
  BLOCK_PADDING,
  EDGE_HIGHLIGHT_COLOR,
  EDGE_HIGHLIGHT_OPACITY,
  EDGE_HIGHLIGHT_STROKE_WIDTH,
  TILE_H,
  TILE_W,
  TILE_Z,
  TOP_FACE_STROKE_OPACITY,
  TOP_FACE_STROKE_WIDTH,
  getBlockWorldHeight,
} from '../../shared/tokens/designTokens';
import { getBlockFaceColors, getBlockStudColors } from './blockFaceColors';
import { getSilhouettePolygons } from './silhouettes';

interface BlockSvgProps {
  category: BlockCategory;
  provider?: ProviderType;
}

type BlockFaceResolver = (category: BlockCategory, provider?: ProviderType) => ReturnType<typeof getBlockFaceColors>;
type BlockStudResolver = (category: BlockCategory, provider?: ProviderType) => ReturnType<typeof getBlockStudColors>;

const resolveBlockFaceColors = getBlockFaceColors as unknown as BlockFaceResolver;
const resolveBlockStudColors = getBlockStudColors as unknown as BlockStudResolver;

export const BlockSvg = memo(function BlockSvg({ category, provider }: BlockSvgProps) {
  const [studsX, studsY] = STUD_LAYOUTS[category];
  const faceColors = resolveBlockFaceColors(category, provider);
  const studColors = resolveBlockStudColors(category, provider);
  const shortName = BLOCK_SHORT_NAMES[category];
  const icon = BLOCK_ICONS[category];
  const visualProfile = getBlockVisualProfile(category);

  const screenWidth = (studsX + studsY) * TILE_W / 2;
  const diamondHeight = (studsX + studsY) * TILE_H / 2;
  const sideWallPx = Math.round(getBlockWorldHeight(category) * TILE_Z);
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const cx = screenWidth / 2;
  const topY = BLOCK_PADDING;
  const midY = diamondHeight / 2 + BLOCK_PADDING;
  const bottomY = diamondHeight + BLOCK_PADDING;
  const leftX = BLOCK_MARGIN;
  const rightX = screenWidth - BLOCK_MARGIN;

  const { topFacePoints, leftSidePoints, rightSidePoints } = getSilhouettePolygons(visualProfile.silhouette, {
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
  });

  const studs = useMemo(() => {
    const positions: Array<{ x: number; y: number; key: string }> = [];
    const halfW = screenWidth / 2 - BLOCK_MARGIN;
    const halfH = diamondHeight / 2;

    const stepXx = halfW / studsX;
    const stepXy = halfH / studsX;
    const stepZx = -halfW / studsY;
    const stepZy = halfH / studsY;

    const startX = cx + stepXx * 0.5 + stepZx * 0.5;
    const startY = BLOCK_PADDING + stepXy * 0.5 + stepZy * 0.5;

    for (let gz = 0; gz < studsY; gz += 1) {
      for (let gx = 0; gx < studsX; gx += 1) {
        const x = startX + gx * stepXx + gz * stepZx;
        const y = startY + gx * stepXy + gz * stepZy;
        positions.push({
          key: `${gx}-${gz}`,
          x,
          y,
        });
      }
    }

    return positions;
  }, [cx, diamondHeight, screenWidth, studsX, studsY]);

  const studId = useId().replace(/:/g, '_');

  const leftLabelX = (leftX + cx) / 2;
  const rightLabelX = (cx + rightX) / 2;
  const wallCenterY = (midY + bottomY + sideWallPx) / 2;

  const minDim = Math.min(studsX, studsY);
  const labelFontSize = minDim <= 1 ? 8 : minDim <= 2 ? 10 : 13;
  const iconFontSize = minDim <= 1 ? 10 : minDim <= 2 ? 14 : 18;

  return (
    <svg
      viewBox={`0 0 ${screenWidth} ${svgHeight}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <StudDefs studId={studId} studColors={studColors} />

      <polygon points={topFacePoints} fill={faceColors.topFaceColor} stroke={faceColors.topFaceStroke} strokeWidth={TOP_FACE_STROKE_WIDTH} strokeOpacity={TOP_FACE_STROKE_OPACITY} />
      <polygon points={leftSidePoints} fill={faceColors.leftSideColor} />
      <polygon points={rightSidePoints} fill={faceColors.rightSideColor} />
      <line x1={leftX} y1={midY} x2={cx} y2={topY} stroke={EDGE_HIGHLIGHT_COLOR} strokeWidth={EDGE_HIGHLIGHT_STROKE_WIDTH} strokeOpacity={EDGE_HIGHLIGHT_OPACITY} />

      <StudGrid studId={studId} studs={studs} />

      <text
        transform={`matrix(0.8975,0.4410,0,1,${leftLabelX},${wallCenterY})`}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize={labelFontSize}
        fontWeight="600"
        fill="#ffffff"
        fillOpacity="0.9"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {shortName}
      </text>

      <text
        transform={`matrix(0.8975,-0.4410,0,1,${rightLabelX},${wallCenterY})`}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize={iconFontSize}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {icon}
      </text>
    </svg>
  );
});
