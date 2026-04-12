import { memo, useMemo } from 'react';
import type { ScreenPoint } from '../../shared/utils/isometric';
import { useAnimationClock } from '../../shared/hooks/useAnimationClock';
import {
  MEDIUM_PATH_THRESHOLD,
  PACKET_COLOR,
  PACKET_GLOW_COLOR,
  PACKET_LENGTH,
  PACKET_OPACITY,
  PACKET_SPEED_MS,
  PACKET_TAIL_LENGTH,
  PACKET_WIDTH,
  SHORT_PATH_THRESHOLD,
} from './packetFlowTokens';

type PacketFlowMode = 'static' | 'hover' | 'selected' | 'creation';

interface PacketFlowLayerProps {
  hitPoints: ScreenPoint[];
  mode: PacketFlowMode;
  connectionType: string;
  strokeColor: string;
}

interface SegmentMetric {
  start: ScreenPoint;
  dx: number;
  dy: number;
  length: number;
  cumulativeStart: number;
}

interface PacketPosition {
  x: number;
  y: number;
  angle: number;
}

function getPacketCount(totalLength: number, mode: PacketFlowMode): number {
  if (mode === 'static') {
    return 0;
  }

  const baseCount =
    totalLength <= SHORT_PATH_THRESHOLD ? 1 : totalLength <= MEDIUM_PATH_THRESHOLD ? 2 : 3;

  if (mode === 'hover') {
    return Math.max(1, baseCount - 1);
  }

  if (mode === 'creation') {
    return baseCount + 1;
  }

  return baseCount;
}

function getPositionAtDistance(
  segments: readonly SegmentMetric[],
  totalLength: number,
  distance: number,
): PacketPosition | null {
  if (segments.length === 0 || totalLength <= 0) {
    return null;
  }

  const clampedDistance = Math.min(Math.max(distance, 0), totalLength);

  for (const segment of segments) {
    const segmentEnd = segment.cumulativeStart + segment.length;
    if (clampedDistance <= segmentEnd) {
      const localDistance = clampedDistance - segment.cumulativeStart;
      const t = segment.length > 0 ? localDistance / segment.length : 0;
      const x = segment.start.x + segment.dx * t;
      const y = segment.start.y + segment.dy * t;
      const angle = (Math.atan2(segment.dy, segment.dx) * 180) / Math.PI;
      return { x, y, angle };
    }
  }

  const last = segments[segments.length - 1];
  return {
    x: last.start.x + last.dx,
    y: last.start.y + last.dy,
    angle: (Math.atan2(last.dy, last.dx) * 180) / Math.PI,
  };
}

export const PacketFlowLayer = memo(function PacketFlowLayer({
  hitPoints,
  mode,
  connectionType,
  strokeColor,
}: PacketFlowLayerProps) {
  const { elapsed, reducedMotion } = useAnimationClock(mode !== 'static' && hitPoints.length > 1);

  const { segments, totalLength } = useMemo(() => {
    const nextSegments: SegmentMetric[] = [];
    let cumulative = 0;

    for (let index = 0; index < hitPoints.length - 1; index += 1) {
      const start = hitPoints[index];
      const end = hitPoints[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length <= 0) {
        continue;
      }

      nextSegments.push({
        start,
        dx,
        dy,
        length,
        cumulativeStart: cumulative,
      });
      cumulative += length;
    }

    return {
      segments: nextSegments,
      totalLength: cumulative,
    };
  }, [hitPoints]);

  const creationCompleted = mode === 'creation' && elapsed >= PACKET_SPEED_MS;

  if (
    mode === 'static' ||
    reducedMotion ||
    hitPoints.length < 2 ||
    totalLength <= 0 ||
    (mode === 'creation' && creationCompleted)
  ) {
    return null;
  }

  const packetCount = getPacketCount(totalLength, mode);
  const opacity = PACKET_OPACITY[mode];
  const packetColor = strokeColor || PACKET_COLOR;

  return (
    <g pointerEvents="none" data-testid="packet-flow-layer" data-connection-type={connectionType}>
      {Array.from({ length: packetCount }, (_, index) => {
        const phaseOffset = (index / packetCount) * PACKET_SPEED_MS;
        const rawProgress = (elapsed + phaseOffset) / PACKET_SPEED_MS;

        if (mode === 'creation' && rawProgress > 1) {
          return null;
        }

        const progress = mode === 'creation' ? rawProgress : rawProgress % 1;
        const distance = progress * totalLength;
        const position = getPositionAtDistance(segments, totalLength, distance);

        if (!position) {
          return null;
        }

        const halfLen = PACKET_LENGTH / 2;
        const halfWid = PACKET_WIDTH / 2;
        const glowHalfLen = halfLen + 1;
        const glowHalfWid = halfWid + 1;

        return (
          <g
            key={`packet-${phaseOffset}`}
            transform={`translate(${position.x} ${position.y}) rotate(${position.angle})`}
            pointerEvents="none"
            data-testid="packet-flow-packet"
          >
            {/* Glow layer */}
            <path
              d={`M ${-glowHalfLen} 0 Q ${-glowHalfLen} ${-glowHalfWid} 0 ${-glowHalfWid} Q ${glowHalfLen} ${-glowHalfWid} ${glowHalfLen} 0 Q ${glowHalfLen} ${glowHalfWid} 0 ${glowHalfWid} Q ${-glowHalfLen} ${glowHalfWid} ${-glowHalfLen} 0 Z`}
              fill={PACKET_GLOW_COLOR}
              fillOpacity={opacity}
            />
            {/* Capsule body */}
            <path
              d={`M ${-halfLen} ${-halfWid} Q ${-halfLen - halfWid} 0 ${-halfLen} ${halfWid} L ${halfLen} ${halfWid} Q ${halfLen + halfWid} 0 ${halfLen} ${-halfWid} Z`}
              fill={packetColor}
              fillOpacity={opacity}
            />
            {/* Tail trail */}
            <path
              d={`M ${-halfLen} 0 L ${-halfLen - PACKET_TAIL_LENGTH} 0`}
              stroke={packetColor}
              strokeWidth={PACKET_WIDTH * 0.75}
              strokeLinecap="round"
              strokeOpacity={opacity * 0.55}
              fill="none"
            />
          </g>
        );
      })}
    </g>
  );
});
