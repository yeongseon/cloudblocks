/**
 * Rounded orthogonal connection path builder.
 *
 * Converts a polyline of screen-space points into an SVG path with
 * arc-rounded corners. Also produces a densely-sampled `flowPoints`
 * array for PacketFlowLayer animation.
 *
 * Algorithm designed by Oracle consultation (ADR-0018, Issue #1830).
 *
 * Key decisions:
 *  - SVG Arc (`A`) commands, not quadratic Bezier — consistent radius
 *    at any projected angle.
 *  - Tangent trim: radius × tan(turnAngle/2), clamped to half of the
 *    shorter adjacent segment.
 *  - Sweep flag: cross > 0 ? 1 : 0 (clockwise in SVG screen coords).
 *  - Arrow reservation: straight segment reserved at path end for
 *    markerEnd orientation.
 *  - Arc sampling at ~6px intervals for smooth packet flow.
 */

import type { ScreenPoint } from '../../shared/utils/isometric';
import { CONNECTION_CORNER_RADIUS } from '../../shared/tokens/designTokens';

/** Return type for buildRoundedConnectionGeometry(). */
export interface RoundedPathGeometry {
  /** SVG path `d` attribute string. */
  path: string;
  /** Densely-sampled screen points for PacketFlowLayer animation. */
  flowPoints: ScreenPoint[];
}

const EPS = 1e-3;
const ARC_SAMPLE_PX = 6;
const MIN_ARROW_STRAIGHT_PX = 18;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Remove consecutive duplicate points (within EPS distance). */
export function dedupeConsecutivePoints(points: readonly ScreenPoint[]): ScreenPoint[] {
  if (points.length === 0) return [];
  const result: ScreenPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const cur = points[i];
    if (Math.hypot(cur.x - prev.x, cur.y - prev.y) > EPS) {
      result.push(cur);
    }
  }
  return result;
}

/**
 * Linearly interpolate between two points.
 */
function lerp(a: ScreenPoint, b: ScreenPoint, t: number): ScreenPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Sample interior points along a circular arc.
 *
 * Pushes sampled points into `out` (does NOT include entry/exit — the
 * caller adds those as part of the polyline construction).
 *
 * @param out      - accumulator for flow points
 * @param entry    - arc start point (tangent trim point on incoming segment)
 * @param exit     - arc end point (tangent trim point on outgoing segment)
 * @param inDir    - unit direction of incoming segment
 * @param outDir   - unit direction of outgoing segment
 * @param radius   - arc radius in px
 * @param cross    - 2D cross product of inDir × outDir (sign → sweep)
 */
