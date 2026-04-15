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
  PORT_DOT_HEIGHT,
  PORT_DOT_STROKE_WIDTH,
  DOCKING_STEM_PX,
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
import { contrastTextColor } from './contrastTextColor';
import { CONNECTION_TYPE_LABELS } from '../../shared/tokens/connectionTypeLabels';
import { buildRoundedConnectionGeometry } from './roundedConnectionPath';
import { measureSvgTextWidth } from '../../shared/utils/svgTextMeasure';
import type { SvgTextMeasureSpec } from '../../shared/utils/svgTextMeasure';
import { useConnectionPathTransition, flowPointsToPath } from './useConnectionPathTransition';

/** Stable empty array to avoid re-render loops when surfaceRender is null. */
const EMPTY_POINTS: readonly import('../../shared/utils/isometric').ScreenPoint[] = [];

interface ConnectionRendererProps {
  connectionId?: string;
  connection?: Connection;
  blocks?: ResourceBlock[];
  plates?: ContainerBlock[];
  originX: number;
  originY: number;
  overlapOffset?: number;
  elapsed?: number;
  reducedMotion?: boolean;
  overlayMode?: 'normal' | 'visual-only' | 'hit-only';
}

/** Resolved colors for the 2-layer trace rendering. */
interface TraceColors {
  stroke: string;
  casing: string;
  opacity: number;
}

const HIT_AREA_WIDTH = 20;

// Font specs for label text measurement (used by measureSvgTextWidth).
const ERROR_LABEL_FONT: SvgTextMeasureSpec = { fontSize: 11 } as const;
const TYPE_TOP_FONT: SvgTextMeasureSpec = { fontSize: 10, fontWeight: 600 } as const;
const TYPE_BOTTOM_FONT: SvgTextMeasureSpec = { fontSize: 9 } as const;
const HOVER_TYPE_FONT: SvgTextMeasureSpec = { fontSize: 10 } as const;

const LABEL_NAME_MAX_CHARS = 14;
function truncateName(name: string): string {
  if (name.length <= LABEL_NAME_MAX_CHARS) return name;
  return name.slice(0, LABEL_NAME_MAX_CHARS - 1) + '\u2026';
}

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

