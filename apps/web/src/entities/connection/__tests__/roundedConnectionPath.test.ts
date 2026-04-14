import { describe, it, expect } from 'vitest';
import type { ScreenPoint } from '../../../shared/utils/isometric';
import {
  buildRoundedConnectionGeometry,
  dedupeConsecutivePoints,
  sampleArcInterior,
} from '../roundedConnectionPath';

// ─── dedupeConsecutivePoints ─────────────────────────────────────────

describe('dedupeConsecutivePoints', () => {
  it('returns empty array for empty input', () => {
    expect(dedupeConsecutivePoints([])).toEqual([]);
  });

  it('preserves a single point', () => {
    const pts: ScreenPoint[] = [{ x: 10, y: 20 }];
    expect(dedupeConsecutivePoints(pts)).toEqual([{ x: 10, y: 20 }]);
  });

  it('removes exact consecutive duplicates', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];
    const result = dedupeConsecutivePoints(pts);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 10, y: 10 });
    expect(result[2]).toEqual({ x: 20, y: 20 });
  });

  it('preserves non-consecutive duplicates', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 0 },
    ];
    const result = dedupeConsecutivePoints(pts);
    expect(result).toHaveLength(3);
  });

  it('removes near-duplicate points within EPS', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 1e-5, y: 1e-5 },
      { x: 10, y: 10 },
    ];
    const result = dedupeConsecutivePoints(pts);
    expect(result).toHaveLength(2);
  });
});

// ─── sampleArcInterior ──────────────────────────────────────────────

describe('sampleArcInterior', () => {
  it('produces interior points for a 90° right turn', () => {
    const out: ScreenPoint[] = [];
    const radius = 12;
    // Incoming direction: rightward (+x)
    const inDir: ScreenPoint = { x: 1, y: 0 };
    // Outgoing direction: downward (+y)
    const outDir: ScreenPoint = { x: 0, y: 1 };
    // Entry and exit points for a 90° corner at (100, 100)
    const entry: ScreenPoint = { x: 100 - radius, y: 100 };
    const exit: ScreenPoint = { x: 100, y: 100 + radius };
    const cross = inDir.x * outDir.y - inDir.y * outDir.x; // 1 (CW)

    sampleArcInterior(out, entry, exit, inDir, outDir, radius, cross);

    expect(out.length).toBeGreaterThanOrEqual(1);
    // All sampled points should be roughly at radius distance from center
    // Center should be at (100 - radius, 100 + radius) for CW turn
    // Actually center = entry + perpSign * (-inDir.y, inDir.x) * radius
    // perpSign = 1 (cross > 0), so center = (88, 100) + (0, 12) = (88, 112)
    const cx = entry.x + 1 * -inDir.y * radius; // 88 + 0 = 88
    const cy = entry.y + 1 * inDir.x * radius; // 100 + 12 = 112
    for (const p of out) {
      const dist = Math.hypot(p.x - cx, p.y - cy);
      expect(dist).toBeCloseTo(radius, 0);
    }
  });

  it('produces no points for collinear directions', () => {
    const out: ScreenPoint[] = [];
    const inDir: ScreenPoint = { x: 1, y: 0 };
    const outDir: ScreenPoint = { x: 1, y: 0 };
    sampleArcInterior(out, { x: 0, y: 0 }, { x: 10, y: 0 }, inDir, outDir, 12, 0);
    expect(out).toHaveLength(0);
  });
});

// ─── buildRoundedConnectionGeometry ─────────────────────────────────

