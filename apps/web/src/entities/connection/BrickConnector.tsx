import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  Connection,
  ContainerNode,
  Endpoint,
  EndpointSemantic,
  ExternalActor,
  LeafNode,
} from '@cloudblocks/schema';
import { getDiffState } from '../../features/diff/engine';
import { getConnectionEndpointWorldAnchors } from './endpointAnchors';
import { worldToScreen } from '../../shared/utils/isometric';
import type { ScreenPoint } from '../../shared/utils/isometric';
import { StudDefs, StudGrid } from '../../shared/components/IsometricStud';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import {
  BEAM_THICKNESS_PX,
  CONNECTION_HEIGHT_CU,
  CONNECTION_WIDTH_CU,
  PIN_HOLE_SPACING_CU,
  PIN_HOLE_RX,
  PIN_HOLE_RY,
  PORT_OUT_PX,
} from '../../shared/tokens/designTokens';
import { DIFF_THEMES, lightenColor } from './connectorTheme';
import { computeWorldRoute, screenSegmentLengthCU } from './routing';
import type { PinHoleStyle } from './connectorTheme';
import type { ScreenSegment } from './routing';
import { getConnectionSurfaceRoute } from './surfaceRouting';
import type { SurfaceRoute, WorldPoint3 } from './surfaceRouting';
import {
  buildBrickFootprint,
  getVisibleSideFaces,
  projectFootprintToScreen,
  sampleStudPositions,
} from './connectionBrickGeometry';
import { getConnectionBrickColors } from './connectionFaceColors';
import type { ConnectionRenderSemantic } from './connectionFaceColors';

interface BrickConnectorProps {
  connection: Connection;
  blocks: LeafNode[];
  plates: ContainerNode[];
  externalActors: ExternalActor[];
  originX: number;
  originY: number;
}

interface ConnectorColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
  studMain: string;
  studShadow: string;
  studHighlight: string;
  accent: string;
  opacity: number;
}

const LEGACY_BEAM_HALF_THICKNESS = 4;
const HIT_AREA_WIDTH = 20;
const DRAW_STROKE_WIDTH = Math.max(4, CONNECTION_WIDTH_CU * 8);

const LEGACY_PIN_HOLE_STYLE: Record<ConnectionRenderSemantic, PinHoleStyle> = {
  http: 'filled',
  event: 'dashed',
  data: 'double',
};

function getColors(
  semantic: ConnectionRenderSemantic,
  diffState: string,
  isHighlighted: boolean,
): ConnectorColors {
  const base = getConnectionBrickColors(semantic);
  const diffOverride = diffState !== 'unchanged' ? DIFF_THEMES[diffState] : null;

  const baseTop = diffOverride?.tile ?? base.topFaceColor;
  const baseRight = diffOverride?.shadow ?? base.rightSideColor;
  const baseLeft = diffOverride?.dark ?? base.leftSideColor;
  const baseStroke = diffOverride?.shadow ?? base.topFaceStroke;
  const baseStudMain = diffOverride?.tile ?? base.studColors.main;
  const baseStudShadow = diffOverride?.dark ?? base.studColors.shadow;
  const baseStudHighlight = diffOverride?.shadow ?? base.studColors.highlight;
  const baseOpacity = diffOverride?.opacity ?? 1.0;
  const accent = diffState !== 'unchanged' ? '#ffffff' : base.topFaceStroke;

  if (isHighlighted) {
    return {
      topFaceColor: lightenColor(baseTop, 0.15),
      topFaceStroke: lightenColor(baseStroke, 0.1),
      leftSideColor: lightenColor(baseLeft, 0.1),
      rightSideColor: lightenColor(baseRight, 0.1),
      studMain: lightenColor(baseStudMain, 0.15),
      studShadow: lightenColor(baseStudShadow, 0.1),
      studHighlight: lightenColor(baseStudHighlight, 0.1),
      accent,
      opacity: baseOpacity,
    };
  }

  return {
    topFaceColor: baseTop,
    topFaceStroke: baseStroke,
    leftSideColor: baseLeft,
    rightSideColor: baseRight,
    studMain: baseStudMain,
    studShadow: baseStudShadow,
    studHighlight: baseStudHighlight,
    accent,
    opacity: baseOpacity,
  };
}