/** Render a pinhole glyph at a connection endpoint.
 *  3-layer base (shadow + filled top + inner ring) with type-specific overlay.
 */
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

  // Type-specific overlay rendered on top of the base glyph
  let overlay: React.ReactElement | null = null;
  switch (style) {
    case 'filled':
      // No overlay needed — base glyph is already filled
      break;
    case 'cross':
      overlay = (
        <g opacity={0.9}>
          <line
            x1={x - r * 0.45}
            y1={y}
            x2={x + r * 0.45}
            y2={y}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={sw}
          />
          <line
            x1={x}
            y1={y - ry * 0.45}
            x2={x}
            y2={y + ry * 0.45}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={sw}
          />
        </g>
      );
      break;
    case 'double':
      overlay = (
        <ellipse
          cx={x}
          cy={y}
          rx={r * 0.5}
          ry={ry * 0.5}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={sw * 0.8}
        />
      );
      break;
    case 'dashed':
      overlay = (
        <ellipse
          cx={x}
          cy={y}
          rx={r * 0.7}
          ry={ry * 0.7}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={sw}
          strokeDasharray="2 2"
        />
      );
      break;
    case 'open':
    default:
      // Inner ring from base glyph is sufficient for open style
      break;
  }

  return (
    <g key={key} opacity={0.8}>
      {/* Layer 1: Shadow */}
      <ellipse cx={x} cy={y + PORT_DOT_HEIGHT} rx={r} ry={ry} fill="rgba(0,0,0,0.2)" />
      {/* Layer 2: Filled top */}
      <ellipse cx={x} cy={y} rx={r} ry={ry} fill={stroke} />
      {/* Layer 3: Inner ring */}
      <ellipse
        cx={x}
        cy={y}
        rx={r * 0.6}
        ry={ry * 0.6}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1}
      />
      {/* Type-specific overlay */}
      {overlay}
    </g>
  );
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
  elapsed,
  reducedMotion,
  overlayMode = 'normal',
}: ConnectionRendererProps) {
  const resolvedConnectionId = connectionId ?? connection?.id ?? null;
  const storeConnection = useArchitectureStore((state) => {
    if (!resolvedConnectionId) return null;
    return state.connectionById.get(resolvedConnectionId) ?? null;
  });
  const resolvedConnection = storeConnection ?? connection ?? null;
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const drawInRef = useRef<SVGPathElement>(null);
  const hasDrawnInRef = useRef(false);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const [creationStartElapsed, setCreationStartElapsed] = useState(0);
  const [prevBurstExpiry, setPrevBurstExpiry] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (overlayMode === 'visual-only') return;
    // Schedule entranceComplete on every non-visual-only mount so that
    // StrictMode's unmount/remount cycle still flips the flag even though
    // the first microtask gets cancelled during cleanup.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setEntranceComplete(true);
    });
    // Gate the draw-in animation itself: play only once per component lifetime.
    if (hasDrawnInRef.current)
      return () => {
        cancelled = true;
      };
    hasDrawnInRef.current = true;
    const el = drawInRef.current;
    if (!el || typeof el.getTotalLength !== 'function')
      return () => {
        cancelled = true;
      };
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
    return () => {
      cancelled = true;
      el.removeEventListener('animationend', handleEnd);
    };
  }, [overlayMode]);

  const isSelected = useUIStore((s) =>
    resolvedConnectionId ? s.selectedIds.has(resolvedConnectionId) : false,
  );
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const canvasZoom = useUIStore((s) => s.canvasZoom);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const interactionState = useUIStore((s) => s.interactionState);
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
  const isHighlighted = isSelected || isHovered || isFocused;

  const connectionErrors = useMemo(() => {
    if (!validationResult || !resolvedConnectionId) return [];
    return validationResult.errors.filter((e) => e.targetId === resolvedConnectionId);
  }, [resolvedConnectionId, validationResult]);

  const hasValidationError = connectionErrors.length > 0;
  const creationBurstActive = creationBurstExpiry !== undefined;

  // Capture the shared elapsed when a new creation burst starts, so the
  // PacketFlowLayer receives a local elapsed starting from 0.
  // Uses the React "adjust state during render" pattern so the value
  // is available on the first frame (unlike useEffect which runs after).
  if (creationBurstExpiry !== prevBurstExpiry) {
    setPrevBurstExpiry(creationBurstExpiry);
    if (creationBurstExpiry !== undefined) {
      setCreationStartElapsed(elapsed ?? 0);
    }
  }

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
    if (hasValidationError) return 'invalid' as const;
    if (creationBurstActive) return 'creation' as const;
    if (isSelected) return 'selected' as const;
    if (isHovered || isFocused) return 'hover' as const;
    return 'idle' as const;
  })();

  // Creation bursts use a connection-local elapsed derived from the shared clock
  // value at burst start, not the current shared elapsed. Without this,
  // a long-running canvas (elapsed > PACKET_SPEED_MS) would cause new bursts
  // to render as already completed on first frame.
  const packetElapsed =
    packetMode === 'creation' && elapsed !== undefined
      ? Math.max(0, elapsed - creationStartElapsed)
      : elapsed;

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
    const offsetPoints = overlapOffset ? offsetScreenPoints(rawPoints, overlapOffset) : rawPoints;
    const { path: hitPath, flowPoints } = buildRoundedConnectionGeometry(offsetPoints, {
      startStraightReserve: DOCKING_STEM_PX,
    });

    if (flowPoints.length < 2) return null;

    return {
      hitPath,
      hitPoints: flowPoints,
      labelPos: getLabelPosition(flowPoints),
      sourcePos: flowPoints[0],
      targetPos: flowPoints[flowPoints.length - 1],
    };
  }, [surfaceRoute, originX, originY, overlapOffset]);

  // Path transition animation: smooth morph when blocks snap to grid.
  // Uses the transition hook to interpolate flowPoints during dragging → idle.
  const transitionInput = surfaceRender?.hitPoints ?? EMPTY_POINTS;
  const { flowPoints: transitionedPoints, isTransitioning } = useConnectionPathTransition(
    transitionInput,
    interactionState,
    elapsed,
    reducedMotion ?? false,
  );

  if (!resolvedConnection || !resolvedConnectionId || !surfaceRender) return null;

  // During transition, use interpolated geometry; otherwise use original.
  const activeHitPath = isTransitioning
    ? flowPointsToPath(transitionedPoints)
    : surfaceRender.hitPath;
  const activeHitPoints = isTransitioning ? transitionedPoints : surfaceRender.hitPoints;

  // Resolve per-type stroke width and dash pattern.
  const rawType = resolvedConnection.metadata?.type;
  const connectionType: ConnectionType | undefined =
    typeof rawType === 'string' && Object.hasOwn(CONNECTION_VISUAL_STYLES, rawType)
      ? (rawType as ConnectionType)
      : undefined;
  const isNeutral = connectionType === 'dataflow' || connectionType === undefined;
  const colors = getColors(renderSemantic, diffState, isHighlighted, isNeutral);
  const hitPath = activeHitPath;
  const hitPoints = activeHitPoints;
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
  const accentColor = CONNECTOR_THEMES[connectionType ?? 'dataflow'].accent;
  const connectionLabel = `Connection${sourceBlock ? ` from ${sourceBlock.name}` : ''}${targetBlock ? ` to ${targetBlock.name}` : ''}${connectionType ? ` (${connectionType})` : ''}`;
  const activateConnection = () => {
    if (toolMode === 'delete') {
      removeConnection(resolvedConnection.id);
      return;
    }
    setSelectedId(resolvedConnection.id);
  };
  const handleClick = (e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    activateConnection();
  };
  const shouldRenderHitArea = overlayMode !== 'visual-only';
  const shouldRenderVisuals = overlayMode !== 'hit-only';

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG <g> must stay interactive for connector hit testing.
    <g
      opacity={colors.opacity}
      data-connector-type={connectionType ?? 'dataflow'}
      data-highlighted={isHighlighted ? 'true' : 'false'}
      data-selected={isSelected ? 'true' : 'false'}
    >
      {shouldRenderVisuals && (
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
              data-layer="arrow-head"
            />
          </marker>
        </defs>
      )}
      {shouldRenderHitArea && (
        <g
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.repeat) {
              e.preventDefault();
              activateConnection();
            }
            if (e.key === ' ') {
              e.preventDefault();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ') {
              e.preventDefault();
              activateConnection();
            }
          }}
          aria-label={connectionLabel}
          style={{ cursor: 'pointer' }}
        >
          <path
            d={hitPath}
            stroke="transparent"
            strokeWidth={HIT_AREA_WIDTH}
            fill="none"
            pointerEvents="stroke"
            data-testid="connection-hit-area"
            className="connection-hit-area"
          />
        </g>
      )}

      {shouldRenderVisuals && (
        <>
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

          <PacketFlowLayer
            hitPoints={hitPoints}
            mode={packetMode}
            connectionType={connectionType ?? 'dataflow'}
            elapsed={packetElapsed}
            reducedMotion={reducedMotion}
            canvasZoom={canvasZoom}
          />

          {/* Provider-accent glow: always rendered, faded via CSS transition */}
          <path
            d={hitPath}
            stroke="var(--provider-accent-glow)"
            strokeWidth={isSelected ? casingWidth + 4 : casingWidth + 2}
            strokeOpacity={isHighlighted ? (isSelected ? 1 : 0.7) : 0}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            pointerEvents="none"
            data-layer="selection-outline"
          />

          {/* Snap flash animation overlay — skip for visual-only and skip replay on deselection */}
          {overlayMode !== 'visual-only' && !entranceComplete && (
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
          )}

          {/* Port pinhole indicators at connection endpoints */}
          {diffState === 'unchanged' && (
            <g data-testid="connection-pinholes" pointerEvents="none">
              {renderPinhole(sourcePos.x, sourcePos.y, pinHoleStyle, colors.stroke, 'src')}
              {renderPinhole(targetPos.x, targetPos.y, pinHoleStyle, colors.stroke, 'tgt')}
            </g>
          )}

          {hasValidationError && (
            <path
              className="connection-error-pulse"
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
            isHighlighted &&
            (() => {
              if (!labelPos) return null;
              const msg = connectionErrors[0].message;
              const errorText = msg.length > 35 ? `${msg.slice(0, 32)}\u2026` : msg;
              const textWidth = Math.min(measureSvgTextWidth(errorText, ERROR_LABEL_FONT), 220);
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
                    {errorText}
                  </text>
                </g>
              );
            })()}

          {isHighlighted &&
            !hasValidationError &&
            labelPos &&
            (() => {
              const rawTypeLabel = connectionType ?? 'dataflow';
              const humanLabel =
                CONNECTION_TYPE_LABELS[rawTypeLabel as keyof typeof CONNECTION_TYPE_LABELS] ??
                rawTypeLabel;

              if (isSelected && (sourceBlock || targetBlock)) {
                const srcName = sourceBlock ? truncateName(sourceBlock.name) : '?';
                const tgtName = targetBlock ? truncateName(targetBlock.name) : '?';
                const directionLabel = `${srcName} → ${tgtName}`;
                const topWidth = measureSvgTextWidth(humanLabel, TYPE_TOP_FONT) + 16;
                const bottomWidth = measureSvgTextWidth(directionLabel, TYPE_BOTTOM_FONT) + 16;
                const rectWidth = Math.max(topWidth, bottomWidth);
                const rectHeight = 32;

                return (
                  <g data-testid="connection-type-label" pointerEvents="none">
                    <rect
                      x={labelPos.x - rectWidth / 2}
                      y={labelPos.y - rectHeight - 4}
                      width={rectWidth}
                      height={rectHeight}
                      rx={8}
                      fill={colors.stroke}
                      fillOpacity={0.92}
                      stroke={accentColor}
                      strokeWidth={1}
                      strokeOpacity={0.8}
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y - rectHeight - 4 + 11}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={contrastTextColor(colors.stroke)}
                      fontSize={10}
                      fontWeight={600}
                      fontFamily="var(--font-ui, system-ui)"
                      style={{ pointerEvents: 'none' }}
                    >
                      {humanLabel}
                    </text>
                    <text
                      x={labelPos.x}
                      y={labelPos.y - rectHeight - 4 + 24}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={contrastTextColor(colors.stroke)}
                      fontSize={9}
                      fontFamily="var(--font-ui, system-ui)"
                      style={{ pointerEvents: 'none', opacity: 0.8 }}
                    >
                      {directionLabel}
                    </text>
                  </g>
                );
              }

              const rectWidth = measureSvgTextWidth(humanLabel, HOVER_TYPE_FONT) + 12;
              const rectHeight = 18;

              return (
                <g data-testid="connection-type-label" pointerEvents="none">
                  <rect
                    x={labelPos.x - rectWidth / 2}
                    y={labelPos.y - rectHeight - 4}
                    width={rectWidth}
                    height={rectHeight}
                    rx={8}
                    fill={colors.stroke}
                    fillOpacity={0.85}
                    stroke={accentColor}
                    strokeWidth={1}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y - rectHeight / 2 - 4 + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={contrastTextColor(colors.stroke)}
                    fontSize={10}
                    fontFamily="var(--font-ui, system-ui)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {humanLabel}
                  </text>
                </g>
              );
            })()}
        </>
      )}
    </g>
  );
});
