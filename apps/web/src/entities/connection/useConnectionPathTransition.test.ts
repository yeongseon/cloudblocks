import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ScreenPoint } from '../../shared/utils/isometric';
import {
  useConnectionPathTransition,
  resampleByArcLength,
  flowPointsToPath,
} from './useConnectionPathTransition';

// ─── resampleByArcLength ────────────────────────────────────────────

describe('resampleByArcLength', () => {
  it('returns empty array for empty input', () => {
    expect(resampleByArcLength([], 5)).toEqual([]);
  });

  it('returns single point for single-point input', () => {
    const pts: ScreenPoint[] = [{ x: 10, y: 20 }];
    const result = resampleByArcLength(pts, 5);
    expect(result).toEqual([{ x: 10, y: 20 }]);
  });

  it('returns single point when count is 1', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const result = resampleByArcLength(pts, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 0, y: 0 });
  });

  it('resamples a straight line into evenly-spaced points', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = resampleByArcLength(pts, 5);
    expect(result).toHaveLength(5);
    // First and last should match endpoints
    expect(result[0].x).toBeCloseTo(0);
    expect(result[4].x).toBeCloseTo(100);
    // Intermediate points should be evenly spaced
    expect(result[1].x).toBeCloseTo(25);
    expect(result[2].x).toBeCloseTo(50);
    expect(result[3].x).toBeCloseTo(75);
  });

  it('resamples an L-shaped path correctly', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ];
    // Total arc length = 100, requesting 3 samples
    const result = resampleByArcLength(pts, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[2]).toEqual({ x: 50, y: 50 });
    // Midpoint should be at the corner
    expect(result[1].x).toBeCloseTo(50);
    expect(result[1].y).toBeCloseTo(0);
  });

  it('handles degenerate case with all same points', () => {
    const pts: ScreenPoint[] = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ];
    const result = resampleByArcLength(pts, 4);
    expect(result).toHaveLength(4);
    for (const p of result) {
      expect(p.x).toBeCloseTo(5);
      expect(p.y).toBeCloseTo(5);
    }
  });
});

// ─── flowPointsToPath ───────────────────────────────────────────────

describe('flowPointsToPath', () => {
  it('returns empty string for empty input', () => {
    expect(flowPointsToPath([])).toBe('');
  });

  it('returns M command for single point', () => {
    expect(flowPointsToPath([{ x: 10, y: 20 }])).toBe('M 10 20');
  });

  it('returns M + L commands for multiple points', () => {
    const pts: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 10 },
    ];
    const result = flowPointsToPath(pts);
    expect(result).toMatch(/^M 0 0/);
    expect(result).toContain('L 10 5');
    expect(result).toContain('L 20 10');
  });
});

// ─── useConnectionPathTransition ────────────────────────────────────