function buildBeamTopFace(seg: ScreenSegment): string {
  const { start: s, end: e, direction } = seg;
  const hw = LEGACY_BEAM_HALF_THICKNESS;

  if (direction === 'screen-v') {
    return `${s.x - hw},${s.y} ${s.x + hw},${s.y} ${e.x + hw},${e.y} ${e.x - hw},${e.y}`;
  }
  return `${s.x},${s.y - hw} ${e.x},${e.y - hw} ${e.x},${e.y + hw} ${s.x},${s.y + hw}`;
}

function buildBeamSideFace(seg: ScreenSegment, thickness: number): string {
  const { start: s, end: e, direction } = seg;
  const hw = LEGACY_BEAM_HALF_THICKNESS;

  if (direction === 'screen-v') {
    return `${s.x + hw},${s.y} ${e.x + hw},${e.y} ${e.x + hw},${e.y + thickness} ${s.x + hw},${s.y + thickness}`;
  }
  return `${s.x},${s.y + hw} ${e.x},${e.y + hw} ${e.x},${e.y + hw + thickness} ${s.x},${s.y + hw + thickness}`;
}

function buildBeamFrontFace(seg: ScreenSegment, thickness: number): string {
  const { end: e, direction } = seg;
  const hw = LEGACY_BEAM_HALF_THICKNESS;

  if (direction === 'screen-v') {
    return `${e.x - hw},${e.y} ${e.x + hw},${e.y} ${e.x + hw},${e.y + thickness} ${e.x - hw},${e.y + thickness}`;
  }
  return `${e.x},${e.y - hw} ${e.x},${e.y + hw} ${e.x},${e.y + hw + thickness} ${e.x},${e.y - hw + thickness}`;
}

function renderPinHole(
  cx: number,
  cy: number,
  style: PinHoleStyle,
  accent: string,
  id: string,
): React.ReactNode {
  const opacity = 0.4;
  switch (style) {
    case 'open':
      return (
        <ellipse
          key={id}
          cx={cx}
          cy={cy}
          rx={PIN_HOLE_RX}
          ry={PIN_HOLE_RY}
          fill="none"
          stroke={accent}
          strokeWidth={1}
          opacity={opacity}
        />
      );
    case 'filled':
      return (
        <ellipse
          key={id}
          cx={cx}
          cy={cy}
          rx={PIN_HOLE_RX}
          ry={PIN_HOLE_RY}
          fill={accent}
          opacity={opacity}
        />
      );
    case 'cross':
      return (
        <g key={id} opacity={opacity}>
          <line
            x1={cx - PIN_HOLE_RX}
            y1={cy}
            x2={cx + PIN_HOLE_RX}
            y2={cy}
            stroke={accent}
            strokeWidth={1}
          />
          <line
            x1={cx}
            y1={cy - PIN_HOLE_RY}
            x2={cx}
            y2={cy + PIN_HOLE_RY}
            stroke={accent}
            strokeWidth={1}
          />
        </g>
      );
    case 'double':
      return (
        <g key={id} opacity={opacity}>
          <ellipse
            cx={cx}
            cy={cy}
            rx={PIN_HOLE_RX}
            ry={PIN_HOLE_RY}
            fill="none"
            stroke={accent}
            strokeWidth={1}
          />
          <ellipse
            cx={cx}
            cy={cy}
            rx={PIN_HOLE_RX * 0.5}
            ry={PIN_HOLE_RY * 0.5}
            fill="none"
            stroke={accent}
            strokeWidth={0.5}
          />
        </g>
      );
    case 'dashed':
      return (
        <ellipse
          key={id}
          cx={cx}
          cy={cy}
          rx={PIN_HOLE_RX}
          ry={PIN_HOLE_RY}
          fill="none"
          stroke={accent}
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={opacity}
        />
      );
  }
}

function renderDirectionMarker(
  cx: number,
  cy: number,
  accent: string,
  id: string,
): React.ReactNode {
  const size = PIN_HOLE_RX * 0.8;
  return (
    <polygon
      key={id}
      points={`${cx},${cy - size} ${cx + size},${cy + size * 0.5} ${cx - size},${cy + size * 0.5}`}
      fill={accent}
      opacity={0.5}
    />
  );
}

