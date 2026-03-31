import { useEffect, useMemo, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useRafCallback } from '../../shared/hooks/useRafCallback';
import { worldToScreen } from '../../shared/utils/isometric';
import {
  getBlockWorldPosition,
  EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
} from '../../shared/utils/position';
import { getBlockWorldAnchors } from '../../entities/block/blockGeometry';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import { CATEGORY_PORTS, isExternalResourceType } from '@cloudblocks/schema';
import type { ExternalActor, ResourceBlock, ContainerBlock } from '@cloudblocks/schema';
import { PORT_OUT_PX } from '../../shared/tokens/designTokens';
import { canConnect } from '../../entities/validation/connection';
import type { EndpointType } from '../../entities/validation/connection';

interface ConnectionPreviewProps {
  originX: number;
  originY: number;
}

interface Point {
  x: number;
  y: number;
}

const MAGNETIC_SNAP_THRESHOLD_PX = 40;

const EMPTY_ACTORS: ExternalActor[] = [];

export function ConnectionPreview({ originX, originY }: ConnectionPreviewProps) {
  const interactionState = useUIStore((s) => s.interactionState);
  const connectionSource = useUIStore((s) => s.connectionSource);
  const setMagneticSnapTarget = useUIStore((s) => s.setMagneticSnapTarget);
  const nodes = useArchitectureStore((s) => s.workspace.architecture.nodes);
  const externalActors = useArchitectureStore(
    (s) => s.workspace.architecture.externalActors ?? EMPTY_ACTORS,
  );
  const blocks = useMemo(
    () => nodes.filter((node): node is ResourceBlock => node.kind === 'resource'),
    [nodes],
  );
  const plates = useMemo(
    () => nodes.filter((node): node is ContainerBlock => node.kind === 'container'),
    [nodes],
  );

  const pathRef = useRef<SVGPathElement>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [snappedTarget, setSnappedTarget] = useState<Point | null>(null);

  const sourceEndpointType = useMemo((): EndpointType | null => {
    if (!connectionSource) return null;
    const sourceBlock = blocks.find((b) => b.id === connectionSource);
    if (sourceBlock) return sourceBlock.category;
    const sourceActor = externalActors.find((a) => a.id === connectionSource);
    if (sourceActor) return sourceActor.type;
    return null;
  }, [blocks, connectionSource, externalActors]);

  const validTargetAnchors = useMemo(() => {
    if (!connectionSource || !sourceEndpointType) return [];

    const targets: { blockId: string; screenPoint: Point }[] = [];
    for (const block of blocks) {
      if (block.id === connectionSource) continue;
      if (!canConnect(sourceEndpointType, block.category)) continue;

      const isRootExternal =
        block.parentId === null &&
        (Boolean(block.roles?.includes('external')) || isExternalResourceType(block.resourceType));

      const container = isRootExternal ? undefined : plates.find((p) => p.id === block.parentId);
      if (!isRootExternal && !container) continue;

      let worldPos: [number, number, number];
      if (isRootExternal) {
        worldPos = [block.position.x, block.position.y, block.position.z];
      } else {
        worldPos = getBlockWorldPosition(block, container!);
      }
      const cu = getBlockDimensions(block.category, block.provider, block.subtype);
      const anchors = getBlockWorldAnchors(worldPos, cu);
      const ports = CATEGORY_PORTS[block.category];

      const portWorld = anchors.port('inbound', 0, ports.inbound);
      const screen = worldToScreen(portWorld[0], portWorld[1], portWorld[2], originX, originY);
      targets.push({
        blockId: block.id,
        screenPoint: { x: screen.x - PORT_OUT_PX, y: screen.y },
      });
    }
    return targets;
  }, [blocks, connectionSource, originX, originY, plates, sourceEndpointType]);

  const updateCursor = useRafCallback((event: PointerEvent) => {
    const svg = pathRef.current?.ownerSVGElement;
    if (!svg) return;

    const ctm = svg.getScreenCTM?.();
    if (!ctm) return;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(ctm.inverse());

    const cursorPt = { x: local.x, y: local.y };

    let nearest: { blockId: string; screenPoint: Point; dist: number } | null = null;
    for (const target of validTargetAnchors) {
      const dx = cursorPt.x - target.screenPoint.x;
      const dy = cursorPt.y - target.screenPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= MAGNETIC_SNAP_THRESHOLD_PX && (!nearest || dist < nearest.dist)) {
        nearest = { ...target, dist };
      }
    }

    if (nearest) {
      setSnappedTarget(nearest.screenPoint);
      setMagneticSnapTarget(nearest.blockId);
    } else {
      setSnappedTarget(null);
      setMagneticSnapTarget(null);
    }

    setCursor(cursorPt);
  });

  const sourceScreen = useMemo(() => {
    if (interactionState !== 'connecting' || !connectionSource) {
      return null;
    }

    const sourceBlock = blocks.find((block) => block.id === connectionSource);
    if (sourceBlock) {
      const isRootExternal =
        sourceBlock.parentId === null &&
        (Boolean(sourceBlock.roles?.includes('external')) ||
          isExternalResourceType(sourceBlock.resourceType));

      if (isRootExternal) {
        // Root external block: compute from own world position using outbound port
        const worldPos: [number, number, number] = [
          sourceBlock.position.x,
          sourceBlock.position.y,
          sourceBlock.position.z,
        ];
        const cu = getBlockDimensions(
          sourceBlock.category,
          sourceBlock.provider,
          sourceBlock.subtype,
        );
        const anchors = getBlockWorldAnchors(worldPos, cu);
        const ports = CATEGORY_PORTS[sourceBlock.category];
        const portWorld = anchors.port('outbound', 0, ports.outbound);
        const screen = worldToScreen(portWorld[0], portWorld[1], portWorld[2], originX, originY);
        return { x: screen.x + PORT_OUT_PX, y: screen.y };
      }

      const parentContainer = plates.find((container) => container.id === sourceBlock.parentId);
      if (!parentContainer) {
        return null;
      }

      const worldPos = getBlockWorldPosition(sourceBlock, parentContainer);
      const cu = getBlockDimensions(
        sourceBlock.category,
        sourceBlock.provider,
        sourceBlock.subtype,
      );
      const anchors = getBlockWorldAnchors(worldPos, cu);
      const ports = CATEGORY_PORTS[sourceBlock.category];
      // Preview originates from outbound port index 0
      const portWorld = anchors.port('outbound', 0, ports.outbound);
      const screen = worldToScreen(portWorld[0], portWorld[1], portWorld[2], originX, originY);
      return { x: screen.x + PORT_OUT_PX, y: screen.y };
    }

    const sourceExternalActor = externalActors.find((actor) => actor.id === connectionSource);
    if (!sourceExternalActor) {
      return null;
    }

    const { x: worldX, y: worldY, z: worldZ } = sourceExternalActor.position;
    return worldToScreen(
      worldX,
      worldY + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
      worldZ,
      originX,
      originY,
    );
  }, [blocks, connectionSource, externalActors, interactionState, originX, originY, plates]);

  useEffect(() => {
    if (!sourceScreen) {
      setMagneticSnapTarget(null);
      return;
    }

    document.addEventListener('pointermove', updateCursor);
    return () => {
      document.removeEventListener('pointermove', updateCursor);
      setMagneticSnapTarget(null);
    };
  }, [sourceScreen, updateCursor, setMagneticSnapTarget]);

  if (!sourceScreen) {
    return null;
  }

  const target = snappedTarget ?? cursor ?? sourceScreen;
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
