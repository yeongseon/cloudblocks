import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type {
  Connection,
  ConnectionType,
  ContainerBlock,
  Endpoint,
  EndpointSemantic,
  ResourceBlock,
} from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import { getDiffState } from '../../shared/utils/diff';
import { worldToScreen } from '../../shared/utils/isometric';
import type { ScreenPoint } from '../../shared/utils/isometric';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import {
  TRACE_FLASH_PX,
  ARROW_MARKER_W,
  ARROW_MARKER_H,
  ARROW_MARKER_REF_X,
  PORT_DOT_RX,
  PORT_DOT_RY,
  PORT_DOT_STROKE_WIDTH,
} from '../../shared/tokens/designTokens';
import {
  resolveConnectionVisualStyle,
  CONNECTION_VISUAL_STYLES,
  CASING_WIDTH_OFFSET,
  HOVER_WIDTH_OFFSET,
} from '../../shared/tokens/connectionVisualTokens';
import { CONNECTOR_THEMES, DIFF_THEMES, lightenColor } from './connectorTheme';
import { getConnectionSurfaceRoute } from './surfaceRouting';
import type { SurfaceRoute, WorldPoint3 } from './surfaceRouting';
import { getConnectionColorsForType } from './connectionFaceColors';
import type { ConnectionRenderSemantic } from './connectionFaceColors';
import { offsetScreenPoints } from './overlapOffset';
import { PacketFlowLayer } from './PacketFlowLayer';

interface ConnectionRendererProps {
  connectionId?: string;
  connection?: Connection;
  blocks?: ResourceBlock[];
  plates?: ContainerBlock[];
  originX: number;
  originY: number;
  overlapOffset?: number;
}

/** Resolved colors for the 2-layer trace rendering. */
interface TraceColors {
  stroke: string;
  casing: string;
  opacity: number;
}

const HIT_AREA_WIDTH = 20;

function collectRelevantContainers(
  nodeById: ReadonlyMap<string, ContainerBlock | ResourceBlock>,
  ...parentIds: Array<string | null | undefined>
): ContainerBlock[] {
  const relevantContainers: ContainerBlock[] = [];
  const seen = new Set<string>();

  for (const parentId of parentIds) {
    let currentId = parentId;
    while (currentId && !seen.has(currentId)) {
      const node = nodeById.get(currentId);
      if (node?.kind !== 'container') break;
      seen.add(currentId);
      relevantContainers.push(node);
      currentId = node.parentId;
    }
  }

  return relevantContainers;
}

function getColors(
  semantic: ConnectionRenderSemantic,
  diffState: string,
  isHighlighted: boolean,
  isNeutral: boolean,
): TraceColors {
  const base = getConnectionColorsForType(semantic, isNeutral);
  const diffOverride = diffState !== 'unchanged' ? DIFF_THEMES[diffState] : null;

  // Diff mode uses hardcoded hex values that can be lightened.
  // Normal mode uses CSS var() strings — lightening is not possible,
  // so we boost strokeOpacity in the renderer instead.
  if (diffOverride) {
    const stroke = isHighlighted ? lightenColor(diffOverride.tile, 0.15) : diffOverride.tile;
    const casing = isHighlighted ? lightenColor(diffOverride.shadow, 0.1) : diffOverride.shadow;
    return { stroke, casing, opacity: diffOverride.opacity };
  }

  return {
    stroke: base.stroke,
    casing: base.casing,
    opacity: 1.0,
  };
}

function pointsToPath(points: readonly ScreenPoint[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function sameWorldPoint(a: WorldPoint3, b: WorldPoint3): boolean {
  return (
    Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[2] - b[2]) < 1e-6
  );
}

function getRouteCenterlinePoints(
  route: SurfaceRoute,
  originX: number,
  originY: number,
): ScreenPoint[] {
  const points: WorldPoint3[] = [];
  for (const segment of route.segments) {
    if (points.length === 0) {
      points.push(segment.start, segment.end);
      continue;
    }
    const last = points[points.length - 1];
    if (sameWorldPoint(last, segment.start)) {
      points.push(segment.end);
      continue;
    }
    points.push(segment.start, segment.end);
  }

  return points.map((point) => worldToScreen(point[0], point[1], point[2], originX, originY));
}

function getLabelPosition(points: readonly ScreenPoint[]): ScreenPoint | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];
  const mid = Math.floor((points.length - 1) / 2);
  const a = points[mid];
  const b = points[mid + 1] ?? a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

import type { PinHoleStyle } from './connectorTheme';

