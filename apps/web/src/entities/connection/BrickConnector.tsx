import { memo, useState, useMemo } from 'react';
import type { Connection, ContainerNode, ExternalActor, LeafNode } from '@cloudblocks/schema';
import { getDiffState } from '../../features/diff/engine';
import { getConnectionEndpointWorldAnchors } from './endpointAnchors';
import type { ScreenPoint } from '../../shared/utils/isometric';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import {
  BEAM_THICKNESS_PX,
  PIN_HOLE_SPACING_CU, PIN_HOLE_RX, PIN_HOLE_RY,
  STUD_RX, STUD_RY, STUD_HEIGHT, STUD_INNER_RX, STUD_INNER_RY, STUD_INNER_OPACITY,
  PORT_OUT_PX,
} from '../../shared/tokens/designTokens';
import { CONNECTOR_THEMES, DIFF_THEMES, lightenColor } from './connectorTheme';
import { computeWorldRoute, screenSegmentLengthCU } from './routing';
import type { ConnectorTheme, PinHoleStyle } from './connectorTheme';
import type { ScreenSegment } from './routing';

interface BrickConnectorProps {
  connection: Connection;
  blocks: LeafNode[];
  plates: ContainerNode[];
  externalActors: ExternalActor[];
  originX: number;
  originY: number;
}

interface BeamColors {
  tile: string;
  shadow: string;
  dark: string;
  accent: string;
  opacity: number;
}

const BEAM_HALF_THICKNESS = 4;
const HIT_AREA_WIDTH = 20;

function getColors(
  theme: ConnectorTheme,
  diffState: string,
  isHighlighted: boolean,
): BeamColors {
  const diffOverride = diffState !== 'unchanged' ? DIFF_THEMES[diffState] : null;

  const baseTile = diffOverride?.tile ?? theme.tile;
  const baseShadow = diffOverride?.shadow ?? theme.shadow;
  const baseDark = diffOverride?.dark ?? theme.dark;
  const baseOpacity = diffOverride?.opacity ?? 1.0;
  const accent = diffState !== 'unchanged' ? '#ffffff' : theme.accent;

  if (isHighlighted) {
    return {
      tile: lightenColor(baseTile, 0.15),
      shadow: lightenColor(baseShadow, 0.1),
      dark: lightenColor(baseDark, 0.1),
      accent,
      opacity: baseOpacity,
    };
  }

  return { tile: baseTile, shadow: baseShadow, dark: baseDark, accent, opacity: baseOpacity };
}

function buildBeamTopFace(seg: ScreenSegment): string {
  const { start: s, end: e, direction } = seg;
  const hw = BEAM_HALF_THICKNESS;

  if (direction === 'screen-v') {
    return `${s.x - hw},${s.y} ${s.x + hw},${s.y} ${e.x + hw},${e.y} ${e.x - hw},${e.y}`;
  }
  return `${s.x},${s.y - hw} ${e.x},${e.y - hw} ${e.x},${e.y + hw} ${s.x},${s.y + hw}`;
}

function buildBeamSideFace(seg: ScreenSegment, thickness: number): string {
  const { start: s, end: e, direction } = seg;
  const hw = BEAM_HALF_THICKNESS;

  if (direction === 'screen-v') {
    return `${s.x + hw},${s.y} ${e.x + hw},${e.y} ${e.x + hw},${e.y + thickness} ${s.x + hw},${s.y + thickness}`;
  }
  return `${s.x},${s.y + hw} ${e.x},${e.y + hw} ${e.x},${e.y + hw + thickness} ${s.x},${s.y + hw + thickness}`;
}

function buildBeamFrontFace(seg: ScreenSegment, thickness: number): string {
  const { end: e, direction } = seg;
  const hw = BEAM_HALF_THICKNESS;

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
        <ellipse key={id} cx={cx} cy={cy} rx={PIN_HOLE_RX} ry={PIN_HOLE_RY}
          fill="none" stroke={accent} strokeWidth={1} opacity={opacity} />
      );
    case 'filled':
      return (
        <ellipse key={id} cx={cx} cy={cy} rx={PIN_HOLE_RX} ry={PIN_HOLE_RY}
          fill={accent} opacity={opacity} />
      );
    case 'cross':
      return (
        <g key={id} opacity={opacity}>
          <line x1={cx - PIN_HOLE_RX} y1={cy} x2={cx + PIN_HOLE_RX} y2={cy}
            stroke={accent} strokeWidth={1} />
          <line x1={cx} y1={cy - PIN_HOLE_RY} x2={cx} y2={cy + PIN_HOLE_RY}
            stroke={accent} strokeWidth={1} />
        </g>
      );
    case 'double':
      return (
        <g key={id} opacity={opacity}>
          <ellipse cx={cx} cy={cy} rx={PIN_HOLE_RX} ry={PIN_HOLE_RY}
            fill="none" stroke={accent} strokeWidth={1} />
          <ellipse cx={cx} cy={cy} rx={PIN_HOLE_RX * 0.5} ry={PIN_HOLE_RY * 0.5}
            fill="none" stroke={accent} strokeWidth={0.5} />
        </g>
      );
    case 'dashed':
      return (
        <ellipse key={id} cx={cx} cy={cy} rx={PIN_HOLE_RX} ry={PIN_HOLE_RY}
          fill="none" stroke={accent} strokeWidth={1} strokeDasharray="2 2" opacity={opacity} />
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
    <polygon key={id}
      points={`${cx},${cy - size} ${cx + size},${cy + size * 0.5} ${cx - size},${cy + size * 0.5}`}
      fill={accent} opacity={0.5} />
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
  colors: BeamColors,
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
      <polygon points={sideFace} fill={colors.dark} />
      <polygon points={frontFace} fill={colors.shadow} />
      <polygon points={topFace} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
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
  colors: BeamColors,
  pinHoleStyle: PinHoleStyle,
  id: string,
): React.ReactNode {
  const hw = BEAM_HALF_THICKNESS;

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
      <polygon points={bottomSide} fill={colors.dark} />
      <polygon points={rightSide} fill={colors.shadow} />
      <polygon points={topFace} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
      {renderPinHole(elbowScreen.x, elbowScreen.y, pinHoleStyle, colors.accent, `${id}-hole`)}
    </g>
  );
}

