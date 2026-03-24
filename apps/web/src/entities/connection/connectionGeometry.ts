import { CONNECTION_HEIGHT_CU, CONNECTION_WIDTH_CU } from '../../shared/tokens/designTokens';
import { worldToScreen } from '../../shared/utils/isometric';
import type { ScreenPoint } from '../../shared/utils/isometric';
import type { SurfaceRoute, WorldPoint3 } from './surfaceRouting';

export interface SideFaceQuad {
  face: 'left' | 'right';
  vertices: readonly [WorldPoint3, WorldPoint3, WorldPoint3, WorldPoint3];
}

interface Point2 {
  x: number;
  z: number;
}

const EPSILON = 1e-9;

function isWorldPoint3(value: unknown): value is WorldPoint3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    typeof value[2] === 'number'
  );
}

function worldPointFromUnknown(value: unknown): WorldPoint3 | null {
  if (!isWorldPoint3(value)) {
    return null;
  }
  return [value[0], value[1], value[2]];
}

function extractSegmentEndpoints(segment: unknown): [WorldPoint3, WorldPoint3] | null {
  if (!segment || typeof segment !== 'object') {
    return null;
  }

  const record = segment as Record<string, unknown>;
  const start = worldPointFromUnknown(record.start ?? record.from ?? record.a ?? record.source);
  const end = worldPointFromUnknown(record.end ?? record.to ?? record.b ?? record.target);

  if (start && end) {
    return [start, end];
  }

  if (Array.isArray(record.points) && record.points.length >= 2) {
    const first = worldPointFromUnknown(record.points[0]);
    const last = worldPointFromUnknown(record.points[record.points.length - 1]);
    if (first && last) {
      return [first, last];
    }
  }

  return null;
}

function pointKey(point: WorldPoint3): string {
  return `${point[0]}|${point[1]}|${point[2]}`;
}

function sameXZ(a: WorldPoint3, b: WorldPoint3): boolean {
  return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[2] - b[2]) < EPSILON;
}

function flattenRoutePolyline(route: SurfaceRoute): WorldPoint3[] {
  const segments = (route as unknown as { segments?: unknown[] }).segments ?? [];
  const polyline: WorldPoint3[] = [];

  for (const segment of segments) {
    const endpoints = extractSegmentEndpoints(segment);
    if (!endpoints) {
      continue;
    }

    const [rawStart, rawEnd] = endpoints;
    const start: WorldPoint3 = [rawStart[0], rawStart[1], rawStart[2]];
    const end: WorldPoint3 = [rawEnd[0], rawEnd[1], rawEnd[2]];

    if (sameXZ(start, end)) {
      continue;
    }

    if (polyline.length === 0) {
      polyline.push(start, end);
      continue;
    }

    const last = polyline[polyline.length - 1];
    if (pointKey(last) === pointKey(start)) {
      polyline.push(end);
      continue;
    }

    if (pointKey(last) === pointKey(end)) {
      polyline.push(start);
      continue;
    }

    polyline.push(start, end);
  }

  const deduped: WorldPoint3[] = [];
  for (const point of polyline) {
    const last = deduped[deduped.length - 1];
    if (!last || !sameXZ(last, point)) {
      deduped.push(point);
    }
  }

  return mergeCollinearWaypoints(deduped);
}

function mergeCollinearWaypoints(points: WorldPoint3[]): WorldPoint3[] {
  if (points.length <= 2) {
    return points;
  }

  const merged: WorldPoint3[] = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = merged[merged.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const collinearX =
      Math.abs(prev[0] - curr[0]) < EPSILON && Math.abs(curr[0] - next[0]) < EPSILON;
    const collinearZ =
      Math.abs(prev[2] - curr[2]) < EPSILON && Math.abs(curr[2] - next[2]) < EPSILON;

    if (collinearX || collinearZ) {
      continue;
    }

    merged.push(curr);
  }

  merged.push(points[points.length - 1]);
  return merged;
}

function signedAreaXZ(vertices: readonly WorldPoint3[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    area += a[0] * b[2] - b[0] * a[2];
  }
  return area / 2;
}

