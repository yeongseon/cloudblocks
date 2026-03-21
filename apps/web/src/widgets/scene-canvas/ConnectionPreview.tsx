import { useEffect, useMemo, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useRafCallback } from '../../shared/hooks/useRafCallback';
import { worldToScreen } from '../../shared/utils/isometric';
import { EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET } from '../../shared/utils/position';

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
  const nodes = useArchitectureStore((s) => s.workspace.architecture.nodes);
  const externalActors = useArchitectureStore((s) => s.workspace.architecture.externalActors);
  const blocks = useMemo(() => nodes.filter((node) => node.kind === 'resource'), [nodes]);
  const plates = useMemo(() => nodes.filter((node) => node.kind === 'container'), [nodes]);

  const pathRef = useRef<SVGPathElement>(null);
  const [cursor, setCursor] = useState<Point | null>(null);

  const updateCursor = useRafCallback((event: PointerEvent) => {
    const svg = pathRef.current?.ownerSVGElement;
    if (!svg) {
      return;
    }

    const ctm = svg.getScreenCTM?.();
    if (!ctm) {
      return;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(ctm.inverse());
    setCursor({ x: local.x, y: local.y });
  });

  const sourceScreen = useMemo(() => {
    if (interactionState !== 'connecting' || !connectionSource) {
      return null;
    }

    const sourceBlock = blocks.find((block) => block.id === connectionSource);
    if (sourceBlock) {
      const parentPlate = plates.find((plate) => plate.id === sourceBlock.parentId);
      if (!parentPlate) {
        return null;
      }

      const worldX = parentPlate.position.x + sourceBlock.position.x;
      const worldY = parentPlate.position.y + parentPlate.size.height;
      const worldZ = parentPlate.position.z + sourceBlock.position.z;
      return worldToScreen(worldX, worldY, worldZ, originX, originY);
    }

    const sourceExternalActor = externalActors.find((actor) => actor.id === connectionSource);
    if (!sourceExternalActor) {
      return null;
    }

    const { x: worldX, y: worldY, z: worldZ } = sourceExternalActor.position;
    return worldToScreen(worldX, worldY + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, worldZ, originX, originY);
  }, [blocks, connectionSource, externalActors, interactionState, originX, originY, plates]);

  useEffect(() => {
    if (!sourceScreen) {
      return;
    }

    document.addEventListener('pointermove', updateCursor);
    return () => {
      document.removeEventListener('pointermove', updateCursor);
    };
  }, [sourceScreen, updateCursor]);

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
