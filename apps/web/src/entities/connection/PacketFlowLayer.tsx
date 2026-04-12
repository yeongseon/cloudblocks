import { memo, useMemo } from 'react';
import type { ScreenPoint } from '../../shared/utils/isometric';
import { useAnimationClock } from '../../shared/hooks/useAnimationClock';
import {
  IDLE_SPEED_MULTIPLIER,
  PACKET_COLOR,
  PACKET_LENGTH,
  PACKET_OPACITY,
  PACKET_SPEED_MS,
  PACKET_TAIL_LENGTH,
  PACKET_WIDTH,
} from './packetFlowTokens';
import { getPacketCount, getPositionAtDistance } from './packetFlowHelpers';
import type { PacketFlowMode, SegmentMetric } from './packetFlowHelpers';

interface PacketFlowLayerProps {
  hitPoints: ScreenPoint[];
  mode: PacketFlowMode;
  connectionType: string;
  strokeColor: string;
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
  const effectiveSpeed =
    mode === 'idle' ? PACKET_SPEED_MS / IDLE_SPEED_MULTIPLIER : PACKET_SPEED_MS;

  return (
    <g pointerEvents="none" data-testid="packet-flow-layer" data-connection-type={connectionType}>
      {Array.from({ length: packetCount }, (_, index) => {
        const phaseOffset = (index / packetCount) * effectiveSpeed;
        const rawProgress = (elapsed + phaseOffset) / effectiveSpeed;

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
              fill={packetColor}
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
