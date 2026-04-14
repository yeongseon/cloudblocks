import { useCallback, useMemo, useRef } from 'react';
import { parseEndpointId, type ContainerBlock, type ResourceBlock } from '@cloudblocks/schema';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { worldSizeToScreen, worldToScreen } from '../../shared/utils/isometric';
import { computeContentBounds } from './utils/viewportUtils';
import './MiniMap.css';

const MINI_MAP_WIDTH = 200;
const MINI_MAP_HEIGHT = 140;
const BLOCK_HALF_WIDTH = 8;
const BLOCK_HALF_HEIGHT = 4;
const DEFAULT_VIEWBOX = { x: -400, y: -300, width: 800, height: 600 };

interface MiniMapProps {
  pan: { x: number; y: number };
  zoom: number;
  origin: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
  onRequestCenter: (panX: number, panY: number) => void;
}

interface SvgPoint {
  x: number;
  y: number;
}

function resolveResourceWorldPosition(
  block: ResourceBlock,
  containerById: ReadonlyMap<string, ContainerBlock>,
) {
  if (!block.parentId) {
    return block.position;
  }

  const parent = containerById.get(block.parentId);
  if (!parent) {
    return block.position;
  }

  return {
    x: parent.position.x + block.position.x,
    y: parent.position.y + (parent.frame?.height ?? 0),
    z: parent.position.z + block.position.z,
  };
}

