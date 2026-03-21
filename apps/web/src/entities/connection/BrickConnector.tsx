import { memo, useState, useMemo } from 'react';
import type { Connection, Block, Plate, ExternalActor } from '@cloudblocks/schema';
import { getDiffState } from '../../features/diff/engine';
import { getEndpointWorldPosition } from '../../shared/utils/position';
import { worldToScreen } from '../../shared/utils/isometric';
import type { ScreenPoint } from '../../shared/utils/isometric';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import {
  TILE_W, TILE_H,
  BEAM_WIDTH_CU, BEAM_THICKNESS_PX,
  PIN_HOLE_SPACING_CU, PIN_HOLE_RX, PIN_HOLE_RY,
  STUD_RX, STUD_RY, STUD_HEIGHT, STUD_INNER_RX, STUD_INNER_RY, STUD_INNER_OPACITY,
} from '../../shared/tokens/designTokens';
import { CONNECTOR_THEMES, DIFF_THEMES, lightenColor } from './connectorTheme';
import { computeWorldRoute, worldSegmentToScreen, worldSegmentLengthCU } from './routing';
import type { ConnectorTheme, PinHoleStyle } from './connectorTheme';
import type { WorldSegment } from './routing';

interface BrickConnectorProps {
  connection: Connection;
  blocks: Block[];
  plates: Plate[];
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

const BEAM_HALF_W_X = TILE_W / 2 * BEAM_WIDTH_CU / 2;
const BEAM_HALF_W_Y = TILE_H / 2 * BEAM_WIDTH_CU / 2;
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

function buildIsoBeamTopFace(
  startScreen: ScreenPoint,
  endScreen: ScreenPoint,
  axis: 'x' | 'z',
): string {
  const hw = axis === 'x'
    ? { dx: 0, dy: -BEAM_HALF_W_Y, dx2: 0, dy2: BEAM_HALF_W_Y }
    : { dx: -BEAM_HALF_W_X, dy: 0, dx2: BEAM_HALF_W_X, dy2: 0 };

  const p1 = { x: startScreen.x + hw.dx, y: startScreen.y + hw.dy };
  const p2 = { x: startScreen.x + hw.dx2, y: startScreen.y + hw.dy2 };
  const p3 = { x: endScreen.x + hw.dx2, y: endScreen.y + hw.dy2 };
  const p4 = { x: endScreen.x + hw.dx, y: endScreen.y + hw.dy };

  return `${p1.x},${p1.y} ${p4.x},${p4.y} ${p3.x},${p3.y} ${p2.x},${p2.y}`;
}

function buildIsoBeamSideFace(
  startScreen: ScreenPoint,
  endScreen: ScreenPoint,
  axis: 'x' | 'z',
  thickness: number,
): string {
  if (axis === 'x') {
    const p1 = { x: startScreen.x, y: startScreen.y + BEAM_HALF_W_Y };
    const p2 = { x: endScreen.x, y: endScreen.y + BEAM_HALF_W_Y };
    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p2.x},${p2.y + thickness} ${p1.x},${p1.y + thickness}`;
  }
  const p1 = { x: startScreen.x + BEAM_HALF_W_X, y: startScreen.y };
  const p2 = { x: endScreen.x + BEAM_HALF_W_X, y: endScreen.y };
  return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p2.x},${p2.y + thickness} ${p1.x},${p1.y + thickness}`;
}

function buildIsoBeamFrontFace(
  endScreen: ScreenPoint,
  axis: 'x' | 'z',
  thickness: number,
): string {
  if (axis === 'x') {
    const left = { x: endScreen.x, y: endScreen.y - BEAM_HALF_W_Y };
    const right = { x: endScreen.x, y: endScreen.y + BEAM_HALF_W_Y };
    return `${left.x},${left.y} ${right.x},${right.y} ${right.x},${right.y + thickness} ${left.x},${left.y + thickness}`;
  }
  const left = { x: endScreen.x - BEAM_HALF_W_X, y: endScreen.y };
  const right = { x: endScreen.x + BEAM_HALF_W_X, y: endScreen.y };
  return `${left.x},${left.y} ${right.x},${right.y} ${right.x},${right.y + thickness} ${left.x},${left.y + thickness}`;
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

function getPinHolePositions(
  seg: WorldSegment,
  startScreen: ScreenPoint,
  endScreen: ScreenPoint,
): ScreenPoint[] {
  const lengthCU = worldSegmentLengthCU(seg);
  if (lengthCU < PIN_HOLE_SPACING_CU) return [];

  const holeCount = Math.floor(lengthCU / PIN_HOLE_SPACING_CU);
  const positions: ScreenPoint[] = [];

  for (let i = 1; i <= holeCount; i++) {
    const t = (i * PIN_HOLE_SPACING_CU) / lengthCU;
    positions.push({
      x: startScreen.x + (endScreen.x - startScreen.x) * t,
      y: startScreen.y + (endScreen.y - startScreen.y) * t,
    });
  }

  return positions;
}

function renderLiftarmSegment(
  seg: WorldSegment,
  colors: BeamColors,
  pinHoleStyle: PinHoleStyle,
  originX: number,
  originY: number,
  segId: string,
  isLastSegment: boolean,
): React.ReactNode {
  const { start: startScreen, end: endScreen } = worldSegmentToScreen(seg, originX, originY);

  const topFace = buildIsoBeamTopFace(startScreen, endScreen, seg.axis);
  const sideFace = buildIsoBeamSideFace(startScreen, endScreen, seg.axis, BEAM_THICKNESS_PX);
  const frontFace = buildIsoBeamFrontFace(endScreen, seg.axis, BEAM_THICKNESS_PX);

  const pinHoles = getPinHolePositions(seg, startScreen, endScreen);

  return (
    <g key={segId} pointerEvents="none" data-connector-segment data-axis={seg.axis}>
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
  const hw = TILE_W / 2 * 0.5;
  const hh = TILE_H / 2 * 0.5;

  const diamond = `${elbowScreen.x},${elbowScreen.y - hh} ${elbowScreen.x + hw},${elbowScreen.y} ${elbowScreen.x},${elbowScreen.y + hh} ${elbowScreen.x - hw},${elbowScreen.y}`;

  const rightSide = [
    `${elbowScreen.x + hw},${elbowScreen.y}`,
    `${elbowScreen.x},${elbowScreen.y + hh}`,
    `${elbowScreen.x},${elbowScreen.y + hh + BEAM_THICKNESS_PX}`,
    `${elbowScreen.x + hw},${elbowScreen.y + BEAM_THICKNESS_PX}`,
  ].join(' ');

  const frontSide = [
    `${elbowScreen.x},${elbowScreen.y + hh}`,
    `${elbowScreen.x - hw},${elbowScreen.y}`,
    `${elbowScreen.x - hw},${elbowScreen.y + BEAM_THICKNESS_PX}`,
    `${elbowScreen.x},${elbowScreen.y + hh + BEAM_THICKNESS_PX}`,
  ].join(' ');

  return (
    <g key={id} pointerEvents="none" data-connector-elbow>
      <polygon points={frontSide} fill={colors.dark} />
      <polygon points={rightSide} fill={colors.shadow} />
      <polygon points={diamond} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
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

function buildHitPath(
  route: ReturnType<typeof computeWorldRoute>,
  originX: number,
  originY: number,
): string {
  if (route.segments.length === 0) return '';
  const first = worldSegmentToScreen(route.segments[0], originX, originY);
  let d = `M ${first.start.x} ${first.start.y}`;
  for (const seg of route.segments) {
    const screen = worldSegmentToScreen(seg, originX, originY);
    d += ` L ${screen.end.x} ${screen.end.y}`;
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

  const src = getEndpointWorldPosition(connection.sourceId, blocks, plates, externalActors);
  const tgt = getEndpointWorldPosition(connection.targetId, blocks, plates, externalActors);

  const theme = CONNECTOR_THEMES[connection.type];
  const diffState = diffMode && diffDelta ? getDiffState(connection.id, diffDelta) : 'unchanged';
  const isSelected = selectedId === connection.id;
  const isHighlighted = isHovered || isSelected;

  const route = useMemo(() => {
    if (!src || !tgt) return null;
    return computeWorldRoute(src, tgt, originX, originY);
  }, [src, tgt, originX, originY]);

  if (!src || !tgt || !route) return null;

  const colors = getColors(theme, diffState, isHighlighted);
  const hitPath = buildHitPath(route, originX, originY);

  const elbowScreen = route.elbow
    ? worldToScreen(route.elbow.worldX, route.elbow.worldY, route.elbow.worldZ, originX, originY)
    : null;

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
          strokeWidth={BEAM_HALF_W_X * 2 + 4}
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
          originX,
          originY,
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
