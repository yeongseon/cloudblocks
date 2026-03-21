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
import type { ConnectorTheme, BeamShape } from './connectorTheme';
import type { RouteSegment } from './routing';

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

const BEAM_HALF_WIDTH = 8;
const BEAM_THICKNESS = 6;
const WIDE_HALF_WIDTH = 12;
const RAIL_HALF_WIDTH = 3;
const RAIL_GAP = 4;
const SEGMENT_CHUNK_LENGTH = 20;
const SEGMENT_GAP = 4;
const ZIGZAG_AMPLITUDE = 6;
const ZIGZAG_WAVELENGTH = 16;
const ARROW_LENGTH = 12;
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

function buildBeamFaces(
  start: ScreenPoint,
  end: ScreenPoint,
  halfWidth: number,
  thickness: number,
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
    `${p3.x},${p3.y + thickness}`,
    `${p4.x},${p4.y + thickness}`,
  ].join(' ');

  const frontSide = [
    `${p2.x},${p2.y}`,
    `${p3.x},${p3.y}`,
    `${p3.x},${p3.y + thickness}`,
    `${p2.x},${p2.y + thickness}`,
  ].join(' ');

  return { top, rightSide, frontSide };
}

function renderStandardBeam(
  seg: RouteSegment,
  colors: BeamColors,
  segId: string,
): React.ReactNode {
  const faces = buildBeamFaces(seg.start, seg.end, BEAM_HALF_WIDTH, BEAM_THICKNESS);
  return (
    <g key={segId} pointerEvents="none" data-beam="standard">
      <polygon points={faces.frontSide} fill={colors.dark} />
      <polygon points={faces.rightSide} fill={colors.shadow} />
      <polygon points={faces.top} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
    </g>
  );
}

function renderDoubleRailBeam(
  seg: RouteSegment,
  colors: BeamColors,
  segId: string,
): React.ReactNode {
  const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);
  const offset = RAIL_GAP + RAIL_HALF_WIDTH;

  const rail1Start = { x: seg.start.x + perpX * offset, y: seg.start.y + perpY * offset };
  const rail1End = { x: seg.end.x + perpX * offset, y: seg.end.y + perpY * offset };
  const rail2Start = { x: seg.start.x - perpX * offset, y: seg.start.y - perpY * offset };
  const rail2End = { x: seg.end.x - perpX * offset, y: seg.end.y - perpY * offset };

  const faces1 = buildBeamFaces(rail1Start, rail1End, RAIL_HALF_WIDTH, BEAM_THICKNESS);
  const faces2 = buildBeamFaces(rail2Start, rail2End, RAIL_HALF_WIDTH, BEAM_THICKNESS);

  return (
    <g key={segId} pointerEvents="none" data-beam="doubleRail">
      <polygon points={faces1.frontSide} fill={colors.dark} />
      <polygon points={faces1.rightSide} fill={colors.shadow} />
      <polygon points={faces1.top} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
      <polygon points={faces2.frontSide} fill={colors.dark} />
      <polygon points={faces2.rightSide} fill={colors.shadow} />
      <polygon points={faces2.top} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
    </g>
  );
}

function renderSegmentedBeam(
  seg: RouteSegment,
  colors: BeamColors,
  segId: string,
): React.ReactNode {
  const len = segmentLength(seg);
  if (len < 1) return null;

  const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const chunkCount = Math.max(1, Math.round(len / SEGMENT_CHUNK_LENGTH));
  const totalGaps = Math.max(0, chunkCount - 1) * SEGMENT_GAP;
  const chunkLen = (len - totalGaps) / chunkCount;
  const chunks: React.ReactNode[] = [];

  let cursor = 0;
  for (let i = 0; i < chunkCount; i++) {
    const chunkStart = {
      x: seg.start.x + cos * cursor,
      y: seg.start.y + sin * cursor,
    };
    const chunkEnd = {
      x: seg.start.x + cos * (cursor + chunkLen),
      y: seg.start.y + sin * (cursor + chunkLen),
    };
    const faces = buildBeamFaces(chunkStart, chunkEnd, BEAM_HALF_WIDTH, BEAM_THICKNESS);
    chunks.push(
      <g key={`${segId}-chunk-${i}`}>
        <polygon points={faces.frontSide} fill={colors.dark} />
        <polygon points={faces.rightSide} fill={colors.shadow} />
        <polygon points={faces.top} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
      </g>,
    );
    cursor += chunkLen + SEGMENT_GAP;
  }

  return (
    <g key={segId} pointerEvents="none" data-beam="segmented">
      {chunks}
    </g>
  );
}

function renderWideBeam(
  seg: RouteSegment,
  colors: BeamColors,
  segId: string,
): React.ReactNode {
  const faces = buildBeamFaces(seg.start, seg.end, WIDE_HALF_WIDTH, BEAM_THICKNESS);
  return (
    <g key={segId} pointerEvents="none" data-beam="wide">
      <polygon points={faces.frontSide} fill={colors.dark} />
      <polygon points={faces.rightSide} fill={colors.shadow} />
      <polygon points={faces.top} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
    </g>
  );
}