function getPinHolePositions(seg: ScreenSegment): ScreenPoint[] {
  const lengthCU = screenSegmentLengthCU(seg);
  if (lengthCU < PIN_HOLE_SPACING_CU) return [];

  const holeCount = Math.floor(lengthCU / PIN_HOLE_SPACING_CU);
  const positions: ScreenPoint[] = [];

  for (let i = 1; i <= holeCount; i++) {
    const t = (i * PIN_HOLE_SPACING_CU) / lengthCU;
    positions.push({
      x: seg.start.x + (seg.end.x - seg.start.x) * t,
      y: seg.start.y + (seg.end.y - seg.start.y) * t,
    });
  }

  return positions;
}

function renderLiftarmSegment(
  seg: ScreenSegment,
  colors: ConnectorColors,
  pinHoleStyle: PinHoleStyle,
  segId: string,
  isLastSegment: boolean,
): React.ReactNode {
  const topFace = buildBeamTopFace(seg);
  const sideFace = buildBeamSideFace(seg, BEAM_THICKNESS_PX);
  const frontFace = buildBeamFrontFace(seg, BEAM_THICKNESS_PX);

  const pinHoles = getPinHolePositions(seg);

  return (
    <g key={segId} pointerEvents="none" data-connector-segment data-direction={seg.direction}>
      <polygon points={sideFace} fill={colors.leftSideColor} />
      <polygon points={frontFace} fill={colors.rightSideColor} />
      <polygon
        points={topFace}
        fill={colors.topFaceColor}
        stroke={colors.topFaceStroke}
        strokeWidth={0.5}
      />
      {pinHoles.map((pos, i) => {
        const isLast = isLastSegment && i === pinHoles.length - 1;
        if (isLast) {
          return renderDirectionMarker(pos.x, pos.y, colors.accent, `${segId}-dir`);
        }
        return renderPinHole(pos.x, pos.y, pinHoleStyle, colors.accent, `${segId}-hole-${i}`);
      })}
    </g>
  );
}

function renderElbowJoint(
  elbowScreen: ScreenPoint,
  colors: ConnectorColors,
  pinHoleStyle: PinHoleStyle,
  id: string,
): React.ReactNode {
  const hw = LEGACY_BEAM_HALF_THICKNESS;

  const topFace = [
    `${elbowScreen.x - hw},${elbowScreen.y - hw}`,
    `${elbowScreen.x + hw},${elbowScreen.y - hw}`,
    `${elbowScreen.x + hw},${elbowScreen.y + hw}`,
    `${elbowScreen.x - hw},${elbowScreen.y + hw}`,
  ].join(' ');

  const rightSide = [
    `${elbowScreen.x + hw},${elbowScreen.y - hw}`,
    `${elbowScreen.x + hw},${elbowScreen.y + hw}`,
    `${elbowScreen.x + hw},${elbowScreen.y + hw + BEAM_THICKNESS_PX}`,
    `${elbowScreen.x + hw},${elbowScreen.y - hw + BEAM_THICKNESS_PX}`,
  ].join(' ');

  const bottomSide = [
    `${elbowScreen.x - hw},${elbowScreen.y + hw}`,
    `${elbowScreen.x + hw},${elbowScreen.y + hw}`,
    `${elbowScreen.x + hw},${elbowScreen.y + hw + BEAM_THICKNESS_PX}`,
    `${elbowScreen.x - hw},${elbowScreen.y + hw + BEAM_THICKNESS_PX}`,
  ].join(' ');

  return (
    <g key={id} pointerEvents="none" data-connector-elbow>
      <polygon points={bottomSide} fill={colors.leftSideColor} />
      <polygon points={rightSide} fill={colors.rightSideColor} />
      <polygon
        points={topFace}
        fill={colors.topFaceColor}
        stroke={colors.topFaceStroke}
        strokeWidth={0.5}
      />
      {renderPinHole(elbowScreen.x, elbowScreen.y, pinHoleStyle, colors.accent, `${id}-hole`)}
    </g>
  );
}

function buildHitPath(route: ReturnType<typeof computeWorldRoute>): string {
  if (route.segments.length === 0) return '';
  let d = `M ${route.segments[0].start.x} ${route.segments[0].start.y}`;
  for (const seg of route.segments) {
    d += ` L ${seg.end.x} ${seg.end.y}`;
  }
  return d;
}

