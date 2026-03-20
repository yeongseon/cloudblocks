import { useEffect, useId, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { useUIStore } from '../../entities/store/uiStore';
import { StudDefs, StudGrid } from '../../shared/components/IsometricStud';
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
import { screenToWorld, snapToGrid, worldToScreen } from '../../shared/utils/isometric';
import { getBlockFaceColors, getBlockStudColors } from '../../entities/block/blockFaceColors';

interface DragGhostProps {
  containerRef: RefObject<HTMLDivElement | null>;
  originX: number;
  originY: number;
  panX: number;
  panY: number;
  zoom: number;
}

export function DragGhost({
  containerRef,
  originX,
  originY,
  panX,
  panY,
  zoom,
}: DragGhostProps) {
  const interactionState = useUIStore((s) => s.interactionState);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const draggedResourceName = useUIStore((s) => s.draggedResourceName);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const activeCategory = draggedBlockCategory ?? 'compute';

  const [studsX, studsY] = getBlockVisualProfile(activeCategory).footprint;
  const faceColors = getBlockFaceColors(activeCategory);
  const studColors = getBlockStudColors(activeCategory);

  const screenWidth = (studsX + studsY) * TILE_W / 2;
  const diamondHeight = (studsX + studsY) * TILE_H / 2;
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
  const providerName = activeProvider === 'azure' ? 'Azure' : activeProvider === 'aws' ? 'AWS' : 'GCP';
  const dragIdentityLabel = `${providerName} / ${draggedResourceName ?? BLOCK_FRIENDLY_NAMES[activeCategory]}`;

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
        positions.push({
          key: `${gx}-${gz}`,
          x: startX + gx * stepXx + gz * stepZx,
          y: startY + gx * stepXy + gz * stepZy,
        });
      }
    }

    return positions;
  }, [cx, diamondHeight, screenWidth, studsX, studsY]);

  const studId = useId().replace(/:/g, '_');

  const updatePointerPosition = useRafCallback((e: PointerEvent) => {
    const viewport = containerRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const localX = (e.clientX - rect.left - panX) / zoom;
    const localY = (e.clientY - rect.top - panY) / zoom;
    setPointerPosition({ x: localX, y: localY });
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

  const world = screenToWorld(pointerPosition.x, pointerPosition.y, 0, originX, originY);
  const snapped = snapToGrid(world.worldX, world.worldZ);
  const snappedScreen = worldToScreen(snapped.x, 0, snapped.z, originX, originY);

  return (
    <g
      className="drag-ghost"
      transform={`translate(${snappedScreen.x - screenWidth / 2}, ${snappedScreen.y - svgHeight / 2})`}
      opacity={0.5}
      pointerEvents="none"
    >
      <StudDefs studId={studId} studColors={studColors} />
      <polygon points={topFacePoints} fill={faceColors.topFaceColor} stroke={faceColors.topFaceStroke} strokeWidth={TOP_FACE_STROKE_WIDTH} strokeOpacity={TOP_FACE_STROKE_OPACITY} />
      <polygon points={leftSidePoints} fill={faceColors.leftSideColor} />
      <polygon points={rightSidePoints} fill={faceColors.rightSideColor} />
      <line x1={leftX} y1={midY} x2={cx} y2={topY} stroke={EDGE_HIGHLIGHT_COLOR} strokeWidth={EDGE_HIGHLIGHT_STROKE_WIDTH} strokeOpacity={EDGE_HIGHLIGHT_OPACITY} />
      <StudGrid studId={studId} studs={studs} />
      <text x={cx} y={svgHeight + 12} textAnchor="middle" fontSize={10} fill="#D1D5DB">
        {dragIdentityLabel}
      </text>
    </g>
  );
}
