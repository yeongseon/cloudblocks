import type { Connection } from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';

/**
 * Generate a grouping key for a connection based on source and target block IDs.
 * Connections between the same pair of blocks (regardless of direction) are grouped together.
 * Returns null if endpoints cannot be parsed.
 */
export function getOverlapGroupKey(connection: Connection): string | null {
  const from = parseEndpointId(connection.from);
  const to = parseEndpointId(connection.to);
  if (!from || !to) return null;
  const ids = [from.blockId, to.blockId].sort();
  return `${ids[0]}::${ids[1]}`;
}

/**
 * Compute overlap offsets for a list of connections.
 * Returns a Map from connection.id to a screen-space perpendicular offset (px).
 * Single connections (no overlap) get offset 0.
 */
export function computeOverlapOffsets(
  connections: readonly Connection[],
  offsetPx: number,
): Map<string, number> {
  const groups = new Map<string, Connection[]>();
  for (const conn of connections) {
    const key = getOverlapGroupKey(conn);
    if (!key) continue;
    const group = groups.get(key);
    if (group) {
      group.push(conn);
    } else {
      groups.set(key, [conn]);
    }
  }

  const offsets = new Map<string, number>();
  for (const group of groups.values()) {
    if (group.length <= 1) {
      offsets.set(group[0].id, 0);
      continue;
    }
    const center = (group.length - 1) / 2;
    for (let i = 0; i < group.length; i++) {
      offsets.set(group[i].id, (i - center) * offsetPx);
    }
  }

  return offsets;
}

/**
 * Apply a perpendicular offset to a polyline path in screen space.
 * For each segment, computes the perpendicular direction and shifts both endpoints.
 * This produces a parallel path offset by `offsetPx` pixels perpendicular to the path direction.
 */
export function offsetScreenPoints(
  points: readonly { x: number; y: number }[],
  offsetPx: number,
): { x: number; y: number }[] {
  if (points.length === 0 || offsetPx === 0) return points.map((p) => ({ x: p.x, y: p.y }));
  if (points.length === 1) return [{ x: points[0].x, y: points[0].y }];

  const result: { x: number; y: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    let nx = 0;
    let ny = 0;
    let count = 0;

    if (i > 0) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1e-6) {
        nx += -dy / len;
        ny += dx / len;
        count++;
      }
    }

    if (i < points.length - 1) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1e-6) {
        nx += -dy / len;
        ny += dx / len;
        count++;
      }
    }

    if (count > 0) {
      nx /= count;
      ny /= count;
      const nLen = Math.sqrt(nx * nx + ny * ny);
      if (nLen > 1e-6) {
        nx /= nLen;
        ny /= nLen;
      }
    }

    result.push({
      x: points[i].x + nx * offsetPx,
      y: points[i].y + ny * offsetPx,
    });
  }

  return result;
}
