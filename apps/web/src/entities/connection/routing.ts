import type { ScreenPoint } from '../../shared/utils/isometric';

export interface RouteSegment {
  start: ScreenPoint;
  end: ScreenPoint;
}

export interface ConnectorRoute {
  segments: RouteSegment[];
  elbows: ScreenPoint[];
}

const ELBOW_THRESHOLD = 8;

export function computeRoute(src: ScreenPoint, tgt: ScreenPoint): ConnectorRoute {
  const dx = Math.abs(tgt.x - src.x);
  const dy = Math.abs(tgt.y - src.y);

  if (dx < ELBOW_THRESHOLD && dy < ELBOW_THRESHOLD) {
    return {
      segments: [{ start: src, end: tgt }],
      elbows: [],
    };
  }

  if (dx < ELBOW_THRESHOLD || dy < ELBOW_THRESHOLD) {
    return {
      segments: [{ start: src, end: tgt }],
      elbows: [],
    };
  }

  const elbow: ScreenPoint = { x: tgt.x, y: src.y };
  return {
    segments: [
      { start: src, end: elbow },
      { start: elbow, end: tgt },
    ],
    elbows: [elbow],
  };
}

export function segmentAngle(seg: RouteSegment): number {
  return Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
}

export function segmentLength(seg: RouteSegment): number {
  const dx = seg.end.x - seg.start.x;
  const dy = seg.end.y - seg.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}
