import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { useUIStore } from '../../entities/store/uiStore';
import { useRafCallback } from '../../shared/hooks/useRafCallback';
import { getBlockDimensions, getBlockVisualProfile } from '../../shared/types/visualProfile';
import { BLOCK_FRIENDLY_NAMES } from '../../shared/types/index';
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
} from '../../shared/tokens/designTokens';
import { getBlockFaceColors } from '../../entities/block/blockFaceColors';
import { getSnappedPlacement } from './utils/placementUtils';

interface DragGhostProps {
  containerRef: RefObject<HTMLDivElement | null>;
  originX: number;
  originY: number;
  panX: number;
  panY: number;
  zoom: number;
}

export function DragGhost({ containerRef, originX, originY, panX, panY, zoom }: DragGhostProps) {
  const interactionState = useUIStore((s) => s.interactionState);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const draggedResourceName = useUIStore((s) => s.draggedResourceName);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const activeCategory = draggedBlockCategory ?? 'compute';

  const [unitsX, unitsY] = getBlockVisualProfile(activeCategory).footprint;
  const faceColors = getBlockFaceColors(activeCategory, activeProvider);

  const screenWidth = ((unitsX + unitsY) * TILE_W) / 2;
  const diamondHeight = ((unitsX + unitsY) * TILE_H) / 2;
  const sideWallPx = getBlockDimensions(activeCategory).height * TILE_Z;
  const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;

  const cx = screenWidth / 2;
  const topY = BLOCK_PADDING;
  const midY = diamondHeight / 2 + BLOCK_PADDING;
  const bottomY = diamondHeight + BLOCK_PADDING;
  const leftX = BLOCK_MARGIN;
  const rightX = screenWidth - BLOCK_MARGIN;

  const topFacePoints = `${cx},${topY} ${rightX},${midY} ${cx},${bottomY} ${leftX},${midY}`;
  const leftSidePoints = `${leftX},${midY} ${cx},${bottomY} ${cx},${bottomY + sideWallPx} ${leftX},${midY + sideWallPx}`;
  const rightSidePoints = `${cx},${bottomY} ${rightX},${midY} ${rightX},${midY + sideWallPx} ${cx},${bottomY + sideWallPx}`;
  const providerName =
    activeProvider === 'azure' ? 'Azure' : activeProvider === 'aws' ? 'AWS' : 'GCP';
  const dragIdentityLabel = `${providerName} / ${draggedResourceName ?? BLOCK_FRIENDLY_NAMES[activeCategory]}`;

  const updatePointerPosition = useRafCallback((e: PointerEvent) => {
    const viewport = containerRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const placement = getSnappedPlacement(
      e.clientX,
      e.clientY,
      { left: rect.left, top: rect.top },
      { x: panX, y: panY },
      zoom,
      { x: originX, y: originY },
    );
    setPointerPosition(placement.screenPoint);
  });

  useEffect(() => {
    if (interactionState !== 'placing' || !draggedBlockCategory) {
      return;
    }

    document.addEventListener('pointermove', updatePointerPosition);

    return () => {
      document.removeEventListener('pointermove', updatePointerPosition);
    };
  }, [draggedBlockCategory, interactionState, updatePointerPosition]);

  if (interactionState !== 'placing' || !draggedBlockCategory || !pointerPosition) {
    return null;
  }

  return (
    <g
      className="drag-ghost"
      transform={`translate(${pointerPosition.x - screenWidth / 2}, ${pointerPosition.y - svgHeight / 2})`}
      opacity={0.5}
      pointerEvents="none"
    >
      <polygon
        points={topFacePoints}
        fill={faceColors.topFaceColor}
        stroke={faceColors.topFaceStroke}
        strokeWidth={TOP_FACE_STROKE_WIDTH}
        strokeOpacity={TOP_FACE_STROKE_OPACITY}
      />
      <polygon points={leftSidePoints} fill={faceColors.leftSideColor} />
      <polygon points={rightSidePoints} fill={faceColors.rightSideColor} />
      <line
        x1={leftX}
        y1={midY}
        x2={cx}
        y2={topY}
        stroke={EDGE_HIGHLIGHT_COLOR}
        strokeWidth={EDGE_HIGHLIGHT_STROKE_WIDTH}
        strokeOpacity={EDGE_HIGHLIGHT_OPACITY}
      />
      <text x={cx} y={svgHeight + 12} textAnchor="middle" fontSize={10} fill="#D1D5DB">
        {dragIdentityLabel}
      </text>
    </g>
  );
}
