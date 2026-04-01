import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Connection,
  ConnectionType,
  ContainerBlock,
  Endpoint,
  EndpointSemantic,
  ResourceBlock,
} from '@cloudblocks/schema';
import { getDiffState } from '../../features/diff/engine';
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

interface ConnectionRendererProps {
  connection: Connection;
  blocks: ResourceBlock[];
  plates: ContainerBlock[];
  originX: number;
  originY: number;
}

/** Resolved colors for the 2-layer trace rendering. */
interface TraceColors {
  stroke: string;
  casing: string;
  opacity: number;
}

const HIT_AREA_WIDTH = 20;

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
  connection,
  blocks,
  plates,
  originX,
  originY,
}: ConnectionRendererProps) {
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

  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const endpointsList = useArchitectureStore((s) => s.workspace.architecture.endpoints);

  const fromEndpoint: Endpoint | undefined = useMemo(
    () => endpointsList.find((endpoint) => endpoint.id === connection.from),
    [connection.from, endpointsList],
  );

  const semantic: EndpointSemantic = fromEndpoint?.semantic ?? 'data';
  const renderSemantic: ConnectionRenderSemantic = semantic;

  const diffState = diffMode && diffDelta ? getDiffState(connection.id, diffDelta) : 'unchanged';
  const isSelected = selectedId === connection.id;
  const isHighlighted = isHovered || isSelected;

  const connectionErrors = useMemo(() => {
    if (!validationResult) return [];
    return [
      ...validationResult.errors.filter((e) => e.targetId === connection.id),
      ...validationResult.warnings.filter((w) => w.targetId === connection.id),
    ];
  }, [validationResult, connection.id]);

  const hasValidationError = connectionErrors.length > 0;

  const surfaceRoute = useMemo(
    () => getConnectionSurfaceRoute(connection, blocks, plates, endpointsList),
    [connection, blocks, plates, endpointsList],
  );

  const surfaceRender = useMemo(() => {
    if (!surfaceRoute) return null;

    const hitPoints = getRouteCenterlinePoints(surfaceRoute, originX, originY);
    const hitPath = pointsToPath(hitPoints);

    if (hitPoints.length < 2) return null;

    return {
      hitPath,
      labelPos: getLabelPosition(hitPoints),
      sourcePos: hitPoints[0],
      targetPos: hitPoints[hitPoints.length - 1],
    };
  }, [surfaceRoute, originX, originY]);

  if (!surfaceRender) return null;

  // Resolve per-type stroke width and dash pattern.
  const rawType = connection.metadata?.type;
  const connectionType: ConnectionType | undefined =
    typeof rawType === 'string' && Object.hasOwn(CONNECTION_VISUAL_STYLES, rawType)
      ? (rawType as ConnectionType)
      : undefined;
  const isNeutral = connectionType === 'dataflow' || connectionType === undefined;
  const colors = getColors(renderSemantic, diffState, isHighlighted, isNeutral);
  const hitPath = surfaceRender.hitPath;
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
  const markerId = `arrow-${connection.id}`;
  const pinHoleStyle = CONNECTOR_THEMES[connectionType ?? 'dataflow'].pinHoleStyle;
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (toolMode === 'delete') {
      removeConnection(connection.id);
      return;
    }
    setSelectedId(connection.id);
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
        href={`/connections/${connection.id}`}
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
        strokeOpacity={isHighlighted ? 0.7 : 0.55}
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
        strokeOpacity={isHighlighted ? 1.0 : 0.95}
        strokeDasharray={visualStyle.strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pointerEvents="none"
        data-testid="connection-trace"
        data-layer="trace"
        markerEnd={`url(#${markerId})`}
      />

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
