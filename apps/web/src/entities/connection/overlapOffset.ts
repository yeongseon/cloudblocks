import type { Connection, ConnectionType } from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import {
  OVERLAP_LANE_MIN_SPACING_PX,
  OVERLAP_LANE_SOFT_BUNDLE_WIDTH_PX,
} from '../../shared/tokens/connectionVisualTokens';

/**
 * Deterministic type ranking for lane sorting.
 * Connections are sorted by this rank within each direction bucket,
 * then by connection ID for full determinism.
 */
const TYPE_ORDER: readonly ConnectionType[] = ['dataflow', 'http', 'internal', 'data', 'async'];
const TYPE_RANK = new Map<ConnectionType, number>(TYPE_ORDER.map((type, index) => [type, index]));

/** Direction bucket relative to the canonical (alphabetically sorted) block pair. */
export type DirectionBucket = 'forward' | 'reverse';

/**
 * Resolve the connection type from metadata.
 * Falls back to 'dataflow' when metadata.type is missing or unrecognized.
 */
export function resolveConnectionType(connection: Connection): ConnectionType {
  const raw = connection.metadata?.type;
  return typeof raw === 'string' && TYPE_RANK.has(raw as ConnectionType)
    ? (raw as ConnectionType)
    : 'dataflow';
}

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
 * Parse a connection's canonical pair info: the alphabetically sorted block pair key,
 * and whether the connection flows in the canonical (forward) or reverse direction.
 * Returns null if endpoints cannot be parsed.
 */
export function getCanonicalDirection(
  connection: Connection,
): { key: string; bucket: DirectionBucket } | null {
  const from = parseEndpointId(connection.from);
  const to = parseEndpointId(connection.to);
  if (!from || !to) return null;

  const [lowId, highId] = [from.blockId, to.blockId].sort();
  const bucket: DirectionBucket =
    from.blockId === lowId && to.blockId === highId ? 'forward' : 'reverse';

  return { key: `${lowId}::${highId}`, bucket };
}

/**
 * Compute adaptive lane spacing based on the total number of connections in a group.
 * As the group grows, spacing shrinks to keep the bundle width bounded,
 * but never goes below the configured minimum.
 */
export function computeAdaptiveSpacing(groupSize: number, baseOffsetPx: number): number {
  if (groupSize <= 1) return 0;
  const raw = Math.min(baseOffsetPx, OVERLAP_LANE_SOFT_BUNDLE_WIDTH_PX / groupSize);
  return Math.max(raw, OVERLAP_LANE_MIN_SPACING_PX);
}

/** Sort connections deterministically by [type rank, id]. */
function sortBucket(bucket: readonly Connection[]): Connection[] {
  return [...bucket].sort((a, b) => {
    const rankA = TYPE_RANK.get(resolveConnectionType(a)) ?? 0;
    const rankB = TYPE_RANK.get(resolveConnectionType(b)) ?? 0;
    if (rankA !== rankB) return rankA - rankB;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Compute overlap offsets for a list of connections.
 * Returns a Map from connection.id to a screen-space perpendicular offset (px).
 *
 * Direction-aware lane allocation:
 * - Connections between the same block pair are grouped together.
 * - Within each group, connections are split into forward (low→high) and reverse (high→low)
 *   direction buckets based on the alphabetically sorted canonical block pair.
 * - Each bucket is sorted by [connection type rank, connection id] for determinism.
 * - Forward connections get positive offsets, reverse get negative offsets.
 *   Since offsetScreenPoints() computes perpendicular normals relative to path direction,
 *   opposite directions naturally separate to opposite screen sides.
 * - Spacing adapts: more connections = tighter lanes, bounded by min/max.
 * - Single connections (no overlap) get offset 0.
 */
export function computeOverlapOffsets(
  connections: readonly Connection[],
  offsetPx: number,
): Map<string, number> {
  // Phase 1: Group by canonical block pair, split into direction buckets
  const groups = new Map<string, { forward: Connection[]; reverse: Connection[] }>();

  for (const conn of connections) {
    const info = getCanonicalDirection(conn);
    if (!info) continue;

    let group = groups.get(info.key);
    if (!group) {
      group = { forward: [], reverse: [] };
      groups.set(info.key, group);
    }
    group[info.bucket].push(conn);
  }

  // Phase 2: Assign lane offsets per group
  const offsets = new Map<string, number>();

  for (const group of groups.values()) {
    const total = group.forward.length + group.reverse.length;

    // Single connection: no offset needed
    if (total <= 1) {
      const only = group.forward[0] ?? group.reverse[0];
      if (only) offsets.set(only.id, 0);
      continue;
    }

    const spacing = computeAdaptiveSpacing(total, offsetPx);
    const forward = sortBucket(group.forward);
    const reverse = sortBucket(group.reverse);

    // Assign lanes: forward gets positive offsets, reverse gets negative.
    // offsetScreenPoints() uses path-relative normals, so:
    // - Forward connections (A→B) with positive offset shift to one screen side
    // - Reverse connections (B→A) with negative offset also shift to that same
    //   mathematical side, BUT the reversed path direction flips the normal,
    //   placing them on the opposite screen side.
    //
    // For unidirectional groups (all forward or all reverse), lanes center
    // around the corridor midline for visual balance.
    if (reverse.length === 0) {
      // All forward — center the group
      const center = (forward.length - 1) / 2;
      for (let i = 0; i < forward.length; i++) {
        offsets.set(forward[i].id, (i - center) * spacing);
      }
    } else if (forward.length === 0) {
      // All reverse — center the group
      const center = (reverse.length - 1) / 2;
      for (let i = 0; i < reverse.length; i++) {
        offsets.set(reverse[i].id, (i - center) * spacing);
      }
    } else {
      // Bidirectional — forward gets positive lanes, reverse gets negative
      for (let i = 0; i < forward.length; i++) {
        offsets.set(forward[i].id, (i + 0.5) * spacing);
      }
      for (let i = 0; i < reverse.length; i++) {
        offsets.set(reverse[i].id, -(i + 0.5) * spacing);
      }
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
