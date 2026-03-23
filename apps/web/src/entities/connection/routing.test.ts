import { describe, it, expect } from 'vitest';
import { computeWorldRoute, screenSegmentLength, screenSegmentLengthCU } from './routing';

describe('computeWorldRoute — screen-space routing', () => {
  const originX = 400;
  const originY = 300;

  it('returns single screen-v segment for vertically aligned endpoints', () => {
    // [1,0,1] → screenX=400, screenY=332; [3,0,3] → screenX=400, screenY=396
    // Same screenX (worldX-worldZ=0 for both) → pure vertical
    const route = computeWorldRoute([1, 0, 1], [3, 0, 3], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbow).toBeNull();
    expect(route.segments[0].direction).toBe('screen-v');
    expect(route.segments[0].start.x).toBeCloseTo(route.segments[0].end.x, 0);
  });

  it('returns single screen-h segment for horizontally aligned endpoints', () => {
    // [1,0,3] → screenX=336, screenY=364; [3,0,1] → screenX=464, screenY=364
    // Same screenY (worldX+worldZ=4 for both) → pure horizontal
    const route = computeWorldRoute([1, 0, 3], [3, 0, 1], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbow).toBeNull();
    expect(route.segments[0].direction).toBe('screen-h');
  });

  it('returns vertical-first L-route when source is lower on screen', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    expect(route.segments).toHaveLength(2);
    expect(route.elbow).not.toBeNull();
    expect(route.segments[0].direction).toBe('screen-v');
    expect(route.segments[1].direction).toBe('screen-h');
    expect(route.elbow!.x).toBeCloseTo(route.srcScreen.x, 0);
    expect(route.elbow!.y).toBeCloseTo(route.tgtScreen.y, 0);
  });

  it('returns horizontal-first L-route when source is higher on screen', () => {
    // [2,0,1] → screenX=432, screenY=348; [4,0,5] → screenX=368, screenY=444
    // src higher (smaller Y) → horizontal-first, then vertical down
    const route = computeWorldRoute([2, 0, 1], [4, 0, 5], originX, originY);
    expect(route.segments).toHaveLength(2);
    expect(route.elbow).not.toBeNull();
    expect(route.segments[0].direction).toBe('screen-h');
    expect(route.segments[1].direction).toBe('screen-v');
    expect(route.elbow!.x).toBeCloseTo(route.tgtScreen.x, 0);
    expect(route.elbow!.y).toBeCloseTo(route.srcScreen.y, 0);
  });

  it('returns single segment for coincident points', () => {
    const route = computeWorldRoute([3, 0, 3], [3, 0, 3], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbow).toBeNull();
  });

  it('includes screen coordinates for source and target', () => {
    const route = computeWorldRoute([0, 0, 0], [2, 0, 1], originX, originY);
    expect(route.srcScreen).toEqual({ x: 400, y: 300 });
    expect(typeof route.tgtScreen.x).toBe('number');
    expect(typeof route.tgtScreen.y).toBe('number');
  });

  it('height-normalizes to the higher endpoint', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    const elbow = route.elbow!;
    const higherY = Math.min(route.srcScreen.y, route.tgtScreen.y);
    expect(elbow.y).toBeCloseTo(higherY, 0);
  });

  it('handles elevated endpoints with worldY offset', () => {
    const route = computeWorldRoute([1, 2, 3], [4, 2, 6], originX, originY);
    expect(route.segments.length).toBeGreaterThanOrEqual(1);
    expect(route.srcScreen.y).toBeLessThan(
      originY + (1 + 3) * 16,
    );
  });

  it('vertical segment has constant screenX', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    const vSeg = route.segments.find(s => s.direction === 'screen-v')!;
    expect(vSeg.start.x).toBeCloseTo(vSeg.end.x, 0);
  });

  it('horizontal segment has constant screenY', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    const hSeg = route.segments.find(s => s.direction === 'screen-h')!;
    expect(hSeg.start.y).toBeCloseTo(hSeg.end.y, 0);
  });
});

describe('screenSegmentLength', () => {
  it('returns vertical pixel distance for screen-v', () => {
    const seg = { start: { x: 100, y: 200 }, end: { x: 100, y: 350 }, direction: 'screen-v' as const };
    expect(screenSegmentLength(seg)).toBe(150);
  });

  it('returns horizontal pixel distance for screen-h', () => {
    const seg = { start: { x: 100, y: 200 }, end: { x: 300, y: 200 }, direction: 'screen-h' as const };
    expect(screenSegmentLength(seg)).toBe(200);
  });
});

describe('screenSegmentLengthCU', () => {
  it('divides by TILE_H (32) for screen-v', () => {
    const seg = { start: { x: 100, y: 200 }, end: { x: 100, y: 360 }, direction: 'screen-v' as const };
    expect(screenSegmentLengthCU(seg)).toBe(5);
  });

  it('divides by TILE_W (64) for screen-h', () => {
    const seg = { start: { x: 100, y: 200 }, end: { x: 420, y: 200 }, direction: 'screen-h' as const };
    expect(screenSegmentLengthCU(seg)).toBe(5);
  });
});