function renderStud(
  cx: number,
  cy: number,
  colors: { tile: string; shadow: string; accent: string },
  id: string,
): React.ReactNode {
  return (
    <g key={id}>
      <ellipse cx={cx} cy={cy} rx={STUD_RX} ry={STUD_RY} fill={colors.shadow} />
      <ellipse cx={cx} cy={cy - STUD_HEIGHT} rx={STUD_RX} ry={STUD_RY} fill={colors.tile} />
      <ellipse cx={cx} cy={cy - STUD_HEIGHT} rx={STUD_INNER_RX} ry={STUD_INNER_RY} fill={colors.accent} opacity={STUD_INNER_OPACITY} />
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

export const BrickConnector = memo(function BrickConnector({
  connection,
  blocks,
  plates,
  externalActors,
  originX,
  originY,
}: BrickConnectorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);

  const theme = CONNECTOR_THEMES[connection.type];
  const diffState = diffMode && diffDelta ? getDiffState(connection.id, diffDelta) : 'unchanged';
  const isSelected = selectedId === connection.id;
  const isHighlighted = isHovered || isSelected;

  const endpoints = useMemo(
    () => getConnectionEndpointWorldAnchors(connection, blocks, plates, externalActors),
    [connection, blocks, plates, externalActors],
  );

  const route = useMemo(() => {
    if (!endpoints) return null;
    const r = computeWorldRoute(endpoints.src, endpoints.tgt, originX, originY);
    // Apply PORT_OUT_PX screen offset so connectors sit just outside the block face
    if (endpoints.srcSide === 'outbound') {
      r.srcScreen = { x: r.srcScreen.x + PORT_OUT_PX, y: r.srcScreen.y };
    } else if (endpoints.srcSide === 'inbound') {
      r.srcScreen = { x: r.srcScreen.x - PORT_OUT_PX, y: r.srcScreen.y };
    }
    if (endpoints.tgtSide === 'inbound') {
      r.tgtScreen = { x: r.tgtScreen.x - PORT_OUT_PX, y: r.tgtScreen.y };
    } else if (endpoints.tgtSide === 'outbound') {
      r.tgtScreen = { x: r.tgtScreen.x + PORT_OUT_PX, y: r.tgtScreen.y };
    }
    return r;
  }, [endpoints, originX, originY]);

  if (!endpoints || !route) return null;

  const colors = getColors(theme, diffState, isHighlighted);
  const hitPath = buildHitPath(route);

  const elbowScreen = route.elbow ?? null;

  const handleClick = (e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation();
    if (toolMode === 'delete') {
      removeConnection(connection.id);
      return;
    }
    setSelectedId(connection.id);
  };

  return (
    <g
      opacity={colors.opacity}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
      data-connector-type={connection.type}
    >
      {isSelected && (
        <path
          d={hitPath}
          stroke="#ffffff"
          strokeWidth={BEAM_HALF_THICKNESS * 2 + 4}
          strokeOpacity={0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pointerEvents="none"
        />
      )}

      <path
        d={hitPath}
        stroke="transparent"
        strokeWidth={HIT_AREA_WIDTH}
        fill="none"
        pointerEvents="stroke"
        data-testid="connection-hit-area"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {route.segments.map((seg, i) =>
        renderLiftarmSegment(
          seg,
          colors,
          theme.pinHoleStyle,
          `seg-${connection.id}-${i}`,
          i === route.segments.length - 1,
        ),
      )}

      {elbowScreen && renderElbowJoint(
        elbowScreen,
        colors,
        theme.pinHoleStyle,
        `elbow-${connection.id}`,
      )}

      {renderStud(route.srcScreen.x, route.srcScreen.y, colors, `stud-src-${connection.id}`)}
      {renderStud(route.tgtScreen.x, route.tgtScreen.y, colors, `stud-tgt-${connection.id}`)}
    </g>
  );
});
