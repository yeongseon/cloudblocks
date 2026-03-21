import { TILE_W, TILE_H, TILE_Z } from '../../shared/tokens/designTokens';
import type { ScreenPoint } from '../../shared/utils/isometric';

export interface WorldPoint {
  worldX: number;
  worldZ: number;
  worldY: number;
}

export interface WorldSegment {
  start: WorldPoint;
  end: WorldPoint;
  axis: 'x' | 'z';
}

export interface ConnectorRoute {
  segments: WorldSegment[];
  elbow: WorldPoint | null;
  srcScreen: ScreenPoint;
  tgtScreen: ScreenPoint;
}

const SAME_AXIS_TOLERANCE = 0.1;

function worldToScreen(
  wp: WorldPoint,
  originX: number,
  originY: number,
): ScreenPoint {
  return {
    x: originX + (wp.worldX - wp.worldZ) * TILE_W / 2,
    y: originY + (wp.worldX + wp.worldZ) * TILE_H / 2 - wp.worldY * TILE_Z,
  };
}

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

  const dx = Math.abs(tgt.worldX - src.worldX);
  const dz = Math.abs(tgt.worldZ - src.worldZ);

  // Same position or nearly same — single degenerate segment
  if (dx < SAME_AXIS_TOLERANCE && dz < SAME_AXIS_TOLERANCE) {
    return {
      segments: [{ start: src, end: tgt, axis: 'x' }],
      elbow: null,
      srcScreen,
      tgtScreen,
    };
  }

  // Aligned on X — single Z segment
  if (dx < SAME_AXIS_TOLERANCE) {
    return {
      segments: [{ start: src, end: tgt, axis: 'z' }],
      elbow: null,
      srcScreen,
      tgtScreen,
    };
  }

  // Aligned on Z — single X segment
  if (dz < SAME_AXIS_TOLERANCE) {
    return {
      segments: [{ start: src, end: tgt, axis: 'x' }],
      elbow: null,
      srcScreen,
      tgtScreen,
    };
  }

  const srcBelow = srcScreen.y > tgtScreen.y;

  if (srcBelow) {
    const elbow: WorldPoint = { worldX: src.worldX, worldZ: tgt.worldZ, worldY: src.worldY };
    return {
      segments: [
        { start: src, end: elbow, axis: 'z' },
        { start: elbow, end: tgt, axis: 'x' },
      ],
      elbow,
      srcScreen,
      tgtScreen,
    };
  }

  const elbow: WorldPoint = { worldX: tgt.worldX, worldZ: src.worldZ, worldY: src.worldY };

  return {
    segments: [
      { start: src, end: elbow, axis: 'x' },
      { start: elbow, end: tgt, axis: 'z' },
    ],
    elbow,
    srcScreen,
    tgtScreen,
  };
}

export function worldSegmentToScreen(
  seg: WorldSegment,
  originX: number,
  originY: number,
): { start: ScreenPoint; end: ScreenPoint } {
  return {
    start: worldToScreen(seg.start, originX, originY),
    end: worldToScreen(seg.end, originX, originY),
  };
}

export function worldSegmentLengthCU(seg: WorldSegment): number {
  if (seg.axis === 'x') {
    return Math.abs(seg.end.worldX - seg.start.worldX);
  }
  return Math.abs(seg.end.worldZ - seg.start.worldZ);
}