function toPoints(points: Array<{ x: number; y: number }>): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): SvgPoint {
  const ctm = svg.getScreenCTM?.();
  if (ctm && typeof svg.createSVGPoint === 'function') {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const xRatio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  const yRatio = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
  return {
    x: viewBox.x + xRatio * viewBox.width,
    y: viewBox.y + yRatio * viewBox.height,
  };
}

export function MiniMap({
  pan,
  zoom,
  origin,
  containerWidth,
  containerHeight,
  onRequestCenter,
}: MiniMapProps) {
  const architecture = useArchitectureStore((state) => state.workspace.architecture);
  const svgRef = useRef<SVGSVGElement>(null);

  const staticGeometry = useMemo(() => {
    const containers = architecture.nodes.filter(
      (node): node is ContainerBlock => node.kind === 'container',
    );
    const resources = architecture.nodes.filter(
      (node): node is ResourceBlock => node.kind === 'resource',
    );
    const containerById = new Map(containers.map((container) => [container.id, container]));
    const screenPointByNodeId = new Map<string, SvgPoint>();

    const containerShapes = containers
      .filter((container) => Boolean(container.frame))
      .map((container) => {
        const centerPoint = worldToScreen(
          container.position.x,
          container.position.y,
          container.position.z,
          0,
          0,
        );
        const frame = container.frame;
        if (!frame) {
          return null;
        }
        const { screenWidth, screenHeight } = worldSizeToScreen(
          frame.width,
          frame.height,
          frame.depth,
        );
        const diamondHalfHeight = screenWidth / 4;
        const topCenterY = centerPoint.y - (screenHeight - diamondHalfHeight);
        const points = toPoints([
          { x: centerPoint.x, y: topCenterY - diamondHalfHeight },
          { x: centerPoint.x + screenWidth / 2, y: topCenterY },
          { x: centerPoint.x, y: topCenterY + diamondHalfHeight },
          { x: centerPoint.x - screenWidth / 2, y: topCenterY },
        ]);
        screenPointByNodeId.set(container.id, centerPoint);
        return { id: container.id, points };
      })
      .filter((shape): shape is { id: string; points: string } => shape !== null);

    const blockShapes = resources.map((block) => {
      const worldPosition = resolveResourceWorldPosition(block, containerById);
      const screenPoint = worldToScreen(worldPosition.x, worldPosition.y, worldPosition.z, 0, 0);
      screenPointByNodeId.set(block.id, screenPoint);
      return {
        id: block.id,
        points: toPoints([
          { x: screenPoint.x, y: screenPoint.y - BLOCK_HALF_HEIGHT },
          { x: screenPoint.x + BLOCK_HALF_WIDTH, y: screenPoint.y },
          { x: screenPoint.x, y: screenPoint.y + BLOCK_HALF_HEIGHT },
          { x: screenPoint.x - BLOCK_HALF_WIDTH, y: screenPoint.y },
        ]),
      };
    });

    const connectionLines = architecture.connections
      .map((connection) => {
        const source = parseEndpointId(connection.from);
        const target = parseEndpointId(connection.to);
        if (!source || !target) {
          return null;
        }
        const sourcePoint = screenPointByNodeId.get(source.blockId);
        const targetPoint = screenPointByNodeId.get(target.blockId);
        if (!sourcePoint || !targetPoint) {
          return null;
        }
        return {
          id: connection.id,
          x1: sourcePoint.x,
          y1: sourcePoint.y,
          x2: targetPoint.x,
          y2: targetPoint.y,
        };
      })
      .filter(
        (line): line is { id: string; x1: number; y1: number; x2: number; y2: number } =>
          line !== null,
      );

    const contentBounds = computeContentBounds(architecture.nodes, containerById);
    const viewBox = contentBounds
      ? {
          x: contentBounds.x - contentBounds.width * 0.1,
          y: contentBounds.y - contentBounds.height * 0.1,
          width: contentBounds.width * 1.2,
          height: contentBounds.height * 1.2,
        }
      : DEFAULT_VIEWBOX;

    return {
      viewBox,
      containerShapes,
      blockShapes,
      connectionLines,
    };
  }, [architecture.connections, architecture.nodes]);

  const visibleRect = useMemo(
    () => ({
      x: -pan.x / zoom - origin.x,
      y: -pan.y / zoom - origin.y,
      width: containerWidth / zoom,
      height: containerHeight / zoom,
    }),
    [containerHeight, containerWidth, origin.x, origin.y, pan.x, pan.y, zoom],
  );

  const suppressClickRef = useRef(false);
  const viewportDragRef = useRef<
    | {
        pointerId: number;
        offsetX: number;
        offsetY: number;
      }
    | undefined
  >(undefined);

  const centerAt = useCallback(
    (sceneX: number, sceneY: number) => {
      const panX = containerWidth / 2 - (origin.x + sceneX) * zoom;
      const panY = containerHeight / 2 - (origin.y + sceneY) * zoom;
      onRequestCenter(panX, panY);
    },
    [containerHeight, containerWidth, onRequestCenter, origin.x, origin.y, zoom],
  );

  const handleMapClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      const svg = svgRef.current;
      if (!svg) {
        return;
      }
      const point = getSvgPoint(svg, event.clientX, event.clientY);
      centerAt(point.x, point.y);
    },
    [centerAt],
  );

  const handleViewportPointerDown = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) {
        return;
      }
      const point = getSvgPoint(svg, event.clientX, event.clientY);
      viewportDragRef.current = {
        pointerId: event.pointerId,
        offsetX: point.x - visibleRect.x,
        offsetY: point.y - visibleRect.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [visibleRect.x, visibleRect.y],
  );

  const handleViewportPointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      const dragState = viewportDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) {
        return;
      }
      const point = getSvgPoint(svg, event.clientX, event.clientY);
      const nextX = point.x - dragState.offsetX;
      const nextY = point.y - dragState.offsetY;
      const centerX = nextX + visibleRect.width / 2;
      const centerY = nextY + visibleRect.height / 2;
      suppressClickRef.current = true;
      centerAt(centerX, centerY);
    },
    [centerAt, visibleRect.height, visibleRect.width],
  );

  const handleViewportPointerEnd = useCallback((event: React.PointerEvent<SVGRectElement>) => {
    const dragState = viewportDragRef.current;
    if (dragState && dragState.pointerId === event.pointerId) {
      viewportDragRef.current = undefined;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }, []);

  return (
    <button
      type="button"
      className="minimap-container"
      onClick={handleMapClick}
      aria-label="Mini map"
      data-testid="minimap-container"
    >
      <svg
        ref={svgRef}
        width={MINI_MAP_WIDTH}
        height={MINI_MAP_HEIGHT}
        viewBox={`${staticGeometry.viewBox.x} ${staticGeometry.viewBox.y} ${staticGeometry.viewBox.width} ${staticGeometry.viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        data-testid="minimap-svg"
      >
        <title>Mini map overview</title>
        {staticGeometry.connectionLines.map((line) => (
          <line
            key={line.id}
            className="minimap-connection-line"
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            data-testid="minimap-connection"
          />
        ))}
        {staticGeometry.containerShapes.map((container) => (
          <polygon
            key={container.id}
            className="minimap-container-shape"
            points={container.points}
            data-testid="minimap-container-shape"
          />
        ))}
        {staticGeometry.blockShapes.map((block) => (
          <polygon
            key={block.id}
            className="minimap-block-shape"
            points={block.points}
            data-testid="minimap-block-shape"
          />
        ))}
        <rect
          className="minimap-viewport-rect"
          x={visibleRect.x}
          y={visibleRect.y}
          width={visibleRect.width}
          height={visibleRect.height}
          data-testid="minimap-viewport"
        />
        <rect
          className="minimap-viewport-handle"
          x={visibleRect.x}
          y={visibleRect.y}
          width={visibleRect.width}
          height={visibleRect.height}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerEnd}
          onPointerCancel={handleViewportPointerEnd}
          data-testid="minimap-viewport-handle"
        />
      </svg>
    </button>
  );
}