function normalizeDirection(dx: number, dz: number): Point2 {
  if (Math.abs(dx) > EPSILON) {
    return { x: Math.sign(dx), z: 0 };
  }
  if (Math.abs(dz) > EPSILON) {
    return { x: 0, z: Math.sign(dz) };
  }
  return { x: 0, z: 0 };
}

function leftNormal(dir: Point2): Point2 {
  return { x: -dir.z, z: dir.x };
}

function offsetPointAt(
  point: WorldPoint3,
  prev: WorldPoint3 | null,
  next: WorldPoint3 | null,
  sideSign: 1 | -1,
  halfWidth: number,
): WorldPoint3 {
  if (!next && !prev) {
    return [point[0], point[1], point[2]];
  }

  if (!prev && next) {
    const dirOut = normalizeDirection(next[0] - point[0], next[2] - point[2]);
    const n = leftNormal(dirOut);
    return [point[0] + n.x * sideSign * halfWidth, point[1], point[2] + n.z * sideSign * halfWidth];
  }

  if (prev && !next) {
    const dirIn = normalizeDirection(point[0] - prev[0], point[2] - prev[2]);
    const n = leftNormal(dirIn);
    return [point[0] + n.x * sideSign * halfWidth, point[1], point[2] + n.z * sideSign * halfWidth];
  }

  const dirIn = normalizeDirection(point[0] - prev![0], point[2] - prev![2]);
  const dirOut = normalizeDirection(next![0] - point[0], next![2] - point[2]);

  if (Math.abs(dirIn.x - dirOut.x) < EPSILON && Math.abs(dirIn.z - dirOut.z) < EPSILON) {
    const n = leftNormal(dirIn);
    return [point[0] + n.x * sideSign * halfWidth, point[1], point[2] + n.z * sideSign * halfWidth];
  }

  const nIn = leftNormal(dirIn);
  const nOut = leftNormal(dirOut);

  const line1Point: Point2 = {
    x: point[0] + nIn.x * sideSign * halfWidth,
    z: point[2] + nIn.z * sideSign * halfWidth,
  };
  const line2Point: Point2 = {
    x: point[0] + nOut.x * sideSign * halfWidth,
    z: point[2] + nOut.z * sideSign * halfWidth,
  };

  const denominator = dirIn.x * dirOut.z - dirIn.z * dirOut.x;
  if (Math.abs(denominator) < EPSILON) {
    return [
      point[0] + ((nIn.x + nOut.x) * sideSign * halfWidth) / 2,
      point[1],
      point[2] + ((nIn.z + nOut.z) * sideSign * halfWidth) / 2,
    ];
  }

  const deltaX = line2Point.x - line1Point.x;
  const deltaZ = line2Point.z - line1Point.z;
  const t = (deltaX * dirOut.z - deltaZ * dirOut.x) / denominator;

  return [line1Point.x + dirIn.x * t, point[1], line1Point.z + dirIn.z * t];
}

function pointAtDistance(polyline: readonly WorldPoint3[], distance: number): WorldPoint3 {
  let remaining = distance;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const segLen = Math.abs(b[0] - a[0]) + Math.abs(b[2] - a[2]);
    if (remaining <= segLen + EPSILON) {
      if (Math.abs(b[0] - a[0]) > EPSILON) {
        const dir = Math.sign(b[0] - a[0]);
        return [a[0] + dir * remaining, a[1], a[2]];
      }
      const dir = Math.sign(b[2] - a[2]);
      return [a[0], a[1], a[2] + dir * remaining];
    }
    remaining -= segLen;
  }

  return polyline[polyline.length - 1];
}

export function buildConnectionFootprint(route: SurfaceRoute): WorldPoint3[] {
  const centerline = flattenRoutePolyline(route);
  if (centerline.length < 2) {
    return [];
  }

  const topY = route.srcPort.surfaceY + CONNECTION_HEIGHT_CU;
  const normalized = centerline.map((point) => [point[0], topY, point[2]] as WorldPoint3);

  const halfWidth = CONNECTION_WIDTH_CU / 2;
  const left: WorldPoint3[] = [];
  const right: WorldPoint3[] = [];

  for (let i = 0; i < normalized.length; i += 1) {
    const point = normalized[i];
    const prev = i > 0 ? normalized[i - 1] : null;
    const next = i < normalized.length - 1 ? normalized[i + 1] : null;
    left.push(offsetPointAt(point, prev, next, 1, halfWidth));
    right.push(offsetPointAt(point, prev, next, -1, halfWidth));
  }

  const polygon = [...left, ...right.reverse()];
  if (polygon.length >= 3 && signedAreaXZ(polygon) > 0) {
    polygon.reverse();
  }

  return polygon;
}

