/**
 * Preview connection route point builder.
 *
 * Computes a simplified orthogonal (Manhattan) polyline between a source
 * port and a cursor/snap target. The resulting points are intended to be
 * fed into `buildRoundedConnectionGeometry()` so the preview uses the
 * same rounded-corner rendering as committed connections.
 *
 * Algorithm designed by Oracle consultation (Issue #1831).
 *
 * Strategy: smart step-route with at most 2 elbows.
 *   source → (laneX, source.y) → (laneX, target.y) → target
 *
 * The first move is always horizontal (matching outbound port exit
 * direction) to avoid jitter from orientation switching.
 */

import type { ScreenPoint } from '../../shared/utils/isometric';
import { CONNECTION_CORNER_RADIUS } from '../../shared/tokens/designTokens';

/**
 * Compute the preview route polyline between source and target.
 *
 * @param source - Screen-space outbound port position
 * @param target - Screen-space cursor or magnetic snap position
 * @param radius - Corner radius (default: CONNECTION_CORNER_RADIUS)
 * @returns Array of 2-4 ScreenPoints forming an orthogonal route
 */
export function getPreviewRoutePoints(
  source: ScreenPoint,
  target: ScreenPoint,
  radius: number = CONNECTION_CORNER_RADIUS,
): ScreenPoint[] {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const minExit = radius * 2;

  // Very close targets: collapse to straight line to avoid crushed elbows.
  if (Math.abs(dx) < minExit && Math.abs(dy) < minExit) {
    return [source, target];
  }

  // Compute the vertical lane X position.
  // Clamp so the lane stays at least minExit from source (exit clearance)
  // and minExit from target (approach clearance).
  const laneX = Math.max(
    source.x + minExit,
    Math.min((source.x + target.x) / 2, target.x - minExit),
  );

  const p1: ScreenPoint = { x: laneX, y: source.y };
  const p2: ScreenPoint = { x: laneX, y: target.y };

  // Deduplicate: if source.y === target.y, p1 and p2 collapse
  // and buildRoundedConnectionGeometry will handle the dedup.
  // If laneX === source.x, p1 collapses with source.
  // If laneX === target.x, p2 collapses with target.
  // We let the geometry builder's dedupeConsecutivePoints handle these.
  return [source, p1, p2, target];
}
