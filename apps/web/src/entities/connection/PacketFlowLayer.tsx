import { memo, useMemo } from 'react';
import type { ConnectionType } from '@cloudblocks/schema';
import type { ScreenPoint } from '../../shared/utils/isometric';
import { useAnimationClock } from '../../shared/hooks/useAnimationClock';
import {
  IDLE_CYCLE_MS,
  PACKET_COLOR,
  PACKET_LENGTH,
  PACKET_OPACITY,
  PACKET_SPEED_MS,
  PACKET_TAIL_LENGTH,
  PACKET_WIDTH,
  SEMANTIC_PACKET_COLORS,
} from './packetFlowTokens';
import type { PacketColorPair } from './packetFlowTokens';
import { getPacketCount, getPositionAtDistance } from './packetFlowHelpers';
import type { PacketFlowMode, SegmentMetric } from './packetFlowHelpers';

interface PacketFlowLayerProps {
  hitPoints: ScreenPoint[];
  mode: PacketFlowMode;
  connectionType: string;
  strokeColor: string;
  elapsed?: number;
  reducedMotion?: boolean;
}

/** Resolve semantic two-layer colors for a connection type. */
function resolvePacketColors(connectionType: string): PacketColorPair {
  if (connectionType in SEMANTIC_PACKET_COLORS) {
    return SEMANTIC_PACKET_COLORS[connectionType as ConnectionType];
  }
  return { halo: PACKET_COLOR, core: PACKET_COLOR };
}

/** Render static direction chevrons for prefers-reduced-motion users. */
function renderStaticDirectionGlyphs(
  segments: readonly SegmentMetric[],
  totalLength: number,
  colors: PacketColorPair,
): React.ReactElement | null {
  if (segments.length === 0 || totalLength <= 0) return null;

  // Place 1 chevron at 60% for short paths, 2 at 33%/66% for longer paths
  const positions = totalLength <= 120 ? [0.6] : [0.33, 0.66];

  return (
    <>
      {positions.map((fraction) => {
        const distance = fraction * totalLength;
        const pos = getPositionAtDistance(segments, totalLength, distance);
        if (!pos) return null;
        const size = 5;
        return (
          <g
            key={`chevron-${fraction}`}
            transform={`translate(${pos.x} ${pos.y}) rotate(${pos.angle})`}
            pointerEvents="none"
            data-testid="packet-direction-chevron"
          >
            <path
              d={`M ${-size} ${-size} L ${size * 0.5} 0 L ${-size} ${size}`}
              stroke={colors.core}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.6}
            />
          </g>
        );
      })}
    </>
  );
}

export const PacketFlowLayer = memo(function PacketFlowLayer({
  hitPoints,
  mode,
  connectionType,
  strokeColor: _strokeColor,
  elapsed: externalElapsed,
  reducedMotion: externalReducedMotion,
}: PacketFlowLayerProps) {
  const fallbackClock = useAnimationClock(
    externalElapsed === undefined && mode !== 'static' && hitPoints.length > 1,
  );
  const elapsed = externalElapsed ?? fallbackClock.elapsed;
  const reducedMotion = externalReducedMotion ?? fallbackClock.reducedMotion;

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

  const packetColors = resolvePacketColors(connectionType);
  const creationCompleted = mode === 'creation' && elapsed >= PACKET_SPEED_MS;

  // Reduced motion: show static direction chevrons instead of animated packets
  if (reducedMotion) {
    if (mode === 'static' || hitPoints.length < 2 || totalLength <= 0) {
      return null;
    }
    return (
      <g pointerEvents="none" data-testid="packet-flow-layer" data-connection-type={connectionType}>
        {renderStaticDirectionGlyphs(segments, totalLength, packetColors)}
      </g>
    );
  }

  if (
    mode === 'static' ||
    hitPoints.length < 2 ||
    totalLength <= 0 ||
    (mode === 'creation' && creationCompleted)
  ) {
    return null;
  }

  const packetCount = getPacketCount(totalLength, mode);
  const opacity = PACKET_OPACITY[mode];
  const effectiveSpeed = mode === 'idle' ? IDLE_CYCLE_MS : PACKET_SPEED_MS;

  const halfLen = PACKET_LENGTH / 2;
  const halfWid = PACKET_WIDTH / 2;
  const glowHalfLen = halfLen + 2;
  const glowHalfWid = halfWid + 1.5;

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

        return (
          <g
            key={`packet-${phaseOffset}`}
            transform={`translate(${position.x} ${position.y}) rotate(${position.angle})`}
            pointerEvents="none"
            data-testid="packet-flow-packet"
          >
            {/* Halo layer — semantic outer glow */}
            <path
              d={`M ${-glowHalfLen} 0 Q ${-glowHalfLen} ${-glowHalfWid} 0 ${-glowHalfWid} Q ${glowHalfLen} ${-glowHalfWid} ${glowHalfLen} 0 Q ${glowHalfLen} ${glowHalfWid} 0 ${glowHalfWid} Q ${-glowHalfLen} ${glowHalfWid} ${-glowHalfLen} 0 Z`}
              fill={packetColors.halo}
              fillOpacity={opacity * 0.45}
            />
            {/* Core capsule — bright inner body */}
            <path
              d={`M ${-halfLen} ${-halfWid} Q ${-halfLen - halfWid} 0 ${-halfLen} ${halfWid} L ${halfLen} ${halfWid} Q ${halfLen + halfWid} 0 ${halfLen} ${-halfWid} Z`}
              fill={packetColors.core}
              fillOpacity={opacity}
            />
            {/* Tail trail — long for directional reading */}
            <path
              d={`M ${-halfLen} 0 L ${-halfLen - PACKET_TAIL_LENGTH} 0`}
              stroke={packetColors.halo}
              strokeWidth={PACKET_WIDTH * 0.6}
              strokeLinecap="round"
              strokeOpacity={opacity * 0.4}
              fill="none"
            />
          </g>
        );
      })}
    </g>
  );
});