function renderZigzagBeam(
  seg: RouteSegment,
  colors: BeamColors,
  segId: string,
): React.ReactNode {
  const len = segmentLength(seg);
  if (len < 1) return null;

  const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const perpX = -sin;
  const perpY = cos;

  const steps = Math.max(2, Math.floor(len / ZIGZAG_WAVELENGTH) * 2);
  const zigSegments: React.ReactNode[] = [];

  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const offset0 = (i % 2 === 0 ? 1 : -1) * ZIGZAG_AMPLITUDE;
    const offset1 = (i % 2 === 0 ? -1 : 1) * ZIGZAG_AMPLITUDE;

    const zStart = {
      x: seg.start.x + cos * len * t0 + perpX * offset0,
      y: seg.start.y + sin * len * t0 + perpY * offset0,
    };
    const zEnd = {
      x: seg.start.x + cos * len * t1 + perpX * offset1,
      y: seg.start.y + sin * len * t1 + perpY * offset1,
    };

    const faces = buildBeamFaces(zStart, zEnd, RAIL_HALF_WIDTH, BEAM_THICKNESS);
    zigSegments.push(
      <g key={`${segId}-zig-${i}`}>
        <polygon points={faces.frontSide} fill={colors.dark} />
        <polygon points={faces.rightSide} fill={colors.shadow} />
        <polygon points={faces.top} fill={colors.tile} stroke={colors.shadow} strokeWidth={0.5} />
      </g>,
    );
  }

  return (
    <g key={segId} pointerEvents="none" data-beam="zigzag">
      {zigSegments}
    </g>
  );
}

function renderBeamSegment(
  beamShape: BeamShape,
  seg: RouteSegment,
  colors: BeamColors,
  segId: string,
): React.ReactNode {
  switch (beamShape) {
    case 'standard':
      return renderStandardBeam(seg, colors, segId);
    case 'doubleRail':
      return renderDoubleRailBeam(seg, colors, segId);
    case 'segmented':
      return renderSegmentedBeam(seg, colors, segId);
    case 'wide':
      return renderWideBeam(seg, colors, segId);
    case 'zigzag':
      return renderZigzagBeam(seg, colors, segId);
  }
}

function getBeamHalfWidth(beamShape: BeamShape): number {
  switch (beamShape) {
    case 'wide':
      return WIDE_HALF_WIDTH;
    case 'doubleRail':
      return RAIL_GAP + RAIL_HALF_WIDTH * 2;
    default:
      return BEAM_HALF_WIDTH;
  }
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
  const beamHW = getBeamHalfWidth(theme.beamShape);

  const lastSeg = route.segments[route.segments.length - 1];
  const arrowAngle = segmentAngle(lastSeg);
  const arrowPoints = buildArrowPoints(lastSeg.end, arrowAngle, beamHW);

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
      data-beam-shape={theme.beamShape}
    >
      {isSelected && (
        <path
          d={hitPath}
          stroke="#ffffff"
          strokeWidth={beamHW * 2 + 4}
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
        renderBeamSegment(
          theme.beamShape,
          seg,
          colors,
          `seg-${connection.id}-${i}`,
        ),
      )}

      {route.elbows.map((elbow, i) => {
        const elbowPts = [
          `${elbow.x - beamHW},${elbow.y}`,
          `${elbow.x},${elbow.y - beamHW / 2}`,
          `${elbow.x + beamHW},${elbow.y}`,
          `${elbow.x},${elbow.y + beamHW / 2}`,
        ].join(' ');
        return (
          <g key={`elbow-${connection.id}-${i}`} pointerEvents="none" data-elbow>
            <polygon
              points={elbowPts}
              fill={colors.tile}
              stroke={colors.shadow}
              strokeWidth={0.5}
            />
            <polygon
              points={[
                `${elbow.x + beamHW},${elbow.y}`,
                `${elbow.x},${elbow.y + beamHW / 2}`,
                `${elbow.x},${elbow.y + beamHW / 2 + BEAM_THICKNESS}`,
                `${elbow.x + beamHW},${elbow.y + BEAM_THICKNESS}`,
              ].join(' ')}
              fill={colors.shadow}
            />
            <polygon
              points={[
                `${elbow.x},${elbow.y + beamHW / 2}`,
                `${elbow.x - beamHW},${elbow.y}`,
                `${elbow.x - beamHW},${elbow.y + BEAM_THICKNESS}`,
                `${elbow.x},${elbow.y + beamHW / 2 + BEAM_THICKNESS}`,
              ].join(' ')}
              fill={colors.dark}
            />
          </g>
        );
      })}

      <g pointerEvents="none">
        <polygon
          points={arrowPoints}
          fill={colors.tile}
          stroke={colors.shadow}
          strokeWidth={0.5}
        />
        <polygon
          points={(() => {
            const tipX = lastSeg.end.x + Math.cos(arrowAngle) * ARROW_LENGTH;
            const tipY = lastSeg.end.y + Math.sin(arrowAngle) * ARROW_LENGTH;
            const perpX = -Math.sin(arrowAngle) * beamHW;
            const perpY = Math.cos(arrowAngle) * beamHW;
            const baseRight = { x: lastSeg.end.x - perpX, y: lastSeg.end.y - perpY };
            return `${baseRight.x},${baseRight.y} ${tipX},${tipY} ${tipX},${tipY + BEAM_THICKNESS} ${baseRight.x},${baseRight.y + BEAM_THICKNESS}`;
          })()}
          fill={colors.shadow}
        />
      </g>

      {renderStud(route.srcScreen.x, route.srcScreen.y, colors, `stud-src-${connection.id}`)}
      {renderStud(route.tgtScreen.x, route.tgtScreen.y, colors, `stud-tgt-${connection.id}`)}
    </g>
  );
});
