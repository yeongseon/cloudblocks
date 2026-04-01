import { memo, useId } from 'react';
import type { LayerType, ProviderType } from '@cloudblocks/schema';
import {
  TILE_W,
  TILE_H,
  TILE_Z,
  BLOCK_MARGIN,
  BLOCK_PADDING,
  LABEL_FACE_MIN_PX,
  LABEL_FACE_SCALE,
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
    strokeWidth: 1.5,
    strokeOpacity: 0.45,
    labelFontSize: 22,
    emojiFontSize: 28,
    cornerRadius: 0,
  },
  edge: {
    strokeWidth: 1.2,
    strokeOpacity: 0.4,
    labelFontSize: 20,
    emojiFontSize: 26,
    cornerRadius: 0,
  },
  region: {
    strokeWidth: 1,
    strokeOpacity: 0.35,
    labelFontSize: 18,
    emojiFontSize: 24,
    cornerRadius: 0,
  },
  zone: {
    strokeWidth: 0.8,
    strokeOpacity: 0.3,
    labelFontSize: 16,
    emojiFontSize: 22,
    cornerRadius: 0,
  },
  subnet: {
    strokeWidth: 0.6,
    strokeOpacity: 0.25,
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
  occupiedCells?: Set<string>;
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
  occupiedCells,
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
  const markerClipSeed = useId();
  const clipId = `container-top-clip-${containerLayer}-${markerClipSeed.replace(/:/g, '')}`;

  const markers: React.ReactNode[] = [];
  for (let cellX = 0; cellX <= unitsX; cellX++) {
    for (let cellZ = 0; cellZ <= unitsY; cellZ++) {
      const mX = cx + ((cellX - cellZ) * TILE_W) / 2;
      const mY = topY + ((cellX + cellZ) * TILE_H) / 2;
      const cellKey = `${cellX}:${cellZ}`;
      const isOccupied = occupiedCells?.has(cellKey) ?? false;
      const halfW = 4;
      const halfH = 2;

      markers.push(
        <polygon
          key={cellKey}
          points={`${mX},${mY - halfH} ${mX + halfW},${mY} ${mX},${mY + halfH} ${mX - halfW},${mY}`}
          fill="none"
          stroke={
            isOccupied ? 'var(--anchor-marker-occupied-stroke)' : 'var(--anchor-marker-stroke)'
          }
          strokeWidth={0.5}
          opacity={isOccupied ? 0.4 : 1}
          data-anchor-state={isOccupied ? 'occupied' : 'empty'}
          data-anchor-cell={cellKey}
          pointerEvents="none"
        />,
      );
    }
  }

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
        stroke="rgba(203,213,225,0.08)"
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
        stroke="rgba(2,6,23,0.25)"
        strokeWidth={1}
        strokeLinejoin="round"
        transform={`translate(0, -0.5)`}
        pointerEvents="none"
        data-layer="inset-shadow"
      />
      <defs>
        <clipPath id={clipId}>
          <polygon points={topFacePoints} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} data-layer="anchor-markers" pointerEvents="none">
        {markers}
      </g>
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
          fontSize={Math.max(LABEL_FACE_MIN_PX, Math.round(sideWallPx * LABEL_FACE_SCALE))}
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
