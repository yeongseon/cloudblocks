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
  elbows: ScreenPoint[];
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
      elbows: [],
      srcScreen,
      tgtScreen,
    };
  }

  if (dx < SAME_PX_TOLERANCE) {
    return {
      segments: [{ start: srcScreen, end: tgtScreen, direction: 'screen-v' }],
      elbows: [],
      srcScreen,
      tgtScreen,
    };
  }

  if (dy < SAME_PX_TOLERANCE) {
    return {
      segments: [{ start: srcScreen, end: tgtScreen, direction: 'screen-h' }],
      elbows: [],
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
      elbows: [elbow],
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
    elbows: [elbow],
    srcScreen,
    tgtScreen,
  };
}

/**
 * Floor-routed connection between two world-space endpoints.
 *
 * Instead of an L-route floating in the air, the connection:
 * 1. Drops vertically from the source stub down to its plate floor
 * 2. Routes along the floor plane (L-shaped if needed)
 * 3. Rises vertically to the target stub
 *
 * When source and target are on different-height plates, a shared
 * corridor plane at min(srcFloorY, tgtFloorY) is used with extra
 * vertical transition segments.
 *
 * External-actor connections (no floorY) fall back to computeWorldRoute.
 */
export function computeFloorRoute(
  srcWorld: [number, number, number],
  tgtWorld: [number, number, number],
  srcFloorY: number,
  tgtFloorY: number,
  originX: number,
  originY: number,
): ConnectorRoute {
  const waypoints: WorldPoint[] = [];

  const srcStub: WorldPoint = { worldX: srcWorld[0], worldZ: srcWorld[2], worldY: srcWorld[1] };
  const tgtStub: WorldPoint = { worldX: tgtWorld[0], worldZ: tgtWorld[2], worldY: tgtWorld[1] };

  waypoints.push(srcStub);

  // 1. Drop from source stub to source plate floor
  const srcFloor: WorldPoint = { worldX: srcWorld[0], worldZ: srcWorld[2], worldY: srcFloorY };
  waypoints.push(srcFloor);

  // 2. If plates differ, descend to shared corridor at min height
  const routePlaneY = Math.min(srcFloorY, tgtFloorY);
  if (srcFloorY !== routePlaneY) {
    waypoints.push({ worldX: srcWorld[0], worldZ: srcWorld[2], worldY: routePlaneY });
  }

  // 3. Route across the floor plane using a world-axis L-elbow.
  //    Fixed order: worldX first, then worldZ — produces two isometric
  //    diagonal segments that visually hug the plate surface.
  const sx = srcWorld[0];
  const sz = srcWorld[2];
  const tx = tgtWorld[0];
  const tz = tgtWorld[2];

  const needsElbow = Math.abs(sx - tx) > 1e-6 && Math.abs(sz - tz) > 1e-6;
  if (needsElbow) {
    // Elbow at (tgtX, routePlaneY, srcZ) — "X first, then Z"
    waypoints.push({ worldX: tx, worldZ: sz, worldY: routePlaneY });
  }

  // 4. Arrive at target floor position on the route plane
  if (tgtFloorY !== routePlaneY) {
    waypoints.push({ worldX: tx, worldZ: tz, worldY: routePlaneY });
    waypoints.push({ worldX: tx, worldZ: tz, worldY: tgtFloorY });
  } else {
    waypoints.push({ worldX: tx, worldZ: tz, worldY: tgtFloorY });
  }

  // 5. Rise from target floor to target stub
  waypoints.push(tgtStub);

  // Deduplicate consecutive waypoints that project to the same screen point
  const screenPoints: ScreenPoint[] = waypoints.map((wp) => worldToScreen(wp, originX, originY));
  const dedupedIndices: number[] = [0];
  for (let i = 1; i < screenPoints.length; i++) {
    const prev = screenPoints[dedupedIndices[dedupedIndices.length - 1]];
    const curr = screenPoints[i];
    if (
      Math.abs(curr.x - prev.x) >= SAME_PX_TOLERANCE ||
      Math.abs(curr.y - prev.y) >= SAME_PX_TOLERANCE
    ) {
      dedupedIndices.push(i);
    }
  }

  // Build segments between consecutive deduped screen points
  const segments: ScreenSegment[] = [];
  const elbows: ScreenPoint[] = [];

  for (let i = 0; i < dedupedIndices.length - 1; i++) {
    const start = screenPoints[dedupedIndices[i]];
    const end = screenPoints[dedupedIndices[i + 1]];
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    // Classify direction based on which axis dominates
    const direction: SegmentDirection = dy >= dx ? 'screen-v' : 'screen-h';
    segments.push({ start, end, direction });

    // Interior points (not first, not last) are elbows
    if (i > 0) {
      elbows.push(start);
    }
  }

  // If deduplication collapsed everything to 1 or 0 points, fallback
  if (segments.length === 0) {
    const srcScreen = screenPoints[0];
    const tgtScreen = screenPoints[screenPoints.length - 1];
    return {
      segments: [{ start: srcScreen, end: tgtScreen, direction: 'screen-v' }],
      elbows: [],
      srcScreen,
      tgtScreen,
    };
  }

  return {
    segments,
    elbows,
    srcScreen: segments[0].start,
    tgtScreen: segments[segments.length - 1].end,
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
