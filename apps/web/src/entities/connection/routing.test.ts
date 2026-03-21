import { describe, it, expect } from 'vitest';
import { computeWorldRoute, worldSegmentToScreen, worldSegmentLengthCU } from './routing';

describe('computeWorldRoute', () => {
  const originX = 400;
  const originY = 300;

  it('returns single segment for same-X-axis aligned points', () => {
    const route = computeWorldRoute([2, 0, 3], [5, 0, 3], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbow).toBeNull();
    expect(route.segments[0].axis).toBe('x');
    expect(route.segments[0].start.worldX).toBe(2);
    expect(route.segments[0].end.worldX).toBe(5);
  });

  it('returns single segment for same-Z-axis aligned points', () => {
    const route = computeWorldRoute([3, 0, 1], [3, 0, 4], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbow).toBeNull();
    expect(route.segments[0].axis).toBe('z');
  });

  it('returns L-shaped route with X-first elbow for diagonal points', () => {
    const route = computeWorldRoute([1, 0, 2], [4, 0, 5], originX, originY);
    expect(route.segments).toHaveLength(2);
    expect(route.elbow).not.toBeNull();
    expect(route.segments[0].axis).toBe('x');
    expect(route.segments[1].axis).toBe('z');
    expect(route.elbow!.worldX).toBe(4);
    expect(route.elbow!.worldZ).toBe(2);
  });

  it('returns Z-first route when source is below target on screen', () => {
    const route = computeWorldRoute([5, 0, 8], [2, 0, 1], originX, originY);
    expect(route.segments).toHaveLength(2);
    expect(route.elbow).not.toBeNull();
    expect(route.segments[0].axis).toBe('z');
    expect(route.segments[1].axis).toBe('x');
    expect(route.elbow!.worldX).toBe(5);
    expect(route.elbow!.worldZ).toBe(1);
  });

  it('returns single segment for coincident points', () => {
    const route = computeWorldRoute([3, 0, 3], [3, 0, 3], originX, originY);
    expect(route.segments).toHaveLength(1);
    expect(route.elbow).toBeNull();
  });

  it('includes screen coordinates for source and target', () => {
    const route = computeWorldRoute([0, 0, 0], [2, 0, 1], originX, originY);
    expect(route.srcScreen).toBeDefined();
    expect(route.tgtScreen).toBeDefined();
    expect(typeof route.srcScreen.x).toBe('number');
    expect(typeof route.srcScreen.y).toBe('number');
  });

  it('handles elevated endpoints', () => {
    const route = computeWorldRoute([1, 2, 3], [4, 2, 6], originX, originY);
    expect(route.segments).toHaveLength(2);
    expect(route.segments[0].start.worldY).toBe(2);
  });
});

describe('worldSegmentToScreen', () => {
  it('converts world segment endpoints to screen coordinates', () => {
    const seg = {
      start: { worldX: 0, worldZ: 0, worldY: 0 },
      end: { worldX: 2, worldZ: 0, worldY: 0 },
      axis: 'x' as const,
    };
    const result = worldSegmentToScreen(seg, 400, 300);
    expect(result.start.x).toBe(400);
    expect(result.start.y).toBe(300);
    expect(result.end.x).toBeGreaterThan(result.start.x);
  });
});

describe('worldSegmentLengthCU', () => {
  it('returns X-axis length for x segments', () => {
    const seg = {
      start: { worldX: 1, worldZ: 3, worldY: 0 },
      end: { worldX: 4, worldZ: 3, worldY: 0 },
      axis: 'x' as const,
    };
    expect(worldSegmentLengthCU(seg)).toBe(3);
  });

  it('returns Z-axis length for z segments', () => {
    const seg = {
      start: { worldX: 3, worldZ: 1, worldY: 0 },
      end: { worldX: 3, worldZ: 5, worldY: 0 },
      axis: 'z' as const,
    };
    expect(worldSegmentLengthCU(seg)).toBe(4);
  });
});