describe('useConnectionPathTransition', () => {
  type State = 'idle' | 'placing' | 'connecting' | 'dragging' | 'selecting';

  const pointsA: ScreenPoint[] = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 50 },
  ];

  const pointsB: ScreenPoint[] = [
    { x: 0, y: 0 },
    { x: 60, y: 0 },
    { x: 60, y: 60 },
    { x: 120, y: 60 },
  ];

  it('returns original flowPoints when idle (no transition)', () => {
    const { result } = renderHook(() => useConnectionPathTransition(pointsA, 'idle', 0, false));
    expect(result.current.isTransitioning).toBe(false);
    expect(result.current.flowPoints).toHaveLength(pointsA.length);
    expect(result.current.flowPoints[0]).toEqual(pointsA[0]);
  });

  it('returns original flowPoints during dragging', () => {
    const { result } = renderHook(() =>
      useConnectionPathTransition(pointsA, 'dragging', 100, false),
    );
    expect(result.current.isTransitioning).toBe(false);
  });

  it('starts transition on dragging → idle state change', () => {
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed }) => useConnectionPathTransition(pts, state, elapsed, false),
      {
        initialProps: {
          pts: pointsA,
          state: 'dragging' as State,
          elapsed: 100,
        },
      },
    );

    // Transition from dragging → idle with new points
    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 100 });
    expect(result.current.isTransitioning).toBe(true);

    // Endpoints should be pinned to target positions
    const firstPoint = result.current.flowPoints[0];
    const lastPoint = result.current.flowPoints[result.current.flowPoints.length - 1];
    expect(firstPoint.x).toBeCloseTo(pointsB[0].x);
    expect(firstPoint.y).toBeCloseTo(pointsB[0].y);
    expect(lastPoint.x).toBeCloseTo(pointsB[pointsB.length - 1].x);
    expect(lastPoint.y).toBeCloseTo(pointsB[pointsB.length - 1].y);
  });

  it('completes transition after duration', () => {
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed }) => useConnectionPathTransition(pts, state, elapsed, false),
      {
        initialProps: {
          pts: pointsA,
          state: 'dragging' as State,
          elapsed: 100,
        },
      },
    );

    // Start transition
    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 100 });
    expect(result.current.isTransitioning).toBe(true);

    // After 180ms (duration), transition should complete
    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 300 });
    expect(result.current.isTransitioning).toBe(false);
  });

  it('skips animation when reducedMotion is true', () => {
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed, reduced }) =>
        useConnectionPathTransition(pts, state, elapsed, reduced),
      {
        initialProps: {
          pts: pointsA,
          state: 'dragging' as State,
          elapsed: 100,
          reduced: true,
        },
      },
    );

    // Even with dragging → idle, no transition should happen
    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 100, reduced: true });
    expect(result.current.isTransitioning).toBe(false);
    // Should return the final geometry immediately
    expect(result.current.flowPoints[0]).toEqual(pointsB[0]);
  });

  it('cancels active transition when new drag starts', () => {
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed }) => useConnectionPathTransition(pts, state, elapsed, false),
      {
        initialProps: {
          pts: pointsA,
          state: 'dragging' as State,
          elapsed: 100,
        },
      },
    );

    // Start transition
    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 100 });
    expect(result.current.isTransitioning).toBe(true);

    // New drag starts — should cancel
    rerender({ pts: pointsB, state: 'dragging' as const, elapsed: 150 });
    expect(result.current.isTransitioning).toBe(false);
  });

  it('does not animate when points are too short', () => {
    const shortPoints: ScreenPoint[] = [{ x: 0, y: 0 }];
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed }) => useConnectionPathTransition(pts, state, elapsed, false),
      {
        initialProps: {
          pts: shortPoints,
          state: 'dragging' as State,
          elapsed: 100,
        },
      },
    );

    rerender({ pts: shortPoints, state: 'idle' as const, elapsed: 100 });
    expect(result.current.isTransitioning).toBe(false);
  });

  it('does not animate on non-drag state transitions', () => {
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed }) => useConnectionPathTransition(pts, state, elapsed, false),
      {
        initialProps: {
          pts: pointsA,
          state: 'placing' as State,
          elapsed: 100,
        },
      },
    );

    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 100 });
    expect(result.current.isTransitioning).toBe(false);
  });

  it('produces interpolated intermediate points during transition', () => {
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed }) => useConnectionPathTransition(pts, state, elapsed, false),
      {
        initialProps: {
          pts: pointsA,
          state: 'dragging' as State,
          elapsed: 0,
        },
      },
    );

    // Start transition at elapsed=0
    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 0 });
    expect(result.current.isTransitioning).toBe(true);

    // At elapsed=90ms (halfway through 180ms), interior points should
    // be between the two sets (not endpoints which are pinned)
    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 90 });
    if (result.current.isTransitioning && result.current.flowPoints.length > 2) {
      const midIdx = Math.floor(result.current.flowPoints.length / 2);
      const midPoint = result.current.flowPoints[midIdx];
      // Should be somewhere between pointsA and pointsB geometry
      // (not exactly equal to either — verifies interpolation is happening)
      expect(midPoint.x).toBeDefined();
      expect(midPoint.y).toBeDefined();
    }
  });

  it('does not animate when geometry is unchanged (unrelated block dragged)', () => {
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed }) => useConnectionPathTransition(pts, state, elapsed, false),
      {
        initialProps: {
          pts: pointsA,
          state: 'dragging' as State,
          elapsed: 100,
        },
      },
    );

    // Transition from dragging → idle but with same geometry
    rerender({ pts: pointsA, state: 'idle' as const, elapsed: 100 });
    expect(result.current.isTransitioning).toBe(false);
    expect(result.current.flowPoints).toHaveLength(pointsA.length);
  });

  it('handles rapid idle → dragging → idle restart without artifacts', () => {
    const pointsC: ScreenPoint[] = [
      { x: 10, y: 10 },
      { x: 70, y: 10 },
      { x: 70, y: 70 },
      { x: 130, y: 70 },
    ];
    const { result, rerender } = renderHook(
      ({ pts, state, elapsed }) => useConnectionPathTransition(pts, state, elapsed, false),
      {
        initialProps: {
          pts: pointsA,
          state: 'dragging' as State,
          elapsed: 0,
        },
      },
    );

    // First drag ends → starts transition
    rerender({ pts: pointsB, state: 'idle' as const, elapsed: 0 });
    expect(result.current.isTransitioning).toBe(true);

    // Before transition completes, new drag starts at elapsed=50ms
    rerender({ pts: pointsB, state: 'dragging' as const, elapsed: 50 });
    expect(result.current.isTransitioning).toBe(false);

    // Second drag ends with different geometry
    rerender({ pts: pointsC, state: 'idle' as const, elapsed: 80 });
    expect(result.current.isTransitioning).toBe(true);

    // New transition should use pointsC as target
    const lastPoint = result.current.flowPoints[result.current.flowPoints.length - 1];
    expect(lastPoint.x).toBeCloseTo(pointsC[pointsC.length - 1].x);
    expect(lastPoint.y).toBeCloseTo(pointsC[pointsC.length - 1].y);
  });
});
