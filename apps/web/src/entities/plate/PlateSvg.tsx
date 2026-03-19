import { memo, useId, useMemo } from 'react';
import type {
  PlateType,
  StudColorSpec,
} from '../../shared/types/index';
import { StudDefs, StudGrid } from '../../shared/components/IsometricStud';
import { TILE_W, TILE_H, TILE_Z, BLOCK_MARGIN, BLOCK_PADDING } from '../../shared/tokens/designTokens';

// ─── Layer-Type Visual Config ──────────────────────────────
// Each plate type gets distinct visual treatment while keeping
// the same isometric baseplate geometry.

interface LayerVisuals {
  strokeWidth: number;       // border thickness (wider = more prominent)
  strokeOpacity: number;     // border visibility
  labelFontSize: number;     // label text size
  emojiFontSize: number;     // emoji text size
  cornerRadius: number;      // 0 = sharp diamond, unused today (future use)
}

const LAYER_VISUALS: Record<PlateType, LayerVisuals> = {
  global: {
    strokeWidth: 3,
    strokeOpacity: 0.9,
    labelFontSize: 22,
    emojiFontSize: 28,
    cornerRadius: 0,
  },
  edge: {
    strokeWidth: 2.5,
    strokeOpacity: 0.8,
    labelFontSize: 20,
    emojiFontSize: 26,
    cornerRadius: 0,
  },
  region: {
    strokeWidth: 2,
    strokeOpacity: 0.7,
    labelFontSize: 18,
    emojiFontSize: 24,
    cornerRadius: 0,
  },
  zone: {
    strokeWidth: 1.5,
    strokeOpacity: 0.65,
    labelFontSize: 16,
    emojiFontSize: 22,
    cornerRadius: 0,
  },
  subnet: {
    strokeWidth: 1,
    strokeOpacity: 0.6,
    labelFontSize: 18,
    emojiFontSize: 24,
    cornerRadius: 0,
  },
};

// ─── Props ─────────────────────────────────────────────────

export interface PlateSvgProps {
  plateType: PlateType;
  studsX: number;            // CU width (1 stud = 1 CU)
  studsY: number;            // CU depth (1 stud = 1 CU)
  worldHeight: number;       // CH height (fractional OK for plates)
  studColors: StudColorSpec;
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
  label?: string;
  emoji?: string;
}

// ─── Component ─────────────────────────────────────────────

export const PlateSvg = memo(function PlateSvg({
  plateType,
  studsX,
  studsY,
  worldHeight,
  studColors,
  topFaceColor,
  topFaceStroke,
  leftSideColor,
  rightSideColor,
  label,
  emoji,
}: PlateSvgProps) {
  // CU-based pixel conversion: 1 CU = 1 stud, rendered via TILE_W/H/Z
  const screenWidth = (studsX + studsY) * TILE_W / 2;
  const diamondHeight = (studsX + studsY) * TILE_H / 2;
  const sideWallPx = Math.round(worldHeight * TILE_Z);
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const cx = screenWidth / 2;
  const topY = BLOCK_PADDING;
  const midY = diamondHeight / 2 + BLOCK_PADDING;
  const bottomY = diamondHeight + BLOCK_PADDING;
  const leftX = BLOCK_MARGIN;
  const rightX = screenWidth - BLOCK_MARGIN;

  // Layer-specific visual config
  const visuals = LAYER_VISUALS[plateType];

  // Isometric face polygons
  const topFacePoints = `${cx},${topY} ${rightX},${midY} ${cx},${bottomY} ${leftX},${midY}`;
  const leftSidePoints = `${leftX},${midY} ${cx},${bottomY} ${cx},${bottomY + sideWallPx} ${leftX},${midY + sideWallPx}`;
  const rightSidePoints = `${cx},${bottomY} ${rightX},${midY} ${rightX},${midY + sideWallPx} ${cx},${bottomY + sideWallPx}`;

  // Stud grid positions (1 stud per CU)
  const studs = useMemo(() => {
    const positions: Array<{ x: number; y: number; key: string }> = [];
    const halfW = screenWidth / 2 - BLOCK_MARGIN;
    const halfH = diamondHeight / 2;

    const stepXx = halfW / studsX;
    const stepXy = halfH / studsX;
    const stepZx = -halfW / studsY;
    const stepZy = halfH / studsY;

    const startX = cx + stepXx * 0.5 + stepZx * 0.5;
    const startY = topY + stepXy * 0.5 + stepZy * 0.5;

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
  }, [cx, diamondHeight, screenWidth, studsX, studsY, topY]);

  const studId = useId().replace(/:/g, '_');

  // Label positioning on side walls
  const leftLabelX = (leftX + cx) / 2;
  const rightLabelX = (cx + rightX) / 2;
  const wallCenterY = (midY + bottomY + sideWallPx) / 2;

  return (
    <svg
      viewBox={`0 0 ${screenWidth} ${svgHeight}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-plate-type={plateType}
    >
      <StudDefs studId={studId} studColors={studColors} />

      <polygon
        points={topFacePoints}
        fill={topFaceColor}
        stroke={topFaceStroke}
        strokeWidth={visuals.strokeWidth}
        strokeOpacity={visuals.strokeOpacity}
      />
      <polygon points={leftSidePoints} fill={leftSideColor} />
      <polygon points={rightSidePoints} fill={rightSideColor} />

      <StudGrid studId={studId} studs={studs} />

      {label ? (
        <text
          transform={`matrix(0.8975,0.4410,0,1,${leftLabelX},${wallCenterY})`}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={visuals.labelFontSize}
          fontWeight="700"
          fill="#ffffff"
          fillOpacity="0.9"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {label}
        </text>
      ) : null}

      {emoji ? (
        <text
          transform={`matrix(0.8975,-0.4410,0,1,${rightLabelX},${wallCenterY})`}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={visuals.emojiFontSize}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {emoji}
        </text>
      ) : null}
    </svg>
  );
});
