import { memo, useState, useMemo } from 'react';
import type { Connection, Block, Plate, ExternalActor } from '@cloudblocks/schema';
import { getDiffState } from '../../features/diff/engine';
import { getEndpointWorldPosition } from '../../shared/utils/position';
import { worldToScreen } from '../../shared/utils/isometric';
import type { ScreenPoint } from '../../shared/utils/isometric';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { STUD_RX, STUD_RY, STUD_HEIGHT, STUD_INNER_RX, STUD_INNER_RY, STUD_INNER_OPACITY } from '../../shared/tokens/designTokens';
import { CONNECTOR_THEMES, DIFF_THEMES, lightenColor } from './connectorTheme';
import { computeRoute, segmentAngle, segmentLength } from './routing';
import type { ConnectorTheme } from './connectorTheme';
import type { RouteSegment } from './routing';

interface BrickConnectorProps {
  connection: Connection;
  blocks: Block[];
  plates: Plate[];
  externalActors: ExternalActor[];
  originX: number;
  originY: number;
}

const TILE_HALF_WIDTH = 8;
const TILE_THICKNESS = 3;
const ARROW_LENGTH = 12;
const HIT_AREA_WIDTH = 16;

function getColors(
  theme: ConnectorTheme,
  diffState: string,
  isHighlighted: boolean,
): { tile: string; shadow: string; dark: string; accent: string; opacity: number } {
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

function buildTilePoints(
  start: ScreenPoint,
  end: ScreenPoint,
  halfWidth: number,
): { top: string; rightSide: string; frontSide: string } {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const perpX = -Math.sin(angle) * halfWidth;
  const perpY = Math.cos(angle) * halfWidth;

  const p1 = { x: start.x + perpX, y: start.y + perpY };
  const p2 = { x: start.x - perpX, y: start.y - perpY };
  const p3 = { x: end.x - perpX, y: end.y - perpY };
  const p4 = { x: end.x + perpX, y: end.y + perpY };

  const top = `${p1.x},${p1.y} ${p4.x},${p4.y} ${p3.x},${p3.y} ${p2.x},${p2.y}`;

  const rightSide = [
    `${p4.x},${p4.y}`,
    `${p3.x},${p3.y}`,
    `${p3.x},${p3.y + TILE_THICKNESS}`,
    `${p4.x},${p4.y + TILE_THICKNESS}`,
  ].join(' ');

  const frontSide = [
    `${p2.x},${p2.y}`,
    `${p3.x},${p3.y}`,
    `${p3.x},${p3.y + TILE_THICKNESS}`,
    `${p2.x},${p2.y + TILE_THICKNESS}`,
  ].join(' ');

  return { top, rightSide, frontSide };
}

function buildArrowPoints(
  end: ScreenPoint,
  angle: number,
  halfWidth: number,
): string {
  const tipX = end.x + Math.cos(angle) * ARROW_LENGTH;
  const tipY = end.y + Math.sin(angle) * ARROW_LENGTH;
  const perpX = -Math.sin(angle) * halfWidth;
  const perpY = Math.cos(angle) * halfWidth;
  const baseLeft = { x: end.x + perpX, y: end.y + perpY };
  const baseRight = { x: end.x - perpX, y: end.y - perpY };

  return `${baseLeft.x},${baseLeft.y} ${tipX},${tipY} ${baseRight.x},${baseRight.y}`;
}

function buildHitPath(segments: RouteSegment[]): string {
  if (segments.length === 0) return '';
  let d = `M ${segments[0].start.x} ${segments[0].start.y}`;
  for (const seg of segments) {
    d += ` L ${seg.end.x} ${seg.end.y}`;
  }
  return d;
}

function renderPattern(
  pattern: ConnectorTheme['pattern'],
  start: ScreenPoint,
  end: ScreenPoint,
  accent: string,
  segId: string,
): React.ReactNode {
  if (pattern === 'solid') return null;

  const len = segmentLength({ start, end });
  if (len < 10) return null;

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const inset = 4;
  const sx = start.x + cos * inset;
  const sy = start.y + sin * inset;
  const ex = end.x - cos * inset;
  const ey = end.y - sin * inset;

  const commonProps = {
    stroke: accent,
    strokeWidth: 1,
    opacity: 0.5,
    fill: 'none' as const,
  };

  switch (pattern) {
    case 'double': {
      const off = 2;
      const px = -sin * off;
      const py = cos * off;
      return (
        <g key={segId}>
          <line x1={sx + px} y1={sy + py} x2={ex + px} y2={ey + py} {...commonProps} />
          <line x1={sx - px} y1={sy - py} x2={ex - px} y2={ey - py} {...commonProps} />
        </g>
      );
    }
    case 'dashed':
      return <line key={segId} x1={sx} y1={sy} x2={ex} y2={ey} {...commonProps} strokeDasharray="4 3" />;
    case 'dotted':
      return <line key={segId} x1={sx} y1={sy} x2={ex} y2={ey} {...commonProps} strokeDasharray="2 3" />;
    case 'zigzag': {
      const steps = Math.max(2, Math.floor(len / 8));
      const pts: string[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const bx = sx + (ex - sx) * t;
        const by = sy + (ey - sy) * t;
        const zigOff = (i % 2 === 0 ? 2.5 : -2.5);
        pts.push(`${bx + (-sin) * zigOff},${by + cos * zigOff}`);
      }
      return <polyline key={segId} points={pts.join(' ')} {...commonProps} />;
    }
    default:
      return null;
  }
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
    const srcScreen = worldToScreen(src[0], src[1], src[2], originX, originY);
    const tgtScreen = worldToScreen(tgt[0], tgt[1], tgt[2], originX, originY);
    return { srcScreen, tgtScreen, ...computeRoute(srcScreen, tgtScreen) };
  }, [src, tgt, originX, originY]);

  if (!src || !tgt || !route) return null;

  const colors = getColors(theme, diffState, isHighlighted);
  const hitPath = buildHitPath(route.segments);

  const lastSeg = route.segments[route.segments.length - 1];
  const arrowAngle = segmentAngle(lastSeg);
  const arrowPoints = buildArrowPoints(lastSeg.end, arrowAngle, TILE_HALF_WIDTH);

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
    >
      {isSelected && (
        <path
          d={hitPath}
          stroke="#ffffff"
          strokeWidth={TILE_HALF_WIDTH * 2 + 4}
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

      {route.segments.map((seg, i) => {
        const pts = buildTilePoints(seg.start, seg.end, TILE_HALF_WIDTH);
        return (
          <g key={`seg-${connection.id}-${i}`} pointerEvents="none">
            <polygon points={pts.frontSide} fill={colors.dark} />
            <polygon points={pts.rightSide} fill={colors.shadow} />
            <polygon points={pts.top} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
            {renderPattern(theme.pattern, seg.start, seg.end, colors.accent, `pat-${connection.id}-${i}`)}
          </g>
        );
      })}

      {route.elbows.map((elbow, i) => {
        const elbowPts = [
          `${elbow.x - TILE_HALF_WIDTH},${elbow.y}`,
          `${elbow.x},${elbow.y - TILE_HALF_WIDTH / 2}`,
          `${elbow.x + TILE_HALF_WIDTH},${elbow.y}`,
          `${elbow.x},${elbow.y + TILE_HALF_WIDTH / 2}`,
        ].join(' ');
        return (
          <polygon
            key={`elbow-${connection.id}-${i}`}
            points={elbowPts}
            fill={colors.tile}
            stroke={colors.shadow}
            strokeWidth={0.5}
            pointerEvents="none"
          />
        );
      })}

      <polygon
        points={arrowPoints}
        fill={colors.tile}
        stroke={colors.shadow}
        strokeWidth={0.5}
        pointerEvents="none"
      />

      {renderStud(route.srcScreen.x, route.srcScreen.y, colors, `stud-src-${connection.id}`)}
      {renderStud(route.tgtScreen.x, route.tgtScreen.y, colors, `stud-tgt-${connection.id}`)}
    </g>
  );
});
