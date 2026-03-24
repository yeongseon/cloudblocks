import { describe, it, expect } from 'vitest';
import {
  computeWorldRoute,
  computeFloorRoute,
  screenSegmentLength,
  screenSegmentLengthCU,
} from './routing';

describe('computeWorldRoute — screen-space routing', () => {
  const originX = 400;
  const originY = 300;

  it('returns single screen-v segment for vertically aligned endpoints', () => {
    const route = computeWorldRoute([1, 0, 1], [3, 0, 3], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbows).toHaveLength(0);
    expect(route.segments[0].direction).toBe('screen-v');
    expect(route.segments[0].start.x).toBeCloseTo(route.segments[0].end.x, 0);
  });

  it('returns single screen-h segment for horizontally aligned endpoints', () => {
    const route = computeWorldRoute([1, 0, 3], [3, 0, 1], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbows).toHaveLength(0);
    expect(route.segments[0].direction).toBe('screen-h');
  });

  it('returns vertical-first L-route when source is lower on screen', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    expect(route.segments).toHaveLength(2);
    expect(route.elbows).toHaveLength(1);
    expect(route.segments[0].direction).toBe('screen-v');
    expect(route.segments[1].direction).toBe('screen-h');
    expect(route.elbows[0].x).toBeCloseTo(route.srcScreen.x, 0);
    expect(route.elbows[0].y).toBeCloseTo(route.tgtScreen.y, 0);
  });

  it('returns horizontal-first L-route when source is higher on screen', () => {
    const route = computeWorldRoute([2, 0, 1], [4, 0, 5], originX, originY);
    expect(route.segments).toHaveLength(2);
    expect(route.elbows).toHaveLength(1);
    expect(route.segments[0].direction).toBe('screen-h');
    expect(route.segments[1].direction).toBe('screen-v');
    expect(route.elbows[0].x).toBeCloseTo(route.tgtScreen.x, 0);
    expect(route.elbows[0].y).toBeCloseTo(route.srcScreen.y, 0);
  });

  it('returns single segment for coincident points', () => {
    const route = computeWorldRoute([3, 0, 3], [3, 0, 3], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbows).toHaveLength(0);
  });

  it('includes screen coordinates for source and target', () => {
    const route = computeWorldRoute([0, 0, 0], [2, 0, 1], originX, originY);
    expect(route.srcScreen).toEqual({ x: 400, y: 300 });
    expect(typeof route.tgtScreen.x).toBe('number');
    expect(typeof route.tgtScreen.y).toBe('number');
  });

  it('height-normalizes to the higher endpoint', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    const elbow = route.elbows[0];
    const higherY = Math.min(route.srcScreen.y, route.tgtScreen.y);
    expect(elbow.y).toBeCloseTo(higherY, 0);
  });

  it('handles elevated endpoints with worldY offset', () => {
    const route = computeWorldRoute([1, 2, 3], [4, 2, 6], originX, originY);
    expect(route.segments.length).toBeGreaterThanOrEqual(1);
    expect(route.srcScreen.y).toBeLessThan(originY + (1 + 3) * 16);
  });

  it('vertical segment has constant screenX', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    const vSeg = route.segments.find((s) => s.direction === 'screen-v')!;
    expect(vSeg.start.x).toBeCloseTo(vSeg.end.x, 0);
  });

  it('horizontal segment has constant screenY', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    const hSeg = route.segments.find((s) => s.direction === 'screen-h')!;
    expect(hSeg.start.y).toBeCloseTo(hSeg.end.y, 0);
  });
});

describe('computeFloorRoute — floor-routed connections', () => {
  const originX = 400;
  const originY = 300;

  it('produces multi-segment route with elbows for offset blocks on same container block', () => {
    // src port at [2, 1.5, 3] (mid-height on block sitting on container block surface y=1)
    // tgt port at [5, 1.5, 6] (mid-height on block sitting on same container block)
    // floorY = 1 for both (container block surface)
    const route = computeFloorRoute([2, 1.5, 3], [5, 1.5, 6], 1, 1, originX, originY);
    expect(route.segments.length).toBeGreaterThanOrEqual(3);
    expect(route.elbows.length).toBeGreaterThanOrEqual(1);
  });

  it('drops to floor level — middle segments are lower than stubs on screen', () => {
    // Stubs at height 1.5, floor at height 1. Higher worldY = lower screenY.
    // Floor segments should have HIGHER screenY than port screenY.
    const route = computeFloorRoute([2, 1.5, 3], [5, 1.5, 6], 1, 1, originX, originY);
    const stubScreenY = route.srcScreen.y;
    const floorSegments = route.segments.slice(1, -1);
    for (const seg of floorSegments) {
      expect(seg.start.y).toBeGreaterThanOrEqual(stubScreenY - 1);
    }
  });

  it('handles different container block heights with corridor transition', () => {
    // src on container block at y=1 (floorY=1), tgt on container block at y=3 (floorY=3)
    const route = computeFloorRoute([2, 1.5, 3], [5, 3.5, 6], 1, 3, originX, originY);
    expect(route.segments.length).toBeGreaterThanOrEqual(4);
    expect(route.elbows.length).toBeGreaterThanOrEqual(2);
  });

  it('collapses to fewer segments when blocks are vertically aligned', () => {
    // Same worldX and worldZ — should collapse floor L-route to straight line
    const route = computeFloorRoute([3, 2, 3], [3, 2, 3], 1, 1, originX, originY);
    expect(route.segments.length).toBeGreaterThanOrEqual(1);
  });

  it('returns srcScreen and tgtScreen matching first/last segment endpoints', () => {
    const route = computeFloorRoute([2, 1.5, 3], [5, 1.5, 6], 1, 1, originX, originY);
    expect(route.srcScreen).toEqual(route.segments[0].start);
    expect(route.tgtScreen).toEqual(route.segments[route.segments.length - 1].end);
  });

  it('elbows array length equals segments length minus 1 for multi-segment routes', () => {
    const route = computeFloorRoute([2, 1.5, 3], [5, 1.5, 6], 1, 1, originX, originY);
    if (route.segments.length > 1) {
      expect(route.elbows.length).toBe(route.segments.length - 1);
    }
  });
});

describe('screenSegmentLength', () => {
  it('returns vertical pixel distance for screen-v', () => {
    const seg = {
      start: { x: 100, y: 200 },
      end: { x: 100, y: 350 },
      direction: 'screen-v' as const,
    };
    expect(screenSegmentLength(seg)).toBe(150);
  });

  it('returns horizontal pixel distance for screen-h', () => {
    const seg = {
      start: { x: 100, y: 200 },
      end: { x: 300, y: 200 },
      direction: 'screen-h' as const,
    };
    expect(screenSegmentLength(seg)).toBe(200);
  });
});

describe('screenSegmentLengthCU', () => {
  it('divides by TILE_H (32) for screen-v', () => {
    const seg = {
      start: { x: 100, y: 200 },
      end: { x: 100, y: 360 },
      direction: 'screen-v' as const,
    };
    expect(screenSegmentLengthCU(seg)).toBe(5);
  });

  it('divides by TILE_W (64) for screen-h', () => {
    const seg = {
      start: { x: 100, y: 200 },
      end: { x: 420, y: 200 },
      direction: 'screen-h' as const,
    };
    expect(screenSegmentLengthCU(seg)).toBe(5);
  });
});
