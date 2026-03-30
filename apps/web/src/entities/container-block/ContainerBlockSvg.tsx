import { memo } from 'react';
import type { LayerType, ProviderType } from '@cloudblocks/schema';
import {
  TILE_W,
  TILE_H,
  TILE_Z,
  BLOCK_MARGIN,
  BLOCK_PADDING,
} from '../../shared/tokens/designTokens';
import { getContainerShortLabel } from '../../shared/utils/providerMapping';

// ─── Layer-Type Visual Config ──────────────────────────────
// Each container type gets distinct visual treatment while keeping
// the same isometric baseplate geometry.

interface LayerVisuals {
  strokeWidth: number; // border thickness (wider = more prominent)
  strokeOpacity: number; // border visibility
  labelFontSize: number; // label text size
  emojiFontSize: number; // icon display size (px)
  cornerRadius: number; // 0 = sharp diamond, unused today (future use)
}

type PlateLayerType = Exclude<LayerType, 'resource'>;

const LAYER_VISUALS: Record<PlateLayerType, LayerVisuals> = {
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

export interface ContainerBlockSvgProps {
  containerLayer: PlateLayerType;
  unitsX: number; // CU width
  unitsY: number; // CU depth
  worldHeight: number; // CH height (fractional OK for plates)
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
  label?: string;
  iconUrl?: string;
  provider?: ProviderType;
}

// ─── Component ─────────────────────────────────────────────

export const ContainerBlockSvg = memo(function PlateSvg({
  containerLayer,
  unitsX,
  unitsY,
  worldHeight,
  topFaceColor,
  topFaceStroke,
  leftSideColor,
  rightSideColor,
  label,
  iconUrl,
  provider,
}: ContainerBlockSvgProps) {
  // CU-based pixel conversion: 1 CU = 1 unit, rendered via TILE_W/H/Z
  const screenWidth = ((unitsX + unitsY) * TILE_W) / 2;
  const diamondHeight = ((unitsX + unitsY) * TILE_H) / 2;
  const sideWallPx = Math.round(worldHeight * TILE_Z);
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const cx = screenWidth / 2;
  const topY = BLOCK_PADDING;
  const midY = diamondHeight / 2 + BLOCK_PADDING;
  const bottomY = diamondHeight + BLOCK_PADDING;
  const leftX = BLOCK_MARGIN;
  const rightX = screenWidth - BLOCK_MARGIN;

  // Layer-specific visual config
  const visuals = LAYER_VISUALS[containerLayer];

  // Isometric face polygons
  const topFacePoints = `${cx},${topY} ${rightX},${midY} ${cx},${bottomY} ${leftX},${midY}`;
  const leftSidePoints = `${leftX},${midY} ${cx},${bottomY} ${cx},${bottomY + sideWallPx} ${leftX},${midY + sideWallPx}`;
  const rightSidePoints = `${cx},${bottomY} ${rightX},${midY} ${rightX},${midY + sideWallPx} ${cx},${bottomY + sideWallPx}`;

  // Label positioning on side walls
  const rightLabelX = (cx + rightX) / 2;
  const wallCenterY = (midY + bottomY + sideWallPx) / 2;
  const leftLabelX = (cx + leftX) / 2;

  const shortLabel = getContainerShortLabel(containerLayer, provider ?? 'azure');

  return (
    <svg
      viewBox={`0 0 ${screenWidth} ${svgHeight}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-container-type={containerLayer}
    >
      <polygon
        points={topFacePoints}
        fill={topFaceColor}
        stroke={topFaceStroke}
        strokeWidth={visuals.strokeWidth}
        strokeOpacity={visuals.strokeOpacity}
      />

      {/* Fake inset — inner highlight ring */}
      <polygon
        points={topFacePoints}
        fill="none"
        stroke="rgba(203,213,225,0.16)"
        strokeWidth={1}
        strokeLinejoin="round"
        transform={`translate(0, 0.5)`}
        pointerEvents="none"
        data-layer="inset-highlight"
      />
      {/* Fake inset — inner shadow ring */}
      <polygon
        points={topFacePoints}
        fill="none"
        stroke="rgba(2,6,23,0.45)"
        strokeWidth={1}
        strokeLinejoin="round"
        transform={`translate(0, -0.5)`}
        pointerEvents="none"
        data-layer="inset-shadow"
      />
      <polygon points={leftSidePoints} fill={leftSideColor} />
      <polygon points={rightSidePoints} fill={rightSideColor} />

      {/* ─── Left wall: provider icon ─── */}
      {iconUrl ? (
        <image
          href={iconUrl}
          width={visuals.emojiFontSize}
          height={visuals.emojiFontSize}
          x={-visuals.emojiFontSize / 2}
          y={-visuals.emojiFontSize / 2}
          transform={`matrix(0.8975,0.4410,0,1,${leftLabelX},${wallCenterY})`}
        />
      ) : null}

      {/* ─── Right wall: short label ─── */}
      {shortLabel && (
        <text
          x={0}
          y={0}
          transform={`matrix(0.8975,-0.4410,0,1,${rightLabelX},${wallCenterY})`}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={Math.max(10, Math.round(sideWallPx * 0.32))}
          fontWeight="700"
          fill="rgba(255,255,255,0.85)"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ pointerEvents: 'none' }}
          data-testid="container-face-label"
        >
          {label || shortLabel}
        </text>
      )}
    </svg>
  );
});
