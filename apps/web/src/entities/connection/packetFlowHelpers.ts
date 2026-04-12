import type { ScreenPoint } from '../../shared/utils/isometric';
import { MEDIUM_PATH_THRESHOLD, SHORT_PATH_THRESHOLD } from './packetFlowTokens';

export type PacketFlowMode = 'static' | 'idle' | 'hover' | 'selected' | 'creation';

export interface SegmentMetric {
  start: ScreenPoint;
  dx: number;
  dy: number;
  length: number;
  cumulativeStart: number;
}

export interface PacketPosition {
  x: number;
  y: number;
  angle: number;
}

export function getPacketCount(totalLength: number, mode: PacketFlowMode): number {
  if (mode === 'static') {
    return 0;
  }

  const baseCount =
    totalLength <= SHORT_PATH_THRESHOLD ? 1 : totalLength <= MEDIUM_PATH_THRESHOLD ? 2 : 3;

  if (mode === 'idle' || mode === 'hover') {
    return Math.max(1, baseCount - 1);
  }

  if (mode === 'creation') {
    return baseCount + 1;
  }

  return baseCount;
}

export function getPositionAtDistance(
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
