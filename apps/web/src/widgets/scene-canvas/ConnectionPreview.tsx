import { useEffect, useMemo, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useRafCallback } from '../../shared/hooks/useRafCallback';
import { worldToScreen } from '../../shared/utils/isometric';
import { getBlockWorldPosition, EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET } from '../../shared/utils/position';
import { getBlockWorldAnchors } from '../../entities/block/blockGeometry';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import { CATEGORY_PORTS } from '@cloudblocks/schema';
import { PORT_OUT_PX } from '../../shared/tokens/designTokens';

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
  const externalActors = useArchitectureStore((s) => s.workspace.architecture.externalActors ?? []);
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

      const worldPos = getBlockWorldPosition(sourceBlock, parentPlate);
      const cu = getBlockDimensions(sourceBlock.category, sourceBlock.provider, sourceBlock.subtype);
      const anchors = getBlockWorldAnchors(worldPos, cu);
      const ports = CATEGORY_PORTS[sourceBlock.category];
      // Preview originates from outbound stub index 0
      const stubWorld = anchors.stub('outbound', 0, ports.outbound);
      const screen = worldToScreen(stubWorld[0], stubWorld[1], stubWorld[2], originX, originY);
      // Apply PORT_OUT_PX offset for outbound (right side)
      return { x: screen.x + PORT_OUT_PX, y: screen.y };
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
