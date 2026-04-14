/**
 * Hook for animating connection path transitions during block snap-to-grid.
 *
 * When `interactionState` transitions from 'dragging' → 'idle', the hook
 * captures the previous flowPoints and interpolates toward the new (post-snap)
 * flowPoints over a 180ms easeOutCubic curve.
 *
 * Design by Oracle consultation (Issue #1837).
 *
 * Key decisions:
 *  - Interpolates dense `flowPoints` arrays (NOT raw centerline, NOT SVG `d`).
 *  - Arc-length resampling normalizes different-length from/to arrays.
 *  - Endpoint pinning: first & last sample always use post-snap positions.
 *  - New drag cancels active transition immediately.
 *  - Reduced motion skips animation entirely.
 */

import { useState } from 'react';
import type { ScreenPoint } from '../../shared/utils/isometric';
import type { InteractionState } from '../store/uiStore';

// ─── Constants ──────────────────────────────────────────────────────

const TRANSITION_DURATION_MS = 180;
const MIN_SAMPLES = 12;
const MAX_SAMPLES = 48;

// ─── Easing ─────────────────────────────────────────────────────────

/** Ease-out cubic: fast start, gentle deceleration. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

// ─── Geometry comparison ─────────────────────────────────────────

const EPSILON = 0.5; // sub-pixel threshold for geometry equality

/**
 * Check if two point arrays represent the same geometry (within epsilon).
 * Used to skip transitions when an unrelated block was dragged.
 */
function pointsEqual(a: readonly ScreenPoint[], b: readonly ScreenPoint[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i].x - b[i].x) > EPSILON || Math.abs(a[i].y - b[i].y) > EPSILON) {
      return false;
    }
  }
  return true;
}

// ─── Arc-length resampling ──────────────────────────────────────────

/** Compute cumulative arc-length distances for a polyline. */
function cumulativeLengths(points: readonly ScreenPoint[]): number[] {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  return lengths;
}

/**
 * Resample a polyline to `count` evenly-spaced points along its arc length.
 * Returns `count` points for normal inputs. Edge cases: returns [] for empty
 * input, and a single-element array when input has one point or count <= 1.
 */
export function resampleByArcLength(points: readonly ScreenPoint[], count: number): ScreenPoint[] {
  if (points.length === 0) return [];
  if (points.length === 1 || count <= 1) return [points[0]];

  const lengths = cumulativeLengths(points);
  const totalLength = lengths[lengths.length - 1];

  // Degenerate: all points are the same
  if (totalLength < 1e-6) {
    return Array.from({ length: count }, () => ({ ...points[0] }));
  }

  const result: ScreenPoint[] = [];
  let segIdx = 0;

  for (let i = 0; i < count; i++) {
    const targetLen = (i / (count - 1)) * totalLength;

    // Advance segment index to the one containing targetLen
    while (segIdx < lengths.length - 2 && lengths[segIdx + 1] < targetLen) {
      segIdx++;
    }

    const segStart = lengths[segIdx];
    const segEnd = lengths[segIdx + 1];
    const segLen = segEnd - segStart;

    if (segLen < 1e-9) {
      result.push({ ...points[segIdx] });
    } else {
      const t = (targetLen - segStart) / segLen;
      result.push({
        x: points[segIdx].x + (points[segIdx + 1].x - points[segIdx].x) * t,
        y: points[segIdx].y + (points[segIdx + 1].y - points[segIdx].y) * t,
      });
    }
  }

  return result;
}

// ─── Interpolation ──────────────────────────────────────────────────

/**
 * Linearly interpolate between two resampled arrays of equal length.
 * Pin first, last, second, and penultimate points to `to` values
 * (endpoint + tangent pinning prevents arrowhead wobble).
 */
function interpolateFlowPoints(
  from: readonly ScreenPoint[],
  to: readonly ScreenPoint[],
  t: number,
): ScreenPoint[] {
  const n = from.length;
  const result: ScreenPoint[] = new Array(n);

  for (let i = 0; i < n; i++) {
    // Endpoint + tangent pinning: pin first/last and their neighbors
    // to post-snap positions for stable arrowhead orientation.
    if (i === 0 || i === 1 || i === n - 2 || i === n - 1) {
      result[i] = { x: to[i].x, y: to[i].y };
    } else {
      result[i] = {
        x: from[i].x + (to[i].x - from[i].x) * t,
        y: from[i].y + (to[i].y - from[i].y) * t,
      };
    }
  }

  return result;
}

