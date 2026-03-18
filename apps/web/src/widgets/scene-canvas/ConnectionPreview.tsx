import { useEffect, useMemo, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { worldToScreen } from '../../shared/utils/isometric';

interface ConnectionPreviewProps {
  originX: number;
  originY: number;
}

interface Point {
  x: number;
  y: number;
}

export function ConnectionPreview({ originX, originY }: ConnectionPreviewProps) {
  const interactionState = useUIStore((s) => s.interactionState);
  const connectionSource = useUIStore((s) => s.connectionSource);
  const blocks = useArchitectureStore((s) => s.workspace.architecture.blocks);
  const plates = useArchitectureStore((s) => s.workspace.architecture.plates);

  const pathRef = useRef<SVGPathElement>(null);
  const [cursor, setCursor] = useState<Point | null>(null);

  const sourceScreen = useMemo(() => {
    if (interactionState !== 'connecting' || !connectionSource) {
      return null;
    }

    const sourceBlock = blocks.find((block) => block.id === connectionSource);
    if (!sourceBlock) {
      return null;
    }

    const parentPlate = plates.find((plate) => plate.id === sourceBlock.placementId);
    if (!parentPlate) {
      return null;
    }

    const worldX = parentPlate.position.x + sourceBlock.position.x;
    const worldY = parentPlate.position.y + parentPlate.size.height;
    const worldZ = parentPlate.position.z + sourceBlock.position.z;
    return worldToScreen(worldX, worldY, worldZ, originX, originY);
  }, [blocks, connectionSource, interactionState, originX, originY, plates]);

  useEffect(() => {
    if (!sourceScreen) {
      return;
    }

    const svg = pathRef.current?.ownerSVGElement;
    if (!svg) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const ctm = svg.getScreenCTM?.();
      if (!ctm) {
        return;
      }

      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(ctm.inverse());
      setCursor({ x: local.x, y: local.y });
    };

    document.addEventListener('pointermove', handlePointerMove);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
    };
  }, [sourceScreen]);

  if (!sourceScreen) {
    return null;
  }

  const target = cursor ?? sourceScreen;
  const midX = (sourceScreen.x + target.x) / 2;
  const midY = Math.min(sourceScreen.y, target.y) - 40;
  const pathD = `M ${sourceScreen.x} ${sourceScreen.y} Q ${midX} ${midY} ${target.x} ${target.y}`;

  return (
    <path
      ref={pathRef}
      d={pathD}
      stroke="#64748b"
      strokeWidth={2}
      strokeDasharray="8 4"
      opacity="0.6"
      fill="none"
      pointerEvents="none"
      data-testid="connection-preview-path"
    />
  );
}