/** Render a pinhole glyph at a connection endpoint. */
function renderPinhole(
  x: number,
  y: number,
  style: PinHoleStyle,
  stroke: string,
  key: string,
): React.ReactElement {
  const r = PORT_DOT_RX;
  const ry = PORT_DOT_RY;
  const sw = PORT_DOT_STROKE_WIDTH;

  switch (style) {
    case 'filled':
      return <ellipse key={key} cx={x} cy={y} rx={r} ry={ry} fill={stroke} opacity={0.8} />;
    case 'cross':
      return (
        <g key={key} opacity={0.8}>
          <line x1={x - r} y1={y} x2={x + r} y2={y} stroke={stroke} strokeWidth={sw} />
          <line x1={x} y1={y - ry} x2={x} y2={y + ry} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case 'double':
      return (
        <g key={key} opacity={0.8}>
          <ellipse cx={x} cy={y} rx={r} ry={ry} fill="none" stroke={stroke} strokeWidth={sw} />
          <ellipse
            cx={x}
            cy={y}
            rx={r * 0.5}
            ry={ry * 0.5}
            fill="none"
            stroke={stroke}
            strokeWidth={sw * 0.8}
          />
        </g>
      );
    case 'dashed':
      return (
        <ellipse
          key={key}
          cx={x}
          cy={y}
          rx={r}
          ry={ry}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray="2 2"
          opacity={0.8}
        />
      );
    case 'open':
    default:
      return (
        <ellipse
          key={key}
          cx={x}
          cy={y}
          rx={r}
          ry={ry}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          opacity={0.8}
        />
      );
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: rendering component with dual path requires unified control flow
export const ConnectionRenderer = memo(function ConnectionRenderer({
  connectionId,
  connection,
  blocks = [],
  plates = [],
  originX,
  originY,
  overlapOffset = 0,
}: ConnectionRendererProps) {
  const resolvedConnectionId = connectionId ?? connection?.id ?? null;
  const storeConnection = useArchitectureStore((state) => {
    if (!resolvedConnectionId) return null;
    return state.connectionById.get(resolvedConnectionId) ?? null;
  });
  const resolvedConnection = storeConnection ?? connection ?? null;
  const [isHovered, setIsHovered] = useState(false);
  const drawInRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = drawInRef.current;
    if (!el || typeof el.getTotalLength !== 'function') return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.getBoundingClientRect();
    el.style.animation = `connector-draw-in 400ms var(--easing-default, cubic-bezier(0.2, 0, 0, 1)) forwards`;
    const handleEnd = () => {
      // Clear inline overrides so the SVG attribute (type-specific dash) takes effect.
      el.style.strokeDasharray = '';
      el.style.strokeDashoffset = '';
      el.style.animation = '';
      el.style.opacity = '';
    };
    el.addEventListener('animationend', handleEnd, { once: true });
    return () => el.removeEventListener('animationend', handleEnd);
  }, []);

  const isSelected = useUIStore((s) =>
    resolvedConnectionId ? s.selectedIds.has(resolvedConnectionId) : false,
  );
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const creationBurstExpiry = useUIStore((state) =>
    resolvedConnectionId ? state.connectionCreationBursts.get(resolvedConnectionId) : undefined,
  );
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const fromEndpoint = useArchitectureStore((state) => {
    if (!resolvedConnection) return null;
    return state.endpointById.get(resolvedConnection.from) ?? null;
  });
  const toEndpoint = useArchitectureStore((state) => {
    if (!resolvedConnection) return null;
    return state.endpointById.get(resolvedConnection.to) ?? null;
  });
  const sourceBlockId =
    fromEndpoint?.blockId ??
    (resolvedConnection ? parseEndpointId(resolvedConnection.from)?.blockId : null) ??
    null;
  const targetBlockId =
    toEndpoint?.blockId ??
    (resolvedConnection ? parseEndpointId(resolvedConnection.to)?.blockId : null) ??
    null;
  const sourceBlock = useArchitectureStore((state) => {
    if (!sourceBlockId) return null;
    const node = state.nodeById.get(sourceBlockId);
    return node?.kind === 'resource' ? node : null;
  });
  const targetBlock = useArchitectureStore((state) => {
    if (!targetBlockId) return null;
    const node = state.nodeById.get(targetBlockId);
    return node?.kind === 'resource' ? node : null;
  });
  const relevantPlates = useArchitectureStore(
    useShallow((state) => {
      if (!resolvedConnection) {
        return plates;
      }
      return collectRelevantContainers(
        state.nodeById,
        sourceBlock?.parentId,
        targetBlock?.parentId,
      );
    }),
  );

  const routeEndpoints = useMemo(
    () => [fromEndpoint, toEndpoint].filter((endpoint): endpoint is Endpoint => endpoint !== null),
    [fromEndpoint, toEndpoint],
  );
  const routeBlocks = useMemo(() => {
    if (!resolvedConnection) {
      return blocks;
    }
    return [sourceBlock, targetBlock].filter((block): block is ResourceBlock => block !== null);
  }, [blocks, resolvedConnection, sourceBlock, targetBlock]);
  const routePlates = resolvedConnection ? relevantPlates : plates;

  const semantic: EndpointSemantic = fromEndpoint?.semantic ?? 'data';
  const renderSemantic: ConnectionRenderSemantic = semantic;

  const diffState =
    diffMode && diffDelta && resolvedConnectionId
      ? getDiffState(resolvedConnectionId, diffDelta)
      : 'unchanged';
  const isHighlighted = isHovered || isSelected;

  const connectionErrors = useMemo(() => {
    if (!validationResult || !resolvedConnectionId) return [];
    return [
      ...validationResult.errors.filter((e) => e.targetId === resolvedConnectionId),
      ...validationResult.warnings.filter((w) => w.targetId === resolvedConnectionId),
    ];
  }, [resolvedConnectionId, validationResult]);

  const hasValidationError = connectionErrors.length > 0;
  const creationBurstActive = creationBurstExpiry !== undefined;

  useEffect(() => {
    if (!resolvedConnectionId || creationBurstExpiry === undefined) {
      return;
    }

    const remaining = creationBurstExpiry - Date.now();
    if (remaining <= 0) {
      useUIStore.getState().clearConnectionCreationBurst(resolvedConnectionId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      useUIStore.getState().clearConnectionCreationBurst(resolvedConnectionId);
    }, remaining);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [creationBurstExpiry, resolvedConnectionId]);

  const packetMode = (() => {
    if (hasValidationError) return 'static' as const;
    if (creationBurstActive) return 'creation' as const;
    if (isSelected) return 'selected' as const;
    if (isHovered) return 'hover' as const;
    return 'static' as const;
  })();

  const surfaceRoute = useMemo(
    () =>
      resolvedConnection
        ? getConnectionSurfaceRoute(resolvedConnection, routeBlocks, routePlates, routeEndpoints)
        : null,
    [resolvedConnection, routeBlocks, routeEndpoints, routePlates],
  );

  const surfaceRender = useMemo(() => {
    if (!surfaceRoute) return null;

    const rawPoints = getRouteCenterlinePoints(surfaceRoute, originX, originY);
    const hitPoints = overlapOffset ? offsetScreenPoints(rawPoints, overlapOffset) : rawPoints;
    const hitPath = pointsToPath(hitPoints);

    if (hitPoints.length < 2) return null;

    return {
      hitPath,
      hitPoints,
      labelPos: getLabelPosition(hitPoints),
      sourcePos: hitPoints[0],
      targetPos: hitPoints[hitPoints.length - 1],
    };
  }, [surfaceRoute, originX, originY, overlapOffset]);

  if (!resolvedConnection || !resolvedConnectionId || !surfaceRender) return null;

  // Resolve per-type stroke width and dash pattern.
  const rawType = resolvedConnection.metadata?.type;
  const connectionType: ConnectionType | undefined =
    typeof rawType === 'string' && Object.hasOwn(CONNECTION_VISUAL_STYLES, rawType)
      ? (rawType as ConnectionType)
      : undefined;
  const isNeutral = connectionType === 'dataflow' || connectionType === undefined;
  const colors = getColors(renderSemantic, diffState, isHighlighted, isNeutral);
  const hitPath = surfaceRender.hitPath;
  const hitPoints = surfaceRender.hitPoints;
  const labelPos = surfaceRender.labelPos;
  const sourcePos = surfaceRender.sourcePos;
  const targetPos = surfaceRender.targetPos;

  const visualStyle = resolveConnectionVisualStyle(connectionType);
  const innerWidth = isHighlighted
    ? visualStyle.strokeWidth + HOVER_WIDTH_OFFSET
    : visualStyle.strokeWidth;
  const casingWidth = isHighlighted
    ? visualStyle.strokeWidth + CASING_WIDTH_OFFSET + HOVER_WIDTH_OFFSET
    : visualStyle.strokeWidth + CASING_WIDTH_OFFSET;
  const markerId = `arrow-${resolvedConnection.id}`;
  const pinHoleStyle = CONNECTOR_THEMES[connectionType ?? 'dataflow'].pinHoleStyle;
  const rawConnectionType = resolvedConnection.metadata?.type;
  const resolvedConnectionType =
    typeof rawConnectionType === 'string' ? rawConnectionType : 'dataflow';
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (toolMode === 'delete') {
      removeConnection(resolvedConnection.id);
      return;
    }
    setSelectedId(resolvedConnection.id);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG <g> must stay interactive for connector hit testing.
    <g opacity={colors.opacity} data-connector-type={connectionType ?? semantic}>
      {/* Arrow marker definition — one per connection for semantic color */}
      <defs>
        <marker
          id={markerId}
          markerWidth={ARROW_MARKER_W}
          markerHeight={ARROW_MARKER_H}
          refX={ARROW_MARKER_REF_X}
          refY={ARROW_MARKER_H / 2}
          orient="auto"
          markerUnits="strokeWidth"
          data-testid="connection-arrow-marker"
        >
          <path
            d={`M0,0 L${ARROW_MARKER_W},${ARROW_MARKER_H / 2} L0,${ARROW_MARKER_H} Z`}
            fill={colors.stroke}
            fillOpacity={isHighlighted ? 1.0 : 0.95}
          />
        </marker>
      </defs>
      <a
        href={`/connections/${resolvedConnection.id}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <path
          d={hitPath}
          stroke="transparent"
          strokeWidth={HIT_AREA_WIDTH}
          fill="none"
          pointerEvents="stroke"
          style={{ cursor: 'pointer' }}
          data-testid="connection-hit-area"
        />
      </a>

      {/* Layer 1: Outer casing path */}
      <path
        d={hitPath}
        stroke={colors.casing}
        strokeWidth={casingWidth}
        strokeOpacity={isHighlighted ? 0.9 : 0.82}
        strokeDasharray={visualStyle.strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pointerEvents="none"
        data-testid="connection-casing"
        data-layer="casing"
      />

      {/* Layer 2: Inner trace path (with draw-in animation) */}
      <path
        ref={drawInRef}
        d={hitPath}
        stroke={colors.stroke}
        strokeWidth={innerWidth}
        strokeOpacity={isHighlighted ? 1.0 : 0.98}
        strokeDasharray={visualStyle.strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pointerEvents="none"
        data-testid="connection-trace"
        data-layer="trace"
        markerEnd={`url(#${markerId})`}
      />

      {packetMode !== 'static' && (
        <PacketFlowLayer
          hitPoints={hitPoints}
          mode={packetMode}
          connectionType={resolvedConnectionType}
          strokeColor={colors.stroke}
        />
      )}

      {/* Provider-accent glow: hover = subtle, selection = stronger */}
      {isHighlighted && (
        <path
          d={hitPath}
          stroke="var(--provider-accent-glow)"
          strokeWidth={isSelected ? casingWidth + 4 : casingWidth + 2}
          strokeOpacity={isSelected ? 1 : 0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pointerEvents="none"
          data-layer="selection-outline"
        />
      )}

      {/* Snap flash animation overlay */}
      <path
        d={hitPath}
        stroke={colors.stroke}
        strokeWidth={TRACE_FLASH_PX}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pointerEvents="none"
        style={{
          animation:
            'connector-snap-flash 300ms var(--easing-default, cubic-bezier(0.2, 0, 0, 1)) forwards',
        }}
        data-testid="connection-snap-flash"
      />

      {/* Port pinhole indicators at connection endpoints */}
      {diffState === 'unchanged' && (
        <g data-testid="connection-pinholes" pointerEvents="none">
          {renderPinhole(sourcePos.x, sourcePos.y, pinHoleStyle, colors.stroke, 'src')}
          {renderPinhole(targetPos.x, targetPos.y, pinHoleStyle, colors.stroke, 'tgt')}
        </g>
      )}

      {hasValidationError && (
        <path
          d={hitPath}
          stroke="var(--accent-error, #ef4444)"
          strokeWidth={3}
          strokeDasharray="6 6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pointerEvents="none"
          data-testid="connection-invalid"
        />
      )}

      {hasValidationError &&
        (isHovered || isSelected) &&
        (() => {
          if (!labelPos) return null;
          const msg = connectionErrors[0].message;
          const textWidth = Math.min(msg.length * 6.5, 220);
          const padding = 6;
          const rectWidth = textWidth + padding * 2;
          const rectHeight = 22;

          return (
            <g data-testid="connection-error-label" pointerEvents="none">
              <rect
                x={labelPos.x - rectWidth / 2}
                y={labelPos.y - rectHeight - 4}
                width={rectWidth}
                height={rectHeight}
                rx={4}
                fill="var(--accent-error, #ef4444)"
                fillOpacity={0.92}
              />
              <text
                x={labelPos.x}
                y={labelPos.y - rectHeight / 2 - 4 + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--connection-error-label-text, #0F172A)"
                fontSize={11}
                fontFamily="var(--font-ui, system-ui)"
                style={{ pointerEvents: 'none' }}
              >
                {msg.length > 35 ? msg.slice(0, 32) + '\u2026' : msg}
              </text>
            </g>
          );
        })()}
    </g>
  );
});
