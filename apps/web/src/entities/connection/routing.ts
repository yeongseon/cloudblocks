import { TILE_W, TILE_H, TILE_Z } from '../../shared/tokens/designTokens';
import type { ScreenPoint } from '../../shared/utils/isometric';

export interface WorldPoint {
  worldX: number;
  worldZ: number;
  worldY: number;
}

/**
 * Screen-space segment direction.
 * - 'screen-v': constant screenX, varying screenY
 * - 'screen-h': constant screenY, varying screenX
 */
export type SegmentDirection = 'screen-v' | 'screen-h';

export interface ScreenSegment {
  start: ScreenPoint;
  end: ScreenPoint;
  direction: SegmentDirection;
}

export interface ConnectorRoute {
  segments: ScreenSegment[];
  elbow: ScreenPoint | null;
  srcScreen: ScreenPoint;
  tgtScreen: ScreenPoint;
}

const SAME_PX_TOLERANCE = 2;

function worldToScreen(wp: WorldPoint, originX: number, originY: number): ScreenPoint {
  return {
    x: originX + ((wp.worldX - wp.worldZ) * TILE_W) / 2,
    y: originY + ((wp.worldX + wp.worldZ) * TILE_H) / 2 - wp.worldY * TILE_Z,
  };
}

/**
 * Screen-space L-route between two world-space endpoints.
 * Height-normalizes to the higher endpoint, then routes as
 * screen-vertical + screen-horizontal segments.
 */
export function computeWorldRoute(
  srcWorld: [number, number, number],
  tgtWorld: [number, number, number],
  originX: number,
  originY: number,
): ConnectorRoute {
  const src: WorldPoint = { worldX: srcWorld[0], worldZ: srcWorld[2], worldY: srcWorld[1] };
  const tgt: WorldPoint = { worldX: tgtWorld[0], worldZ: tgtWorld[2], worldY: tgtWorld[1] };

  const srcScreen = worldToScreen(src, originX, originY);
  const tgtScreen = worldToScreen(tgt, originX, originY);

  const dx = Math.abs(tgtScreen.x - srcScreen.x);
  const dy = Math.abs(tgtScreen.y - srcScreen.y);

  if (dx < SAME_PX_TOLERANCE && dy < SAME_PX_TOLERANCE) {
    return {
      segments: [{ start: srcScreen, end: tgtScreen, direction: 'screen-v' }],
      elbow: null,
      srcScreen,
      tgtScreen,
    };
  }

  if (dx < SAME_PX_TOLERANCE) {
    return {
      segments: [{ start: srcScreen, end: tgtScreen, direction: 'screen-v' }],
      elbow: null,
      srcScreen,
      tgtScreen,
    };
  }

  if (dy < SAME_PX_TOLERANCE) {
    return {
      segments: [{ start: srcScreen, end: tgtScreen, direction: 'screen-h' }],
      elbow: null,
      srcScreen,
      tgtScreen,
    };
  }

  const normalizedY = Math.min(srcScreen.y, tgtScreen.y);

  if (srcScreen.y > tgtScreen.y) {
    const elbow: ScreenPoint = { x: srcScreen.x, y: normalizedY };
    return {
      segments: [
        { start: srcScreen, end: elbow, direction: 'screen-v' },
        { start: elbow, end: tgtScreen, direction: 'screen-h' },
      ],
      elbow,
      srcScreen,
      tgtScreen,
    };
  }

  const elbow: ScreenPoint = { x: tgtScreen.x, y: normalizedY };
  return {
    segments: [
      { start: srcScreen, end: elbow, direction: 'screen-h' },
      { start: elbow, end: tgtScreen, direction: 'screen-v' },
    ],
    elbow,
    srcScreen,
    tgtScreen,
  };
}

export function screenSegmentLength(seg: ScreenSegment): number {
  if (seg.direction === 'screen-v') {
    return Math.abs(seg.end.y - seg.start.y);
  }
  return Math.abs(seg.end.x - seg.start.x);
}

/** screen-v: px / TILE_H → CU;  screen-h: px / TILE_W → CU */
export function screenSegmentLengthCU(seg: ScreenSegment): number {
  if (seg.direction === 'screen-v') {
    return Math.abs(seg.end.y - seg.start.y) / TILE_H;
  }
  return Math.abs(seg.end.x - seg.start.x) / TILE_W;
}