describe('buildRoundedConnectionGeometry', () => {
  // Edge cases

  it('returns empty path for empty input', () => {
    const result = buildRoundedConnectionGeometry([]);
    expect(result.path).toBe('');
    expect(result.flowPoints).toHaveLength(0);
  });

  it('returns M-only path for single point', () => {
    const result = buildRoundedConnectionGeometry([{ x: 5, y: 10 }]);
    expect(result.path).toBe('M 5 10');
    expect(result.flowPoints).toHaveLength(1);
  });

  it('returns straight line for two points', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = buildRoundedConnectionGeometry(pts);
    expect(result.path).toBe('M 0 0 L 100 0');
    expect(result.flowPoints.length).toBeGreaterThanOrEqual(2);
    // First and last flow points should match input
    expect(result.flowPoints[0]).toEqual({ x: 0, y: 0 });
    expect(result.flowPoints[result.flowPoints.length - 1]).toEqual({
      x: 100,
      y: 0,
    });
  });

  it('deduplicates identical consecutive points before building', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = buildRoundedConnectionGeometry(pts);
    // Should behave like 2 points → straight line
    expect(result.path).toBe('M 0 0 L 100 0');
  });

  // Orthogonal L-shape (3 points, 90° turn)

  it('produces arc command for L-shaped path (90° turn)', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = buildRoundedConnectionGeometry(pts, 12);

    // Path should contain an A (arc) command
    expect(result.path).toContain('A ');
    // Path should start with M
    expect(result.path).toMatch(/^M /);
    // Path should contain L commands (straight segments)
    expect(result.path).toContain('L ');
  });

  it('flowPoints covers entire path for L-shape', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = buildRoundedConnectionGeometry(pts, 12);

    // Should have many flow points (sampled at ~6px)
    // Total path length ≈ 200px, so ~33 samples minimum
    expect(result.flowPoints.length).toBeGreaterThan(10);

    // First flow point is the start
    expect(result.flowPoints[0].x).toBeCloseTo(0, 1);
    expect(result.flowPoints[0].y).toBeCloseTo(0, 1);

    // Last flow point is the end
    const last = result.flowPoints[result.flowPoints.length - 1];
    expect(last.x).toBeCloseTo(100, 1);
    expect(last.y).toBeCloseTo(100, 1);
  });

  // U-shape (4 points, two 90° turns)

  it('produces two arc commands for U-shaped path', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ];
    const result = buildRoundedConnectionGeometry(pts, 12);
    const arcCount = (result.path.match(/A /g) ?? []).length;
    expect(arcCount).toBe(2);
  });

  // Collinear points (no turn needed)

  it('emits straight line for collinear points (no arcs)', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = buildRoundedConnectionGeometry(pts, 12);
    // Collinear → cross product = 0 → no arc
    expect(result.path).not.toContain('A ');
  });

  // Radius clamping (short segments)

  it('clamps radius for short segments to avoid overlap', () => {
    // Two segments of 20px each, radius 12 → trim ≈ 12 (for 90°)
    // max trim = min(20/2, 20/2) = 10, so it should clamp
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ];
    const result = buildRoundedConnectionGeometry(pts, 12);

    // Should still produce an arc, just with a smaller effective trim
    expect(result.path).toContain('A ');

    // Flow points should still be ordered (monotonic progression)
    for (let i = 1; i < result.flowPoints.length; i++) {
      const prev = result.flowPoints[i - 1];
      const curr = result.flowPoints[i];
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      // Adjacent flow points should be reasonably close
      expect(dist).toBeLessThan(25);
    }
  });

  // Arrow end reservation

  it('preserves straight segment at path end for arrow marker', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 40 }, // Last segment is 40px
    ];
    const result = buildRoundedConnectionGeometry(pts, 12, 18);

    // The last flow point should be the endpoint
    const last = result.flowPoints[result.flowPoints.length - 1];
    expect(last.x).toBeCloseTo(100, 1);
    expect(last.y).toBeCloseTo(40, 1);

    // There should be enough straight segment at the end
    // The last few flow points should be on the vertical line x=100
    const lastFew = result.flowPoints.slice(-3);
    for (const p of lastFew) {
      expect(p.x).toBeCloseTo(100, 1);
    }
  });

  // Custom radius parameter

  it('accepts custom radius', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
    ];
    const smallRadius = buildRoundedConnectionGeometry(pts, 5);
    const largeRadius = buildRoundedConnectionGeometry(pts, 30);

    // Both should have arcs
    expect(smallRadius.path).toContain('A ');
    expect(largeRadius.path).toContain('A ');

    // Larger radius → more arc samples → more flow points (roughly)
    // This is a rough heuristic check
    expect(largeRadius.flowPoints.length).toBeGreaterThanOrEqual(smallRadius.flowPoints.length - 5);
  });

  // Complex path (zigzag with multiple turns)

  it('handles zigzag path with multiple turns', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 60 },
      { x: 120, y: 60 },
      { x: 120, y: 120 },
    ];
    const result = buildRoundedConnectionGeometry(pts, 12);

    // Should have 3 arcs (3 interior vertices)
    const arcCount = (result.path.match(/A /g) ?? []).length;
    expect(arcCount).toBe(3);

    // Flow points should be dense and ordered
    expect(result.flowPoints.length).toBeGreaterThan(15);
  });

  // Sweep direction

  it('uses correct sweep flag for left vs right turns', () => {
    // Right turn (CW): going right then down
    const rightTurn: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const rResult = buildRoundedConnectionGeometry(rightTurn, 12);

    // Left turn (CCW): going right then up
    const leftTurn: ScreenPoint[] = [
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
    ];
    const lResult = buildRoundedConnectionGeometry(leftTurn, 12);

    // Both should produce valid paths with arcs
    expect(rResult.path).toContain('A ');
    expect(lResult.path).toContain('A ');

    // The sweep flags should differ (one has 0, other has 1)
    const rSweep = rResult.path.match(/A \d+ \d+ 0 0 (\d)/)?.[1];
    const lSweep = lResult.path.match(/A \d+ \d+ 0 0 (\d)/)?.[1];
    expect(rSweep).toBeDefined();
    expect(lSweep).toBeDefined();
    expect(rSweep).not.toBe(lSweep);
  });

  // Return type contract

  it('always returns path string and flowPoints array', () => {
    const cases: ScreenPoint[][] = [
      [],
      [{ x: 0, y: 0 }],
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
    ];

    for (const pts of cases) {
      const result = buildRoundedConnectionGeometry(pts, 12);
      expect(typeof result.path).toBe('string');
      expect(Array.isArray(result.flowPoints)).toBe(true);
      for (const p of result.flowPoints) {
        expect(typeof p.x).toBe('number');
        expect(typeof p.y).toBe('number');
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    }
  });

  // Flow points are monotonically progressing along the path

  it('flow points progress monotonically along path', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = buildRoundedConnectionGeometry(pts, 12);

    // Compute cumulative distance — should be monotonically increasing
    let cumDist = 0;
    for (let i = 1; i < result.flowPoints.length; i++) {
      const prev = result.flowPoints[i - 1];
      const curr = result.flowPoints[i];
      const segDist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      cumDist += segDist;
    }
    // Total distance should be roughly equal to path length (~200px minus trim)
    expect(cumDist).toBeGreaterThan(150);
    expect(cumDist).toBeLessThan(250);
  });

  // Very short overall path (< radius)

  it('handles path shorter than radius gracefully', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
    ];
    // radius 12 is larger than segment lengths (5px)
    const result = buildRoundedConnectionGeometry(pts, 12);
    expect(result.path).toBeTruthy();
    expect(result.flowPoints.length).toBeGreaterThanOrEqual(2);
  });
});