export function projectFootprintToScreen(
  vertices: readonly WorldPoint3[],
  originX: number,
  originY: number,
): ScreenPoint[] {
  return vertices.map((v) => worldToScreen(v[0], v[1], v[2], originX, originY));
}

export function samplePortPositions(route: SurfaceRoute): WorldPoint3[] {
  const polyline = flattenRoutePolyline(route);
  if (polyline.length < 2) {
    return [];
  }

  const topY = route.srcPort.surfaceY + CONNECTION_HEIGHT_CU;
  const normalized = polyline.map((point) => [point[0], topY, point[2]] as WorldPoint3);

  const cumulative: number[] = [0];
  for (let i = 1; i < normalized.length; i += 1) {
    const prev = normalized[i - 1];
    const curr = normalized[i];
    cumulative.push(
      cumulative[cumulative.length - 1] + Math.abs(curr[0] - prev[0]) + Math.abs(curr[2] - prev[2]),
    );
  }

  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength < 1 - EPSILON) {
    return [];
  }

  const bendDistances = new Set<number>();
  for (let i = 1; i < cumulative.length - 1; i += 1) {
    bendDistances.add(cumulative[i]);
  }

  const ports: WorldPoint3[] = [];
  for (let d = 0.5; d <= totalLength + EPSILON; d += 1) {
    const tooCloseToStart = d <= 0.5 + EPSILON;
    const tooCloseToEnd = totalLength - d <= 0.5 + EPSILON;
    if (tooCloseToStart || tooCloseToEnd) {
      continue;
    }

    let nearBend = false;
    for (const bendDistance of bendDistances) {
      if (Math.abs(d - bendDistance) <= 0.5 + EPSILON) {
        nearBend = true;
        break;
      }
    }
    if (nearBend) {
      continue;
    }

    ports.push(pointAtDistance(normalized, d));
  }

  if (ports.length === 0 && totalLength >= 2 - EPSILON) {
    const midpointDistance = totalLength / 2;
    let nearBend = false;
    for (const bendDistance of bendDistances) {
      if (Math.abs(midpointDistance - bendDistance) <= 0.5 + EPSILON) {
        nearBend = true;
        break;
      }
    }

    if (
      !nearBend &&
      midpointDistance > 0.5 + EPSILON &&
      totalLength - midpointDistance > 0.5 + EPSILON
    ) {
      ports.push(pointAtDistance(normalized, midpointDistance));
    }
  }

  return ports;
}

export function getVisibleSideFaces(
  footprintVertices: readonly WorldPoint3[],
  topY: number,
  baseY: number,
): SideFaceQuad[] {
  if (footprintVertices.length < 3) {
    return [];
  }

  const faces: SideFaceQuad[] = [];

  for (let i = 0; i < footprintVertices.length; i += 1) {
    const a = footprintVertices[i];
    const b = footprintVertices[(i + 1) % footprintVertices.length];
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];

    const nx = -dz;
    const nz = dx;

    let face: SideFaceQuad['face'] | null = null;
    if (nx > EPSILON) {
      face = 'right';
    } else if (nz > EPSILON) {
      face = 'left';
    }

    if (!face) {
      continue;
    }

    const topA: WorldPoint3 = [a[0], topY, a[2]];
    const topB: WorldPoint3 = [b[0], topY, b[2]];
    const bottomB: WorldPoint3 = [b[0], baseY, b[2]];
    const bottomA: WorldPoint3 = [a[0], baseY, a[2]];

    faces.push({
      face,
      vertices: [topA, topB, bottomB, bottomA],
    });
  }

  return faces;
}
