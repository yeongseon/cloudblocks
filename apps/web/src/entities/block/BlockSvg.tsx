import { memo, useId, useMemo } from 'react';
import type { BlockCategory, ProviderType } from '../../shared/types/index';
import { BLOCK_SHORT_NAMES, BLOCK_ICONS } from '../../shared/types/index';
import { getBlockDimensions, getBlockVisualProfile } from '../../shared/types/visualProfile';
import { StudDefs, StudGrid } from '../../shared/components/IsometricStud';
import {
  BLOCK_MARGIN,
  BLOCK_PADDING,
  EDGE_HIGHLIGHT_COLOR,
  EDGE_HIGHLIGHT_OPACITY,
  EDGE_HIGHLIGHT_STROKE_WIDTH,
  TOP_FACE_STROKE_OPACITY,
  TOP_FACE_STROKE_WIDTH,
} from '../../shared/tokens/designTokens';
import { getBlockFaceColors, getBlockStudColors } from './blockFaceColors';
import { cuToSilhouetteDimensions, getSilhouetteFromCU } from './silhouettes';

interface BlockSvgProps {
  category: BlockCategory;
  provider?: ProviderType;
  subtype?: string;
}

export const BlockSvg = memo(function BlockSvg({ category, provider, subtype }: BlockSvgProps) {
  // ─── v2.0: CU-based dimension resolution ───────────────────
  const cu = getBlockDimensions(category, provider, subtype);
  const dims = cuToSilhouetteDimensions(cu);
  const profile = getBlockVisualProfile(category);

  const { screenWidth, diamondHeight, sideWallPx } = dims;
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const faceColors = getBlockFaceColors(category, provider ?? 'azure', subtype);
  const studColors = getBlockStudColors(category, provider ?? 'azure', subtype);
  const shortName = BLOCK_SHORT_NAMES[category];
  const icon = BLOCK_ICONS[category];

  // ─── v2.0: silhouette from CU dimensions ───────────────────
  const { topFacePoints, leftSidePoints, rightSidePoints } = getSilhouetteFromCU(
    profile.silhouette,
    cu,
  );

  // ─── v2.0: stud grid = width × depth (1 stud per CU cell) ──
  const studsX = cu.width;
  const studsY = cu.depth;

  const studs = useMemo(() => {
    const positions: Array<{ x: number; y: number; key: string }> = [];
    const halfW = screenWidth / 2 - BLOCK_MARGIN;
    const halfH = diamondHeight / 2;

    const stepXx = halfW / studsX;
    const stepXy = halfH / studsX;
    const stepZx = -halfW / studsY;
    const stepZy = halfH / studsY;

    const startX = dims.cx + stepXx * 0.5 + stepZx * 0.5;
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
  }, [dims.cx, diamondHeight, screenWidth, studsX, studsY]);

  const studId = useId().replace(/:/g, '_');

  const leftLabelX = (dims.leftX + dims.cx) / 2;
  const rightLabelX = (dims.cx + dims.rightX) / 2;
  const wallCenterY = (dims.midY + dims.bottomY + sideWallPx) / 2;

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
      <line x1={dims.leftX} y1={dims.midY} x2={dims.cx} y2={dims.topY} stroke={EDGE_HIGHLIGHT_COLOR} strokeWidth={EDGE_HIGHLIGHT_STROKE_WIDTH} strokeOpacity={EDGE_HIGHLIGHT_OPACITY} />

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