function pointsToPolygon(points: readonly ScreenPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: rendering component with dual path requires unified control flow
export const BrickConnector = memo(function BrickConnector({
  connection,
  blocks,
  plates,
  externalActors,
  originX,
  originY,
}: BrickConnectorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const drawInRef = useRef<SVGPathElement>(null);
  const studId = useId().replace(/:/g, '_');

  useEffect(() => {
    const el = drawInRef.current;
    if (!el || typeof el.getTotalLength !== 'function') return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.getBoundingClientRect();
    el.style.animation = `connector-draw-in 400ms var(--easing-default, cubic-bezier(0.2, 0, 0, 1)) forwards`;
    const handleEnd = () => {
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
  const showStuds = useUIStore((s) => s.showStuds);

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
    () => getConnectionSurfaceRoute(connection, blocks, plates, endpointsList, externalActors),
    [connection, blocks, plates, endpointsList, externalActors],
  );

  const fallbackEndpoints = useMemo(
    () =>
      surfaceRoute
        ? null
        : getConnectionEndpointWorldAnchors(
            connection,
            blocks,
            plates,
            endpointsList,
            externalActors,
          ),
    [surfaceRoute, connection, blocks, plates, endpointsList, externalActors],
  );

  const fallbackRoute = useMemo(() => {
    if (!fallbackEndpoints) return null;
    const r = computeWorldRoute(fallbackEndpoints.src, fallbackEndpoints.tgt, originX, originY);
    if (fallbackEndpoints.srcSide === 'outbound') {
      r.srcScreen = { x: r.srcScreen.x + PORT_OUT_PX, y: r.srcScreen.y };
    } else if (fallbackEndpoints.srcSide === 'inbound') {
      r.srcScreen = { x: r.srcScreen.x - PORT_OUT_PX, y: r.srcScreen.y };
    }
    if (fallbackEndpoints.tgtSide === 'inbound') {
      r.tgtScreen = { x: r.tgtScreen.x - PORT_OUT_PX, y: r.tgtScreen.y };
    } else if (fallbackEndpoints.tgtSide === 'outbound') {
      r.tgtScreen = { x: r.tgtScreen.x + PORT_OUT_PX, y: r.tgtScreen.y };
    }
    return r;
  }, [fallbackEndpoints, originX, originY]);

  const brickRender = useMemo(() => {
    if (!surfaceRoute) return null;

    const footprintVertices = buildBrickFootprint(surfaceRoute);
    if (footprintVertices.length < 3) {
      return null;
    }

    const topFaceScreen = projectFootprintToScreen(footprintVertices, originX, originY);
    const topY = surfaceRoute.srcPort.surfaceY + CONNECTION_HEIGHT_CU;
    const baseY = surfaceRoute.srcPort.surfaceY;
    const sideFaces = getVisibleSideFaces(footprintVertices, topY, baseY).map((face) => ({
      face: face.face,
      points: face.vertices.map((v) => worldToScreen(v[0], v[1], v[2], originX, originY)) as [
        ScreenPoint,
        ScreenPoint,
        ScreenPoint,
        ScreenPoint,
      ],
    }));

    const hitPoints = getRouteCenterlinePoints(surfaceRoute, originX, originY);
    const hitPath = pointsToPath(hitPoints);
    const studs = sampleStudPositions(surfaceRoute).map((point, index) => {
      const screen = worldToScreen(point[0], point[1], point[2], originX, originY);
      return {
        x: screen.x,
        y: screen.y,
        key: `${connection.id}-stud-${index}`,
      };
    });

    return {
      hitPath,
      labelPos: getLabelPosition(hitPoints),
      topFacePolygon: pointsToPolygon(topFaceScreen),
      sideFaces,
      studs,
    };
  }, [surfaceRoute, originX, originY, connection.id]);

  const fallbackRender = useMemo(() => {
    if (!fallbackRoute) return null;
    const hitPath = buildHitPath(fallbackRoute);
    const endpointStuds = [
      { x: fallbackRoute.srcScreen.x, y: fallbackRoute.srcScreen.y, key: `${connection.id}-src` },
      { x: fallbackRoute.tgtScreen.x, y: fallbackRoute.tgtScreen.y, key: `${connection.id}-tgt` },
    ];

    return {
      hitPath,
      labelPos: fallbackRoute.elbow ?? {
        x:
          (fallbackRoute.segments[0].start.x +
            fallbackRoute.segments[fallbackRoute.segments.length - 1].end.x) /
          2,
        y:
          (fallbackRoute.segments[0].start.y +
            fallbackRoute.segments[fallbackRoute.segments.length - 1].end.y) /
          2,
      },
      endpointStuds,
      segments: fallbackRoute.segments,
      elbow: fallbackRoute.elbow,
    };
  }, [fallbackRoute, connection.id]);

  if (!brickRender && !fallbackRender) return null;

  const colors = getColors(renderSemantic, diffState, isHighlighted);
  const hitPath = brickRender?.hitPath ?? fallbackRender?.hitPath ?? '';
  const labelPos = brickRender?.labelPos ?? fallbackRender?.labelPos;
  const fallbackPinHoleStyle = LEGACY_PIN_HOLE_STYLE[renderSemantic];
  const studColors = {
    main: colors.studMain,
    shadow: colors.studShadow,
    highlight: colors.studHighlight,
  };

  const handleClick = (e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation();
    if (toolMode === 'delete') {
      removeConnection(connection.id);
      return;
    }
    setSelectedId(connection.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
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
    <g
      opacity={colors.opacity}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`connection ${connection.id}`}
      data-connector-type={(connection.metadata?.type as string) ?? semantic}
    >
      {showStuds && <StudDefs studId={studId} studColors={studColors} />}

      <path
        d={hitPath}
        stroke="transparent"
        strokeWidth={HIT_AREA_WIDTH}
        fill="none"
        pointerEvents="stroke"
        data-testid="connection-hit-area"
      />

      {isSelected && (
        <>
          {brickRender && (
            <polygon
              points={brickRender.topFacePolygon}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4}
              strokeOpacity={0.5}
              strokeLinejoin="round"
              pointerEvents="none"
              data-layer="selection-outline"
            />
          )}
          {!brickRender && (
            <path
              d={hitPath}
              stroke="#ffffff"
              strokeWidth={LEGACY_BEAM_HALF_THICKNESS * 2 + 4}
              strokeOpacity={0.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              pointerEvents="none"
              data-layer="selection-outline"
            />
          )}
        </>
      )}

      <g data-layer="side-faces" pointerEvents="none">
        {brickRender
          ? brickRender.sideFaces.map((quad, i) => (
              <polygon
                key={`${connection.id}-side-${i}`}
                points={pointsToPolygon(quad.points)}
                fill={quad.face === 'left' ? colors.leftSideColor : colors.rightSideColor}
              />
            ))
          : fallbackRender?.segments.map((seg, i) =>
              renderLiftarmSegment(
                seg,
                colors,
                fallbackPinHoleStyle,
                `seg-${connection.id}-${i}`,
                i === fallbackRender.segments.length - 1,
              ),
            )}
        {!brickRender && fallbackRender?.elbow
          ? renderElbowJoint(
              fallbackRender.elbow,
              colors,
              fallbackPinHoleStyle,
              `elbow-${connection.id}`,
            )
          : null}
      </g>

      <g data-layer="top-face" pointerEvents="none">
        {brickRender && (
          <polygon
            points={brickRender.topFacePolygon}
            fill={colors.topFaceColor}
            stroke={colors.topFaceStroke}
            strokeWidth={1}
          />
        )}
      </g>

      {showStuds && (
        <g data-layer="studs" pointerEvents="none">
          <StudGrid
            studId={studId}
            studs={brickRender?.studs ?? fallbackRender?.endpointStuds ?? []}
          />
        </g>
      )}

      <path
        ref={drawInRef}
        d={hitPath}
        stroke={colors.topFaceColor}
        strokeWidth={DRAW_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pointerEvents="none"
        opacity={0.6}
        data-testid="connection-draw-path"
      />

      <path
        d={hitPath}
        stroke={colors.topFaceColor}
        strokeWidth={DRAW_STROKE_WIDTH}
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
                fill="#ffffff"
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