export function sampleArcInterior(
  out: ScreenPoint[],
  entry: ScreenPoint,
  exit: ScreenPoint,
  inDir: ScreenPoint,
  outDir: ScreenPoint,
  radius: number,
  cross: number,
): void {
  // Approximate arc length for sample count.
  // turnAngle = angle between in and out directions.
  const dot = inDir.x * outDir.x + inDir.y * outDir.y;
  const clampedDot = Math.max(-1, Math.min(1, dot));
  const turnAngle = Math.acos(clampedDot);
  if (turnAngle < EPS) return; // Nearly collinear — no samples needed.

  const arcLength = radius * turnAngle;
  const sampleCount = Math.max(1, Math.round(arcLength / ARC_SAMPLE_PX));

  // Find center of the arc circle.
  // The center lies at distance `radius` from both entry and exit,
  // perpendicular to the respective segment directions.
  // For the incoming segment, perpendicular direction rotated toward the turn:
  const perpSign = cross > 0 ? 1 : -1;
  const cx = entry.x + perpSign * -inDir.y * radius;
  const cy = entry.y + perpSign * inDir.x * radius;

  // Start and end angles (atan2 from center to entry/exit).
  const startAngle = Math.atan2(entry.y - cy, entry.x - cx);
  const endAngle = Math.atan2(exit.y - cy, exit.x - cx);

  // Determine sweep direction.
  let angleDelta = endAngle - startAngle;
  if (cross > 0) {
    // Clockwise sweep (SVG sweep=1 means clockwise in screen coords).
    // We need angleDelta to be negative (CW in math coords = screen CW).
    if (angleDelta > 0) angleDelta -= 2 * Math.PI;
  } else {
    // Counter-clockwise sweep (SVG sweep=0).
    if (angleDelta < 0) angleDelta += 2 * Math.PI;
  }

  for (let i = 1; i < sampleCount; i++) {
    const t = i / sampleCount;
    const angle = startAngle + angleDelta * t;
    out.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
}

// ─── Main builder ────────────────────────────────────────────────────

/**
 * Build a rounded SVG path and dense flow-point array from a polyline.
 *
 * @param inputPoints        - Screen-space polyline (≥2 points)
 * @param radius             - Corner arc radius in px (default: CONNECTION_CORNER_RADIUS)
 * @param endStraightReserve - Minimum straight px reserved at path end for
 *                             arrow marker orientation (default: MIN_ARROW_STRAIGHT_PX)
 */
export function buildRoundedConnectionGeometry(
  inputPoints: readonly ScreenPoint[],
  radius: number = CONNECTION_CORNER_RADIUS,
  endStraightReserve: number = MIN_ARROW_STRAIGHT_PX,
): RoundedPathGeometry {
  const pts = dedupeConsecutivePoints(inputPoints);

  // Edge case: 0-1 points → degenerate.
  if (pts.length === 0) {
    return { path: '', flowPoints: [] };
  }
  if (pts.length === 1) {
    return {
      path: `M ${pts[0].x} ${pts[0].y}`,
      flowPoints: [pts[0]],
    };
  }

  // Edge case: 2 points → straight line, no corners.
  if (pts.length === 2) {
    return {
      path: `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`,
      flowPoints: [...pts],
    };
  }

  // Precompute segment lengths and unit directions.
  const n = pts.length;
  const segLen: number[] = [];
  const segDir: ScreenPoint[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.hypot(dx, dy);
    segLen.push(len);
    segDir.push(len > EPS ? { x: dx / len, y: dy / len } : { x: 0, y: 0 });
  }

  // For each interior vertex, compute the trim distance.
  // trim = radius * tan(turnAngle / 2), clamped to min(inLen/2, outLen/2).
  const trimDist: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const inD = segDir[i - 1];
    const outD = segDir[i];
    const cross = inD.x * outD.y - inD.y * outD.x;
    const dot = inD.x * outD.x + inD.y * outD.y;

    // Collinear or near-collinear → no rounding needed.
    if (Math.abs(cross) < EPS) {
      trimDist[i] = 0;
      continue;
    }

    const turnAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const halfTan = Math.tan(turnAngle / 2);
    const rawTrim = radius * halfTan;

    // Also respect endStraightReserve on the last segment.
    const inAvail = segLen[i - 1] / 2;
    let outAvail = segLen[i] / 2;
    if (i === n - 2) {
      // Last interior vertex — reserve straight segment at the end for arrow.
      const arrowReserve = Math.max(endStraightReserve, radius * 1.5);
      outAvail = Math.max(0, segLen[i] - arrowReserve) / 2;
    }

    trimDist[i] = Math.min(rawTrim, inAvail, outAvail);
  }

  // Build path string and flow points.
  const pathParts: string[] = [];
  const flowPoints: ScreenPoint[] = [];

  // Start point.
  pathParts.push(`M ${pts[0].x} ${pts[0].y}`);
  flowPoints.push(pts[0]);

  for (let i = 1; i < n; i++) {
    const trim = trimDist[i];
    const prevTrim = trimDist[i - 1] ?? 0;

    if (i < n - 1 && trim > EPS) {
      // This is an interior vertex with rounding.
      const inD = segDir[i - 1];
      const outD = segDir[i];
      const cross = inD.x * outD.y - inD.y * outD.x;

      // Entry point: trim back from vertex along incoming segment.
      const entry: ScreenPoint = {
        x: pts[i].x - inD.x * trim,
        y: pts[i].y - inD.y * trim,
      };

      // Exit point: trim forward from vertex along outgoing segment.
      const exit: ScreenPoint = {
        x: pts[i].x + outD.x * trim,
        y: pts[i].y + outD.y * trim,
      };

      // Line to entry point (from previous exit or start).
      pathParts.push(`L ${entry.x} ${entry.y}`);

      // Sample intermediate flow points along the straight segment.
      const straightStart =
        i === 1
          ? pts[0]
          : (() => {
              // Previous exit point.
              const prevInD = segDir[i - 2];
              const prevOutD = segDir[i - 1];
              const prevCross = prevInD.x * prevOutD.y - prevInD.y * prevOutD.x;
              if (Math.abs(prevCross) < EPS || prevTrim < EPS) return pts[i - 1];
              return {
                x: pts[i - 1].x + prevOutD.x * prevTrim,
                y: pts[i - 1].y + prevOutD.y * prevTrim,
              };
            })();
      sampleStraightSegment(flowPoints, straightStart, entry);

      // Arc to exit point.
      const sweepFlag = cross > 0 ? 1 : 0;
      pathParts.push(`A ${radius} ${radius} 0 0 ${sweepFlag} ${exit.x} ${exit.y}`);

      // Sample arc interior for flow points.
      sampleArcInterior(flowPoints, entry, exit, inD, outD, radius, cross);
      flowPoints.push(exit);
    } else {
      // Last point or no rounding needed — straight line.
      pathParts.push(`L ${pts[i].x} ${pts[i].y}`);

      // Sample straight segment for flow points.
      const straightStart = (() => {
        if (i === 1) return pts[0];
        const prevI = i - 1;
        if (trimDist[prevI] > EPS && prevI > 0 && prevI < n - 1) {
          const prevOutD = segDir[prevI];
          return {
            x: pts[prevI].x + prevOutD.x * trimDist[prevI],
            y: pts[prevI].y + prevOutD.y * trimDist[prevI],
          };
        }
        return pts[prevI];
      })();
      sampleStraightSegment(flowPoints, straightStart, pts[i]);
    }
  }

  return {
    path: pathParts.join(' '),
    flowPoints,
  };
}

/**
 * Sample intermediate points along a straight segment at ~ARC_SAMPLE_PX
 * intervals. Pushes intermediate points (not start) and the endpoint.
 */
function sampleStraightSegment(out: ScreenPoint[], start: ScreenPoint, end: ScreenPoint): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < EPS) return;

  const sampleCount = Math.max(1, Math.round(len / ARC_SAMPLE_PX));
  for (let i = 1; i < sampleCount; i++) {
    out.push(lerp(start, end, i / sampleCount));
  }
  out.push(end);
}
