import { describe, expect, it } from 'vitest';
import { getPreviewRoutePoints } from '../previewRoutePoints';

const R = 12; // CONNECTION_CORNER_RADIUS default

describe('getPreviewRoutePoints', () => {
  it('returns straight line when source and target are very close', () => {
    const source = { x: 100, y: 200 };
    const target = { x: 110, y: 210 }; // dx=10, dy=10, both < 2*R=24
    const result = getPreviewRoutePoints(source, target);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(source);
    expect(result[1]).toEqual(target);
  });

  it('returns straight line when source equals target', () => {
    const source = { x: 100, y: 200 };
    const result = getPreviewRoutePoints(source, source);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(source);
    expect(result[1]).toEqual(source);
  });

  it('returns 4-point step route for target far to the right and below', () => {
    const source = { x: 100, y: 100 };
    const target = { x: 300, y: 250 };
    const result = getPreviewRoutePoints(source, target);
    expect(result).toHaveLength(4);
    // First point is source
    expect(result[0]).toEqual(source);
    // Last point is target
    expect(result[3]).toEqual(target);
    // Middle points share the same X (vertical lane)
    expect(result[1].x).toBe(result[2].x);
    // First middle point has source's Y
    expect(result[1].y).toBe(source.y);
    // Second middle point has target's Y
    expect(result[2].y).toBe(target.y);
  });

  it('places lane at midpoint when target is far ahead', () => {
    const source = { x: 100, y: 100 };
    const target = { x: 400, y: 200 };
    const result = getPreviewRoutePoints(source, target);
    // midX = (100 + 400) / 2 = 250
    // source.x + minStub = 100 + 24 = 124
    // target.x - minStub = 400 - 24 = 376
    // laneX = max(124, min(250, 376)) = 250
    expect(result[1].x).toBe(250);
  });

  it('uses minStub when target is close horizontally but far vertically', () => {
    const source = { x: 100, y: 100 };
    const target = { x: 130, y: 300 }; // dx=30 > 24, dy=200 > 24
    const result = getPreviewRoutePoints(source, target);
    expect(result).toHaveLength(4);
    // midX = (100 + 130) / 2 = 115
    // source.x + minStub = 100 + 24 = 124
    // target.x - minStub = 130 - 24 = 106
    // laneX = max(124, min(115, 106)) = max(124, 106) = 124
    expect(result[1].x).toBe(124);
  });

  it('handles target to the left of source (behind)', () => {
    const source = { x: 200, y: 100 };
    const target = { x: 50, y: 200 };
    const result = getPreviewRoutePoints(source, target);
    expect(result).toHaveLength(4);
    // midX = (200 + 50) / 2 = 125
    // source.x + minStub = 200 + 24 = 224
    // target.x - minStub = 50 - 24 = 26
    // laneX = max(224, min(125, 26)) = max(224, 26) = 224
    expect(result[1].x).toBe(224);
    // Lane is to the right of source, looping out before coming back
    expect(result[1].x).toBeGreaterThan(source.x);
  });

  it('handles horizontal target (same Y)', () => {
    const source = { x: 100, y: 200 };
    const target = { x: 300, y: 200 };
    const result = getPreviewRoutePoints(source, target);
    expect(result).toHaveLength(4);
    // p1 and p2 will have same Y since source.y === target.y
    // The dedup in buildRoundedConnectionGeometry will handle collapsing
    expect(result[1].y).toBe(result[2].y);
    expect(result[1].y).toBe(200);
  });

  it('handles vertical target (same X but far vertically)', () => {
    const source = { x: 100, y: 100 };
    const target = { x: 100, y: 300 };
    const result = getPreviewRoutePoints(source, target);
    expect(result).toHaveLength(4);
    // midX = (100 + 100) / 2 = 100
    // source.x + minStub = 100 + 24 = 124
    // target.x - minStub = 100 - 24 = 76
    // laneX = max(124, min(100, 76)) = max(124, 76) = 124
    expect(result[1].x).toBe(124);
  });

  it('accepts custom radius parameter', () => {
    const source = { x: 100, y: 100 };
    const target = { x: 105, y: 105 }; // within 2*R for R=12, but not for R=2
    // With default R=12, minStub = 24, dx=5 < 24 and dy=5 < 24 → straight
    expect(getPreviewRoutePoints(source, target, 12)).toHaveLength(2);
    // With R=2, minStub = 4, dx=5 > 4 or dy=5 > 4 → NOT both < minStub
    // Actually dx=5 > 4 AND dy=5 > 4 → step route
    expect(getPreviewRoutePoints(source, target, 2)).toHaveLength(4);
  });

  it('always exits horizontally to the right (no jitter)', () => {
    const source = { x: 100, y: 100 };
    // Target above-left
    const t1 = getPreviewRoutePoints(source, { x: 50, y: 50 });
    // Target below-left
    const t2 = getPreviewRoutePoints(source, { x: 50, y: 200 });
    // Target above-right
    const t3 = getPreviewRoutePoints(source, { x: 300, y: 50 });
    // Target below-right
    const t4 = getPreviewRoutePoints(source, { x: 300, y: 200 });

    // All should have the first segment horizontal (same Y as source)
    for (const result of [t1, t2, t3, t4]) {
      if (result.length >= 3) {
        expect(result[1].y).toBe(source.y);
      }
    }
  });

  it('laneX is always >= source.x + minStub', () => {
    const source = { x: 100, y: 100 };
    const minStub = 2 * R;
    const targets = [
      { x: 50, y: 200 },
      { x: 100, y: 200 },
      { x: 130, y: 200 },
      { x: 500, y: 200 },
    ];
    for (const target of targets) {
      const result = getPreviewRoutePoints(source, target);
      if (result.length === 4) {
        expect(result[1].x).toBeGreaterThanOrEqual(source.x + minStub);
      }
    }
  });
});