// ─── Types ──────────────────────────────────────────────────────────

// InteractionState imported from '../store/uiStore'

interface ActiveTransition {
  fromSamples: ScreenPoint[];
  toSamples: ScreenPoint[];
  startTime: number;
}

export interface PathTransitionResult {
  /** The flowPoints to render (interpolated during transition, original otherwise). */
  flowPoints: ScreenPoint[];
  /** Whether a transition is currently active. */
  isTransitioning: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Manages smooth path transitions when blocks snap to grid after dragging.
 *
 * @param currentFlowPoints - The current (post-snap) flowPoints from surfaceRender
 * @param interactionState  - Current interaction state from uiStore
 * @param elapsed           - Shared animation clock elapsed ms
 * @param reducedMotion     - Whether user prefers reduced motion
 * @returns PathTransitionResult with possibly-interpolated flowPoints
 */
export function useConnectionPathTransition(
  currentFlowPoints: readonly ScreenPoint[],
  interactionState: InteractionState,
  elapsed: number | undefined,
  reducedMotion: boolean,
): PathTransitionResult {
  const [prevInteractionState, setPrevInteractionState] =
    useState<InteractionState>(interactionState);
  const [prevFlowPoints, setPrevFlowPoints] = useState<readonly ScreenPoint[]>(currentFlowPoints);
  const [activeTransition, setActiveTransition] = useState<ActiveTransition | null>(null);

  // Detect interaction state transitions (adjust-state-during-render pattern)
  const stateChanged = prevInteractionState !== interactionState;

  if (stateChanged) {
    setPrevInteractionState(interactionState);

    if (prevInteractionState === 'dragging' && interactionState === 'idle' && !reducedMotion) {
      // Snap transition: dragging → idle
      // Skip if no animation clock (elapsed === undefined would cause stuck transition)
      if (elapsed !== undefined) {
        const prevPts = prevFlowPoints;
        const currPts = currentFlowPoints;

        // Only animate if we have valid geometry on both sides
        // and the geometry actually changed (Oracle review: geometry-change guard).
        if (prevPts.length >= 2 && currPts.length >= 2 && !pointsEqual(prevPts, currPts)) {
          const sampleCount = Math.min(
            MAX_SAMPLES,
            Math.max(MIN_SAMPLES, Math.max(prevPts.length, currPts.length)),
          );

          const fromSamples = resampleByArcLength(prevPts, sampleCount);
          const toSamples = resampleByArcLength(currPts, sampleCount);

          setActiveTransition({
            fromSamples,
            toSamples,
            startTime: elapsed,
          });
        }
      }
    } else if (interactionState === 'dragging') {
      // New drag started: cancel any active transition
      setActiveTransition(null);
    }
  }

  // Cancel transition on non-drag state changes (undo, route change, etc.)
  if (!stateChanged && interactionState !== 'idle' && activeTransition) {
    setActiveTransition(null);
  }

  // Update previous flowPoints (always track the latest geometry)
  if (!pointsEqual(currentFlowPoints, prevFlowPoints)) {
    setPrevFlowPoints(currentFlowPoints);
  }

  // If reduced motion, never animate
  if (reducedMotion && activeTransition) {
    setActiveTransition(null);
    return { flowPoints: [...currentFlowPoints], isTransitioning: false };
  }

  // If no active transition, return current geometry
  if (!activeTransition) {
    return { flowPoints: [...currentFlowPoints], isTransitioning: false };
  }

  // Compute progress
  const now = elapsed ?? 0;
  const elapsedMs = now - activeTransition.startTime;
  const rawT = Math.min(1, elapsedMs / TRANSITION_DURATION_MS);
  const t = easeOutCubic(rawT);

  // Transition complete
  if (rawT >= 1) {
    setActiveTransition(null);
    return { flowPoints: [...currentFlowPoints], isTransitioning: false };
  }

  // Interpolate
  const interpolated = interpolateFlowPoints(
    activeTransition.fromSamples,
    activeTransition.toSamples,
    t,
  );
  return { flowPoints: interpolated, isTransitioning: true };
}

// ─── Path builder for interpolated points ───────────────────────────

/**
 * Build an SVG path `d` string from interpolated flowPoints.
 * Uses simple line segments (no arc rounding needed since the points
 * are already densely sampled from rounded geometry).
 */
export function flowPointsToPath(points: readonly ScreenPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x} ${points[i].y}`);
  }
  return parts.join(' ');
}
