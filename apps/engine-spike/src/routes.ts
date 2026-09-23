import type { Connection, ResourceBlock } from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import { activeFixture } from './activeFixture';
import { containers, endpointBlocks, location, parentOf } from './geometry';
import type { MovePositions } from './geometry';

export type RoutePoint = readonly [x: number, y: number, z: number];

export interface DisplayRoute {
  id: string;
  semantic: 'http' | 'data';
  points: RoutePoint[];
}

const root = containers.find((node) => node.id === 'vnet');
if (!root) throw new Error('Missing network surface');
const networkY = -1.2 + 1.7 + 0.08;
const groundY = -2.2 + 0.8 + 0.08;
const subnetY = 0.45 + 2.6 + 0.08;
const westNetworkEdge = -root.frame.width / 2;

function subnetEdge(id: string, side: 'left' | 'right'): number {
  const container = containers.find((candidate) => candidate.id === id);
  if (!container) throw new Error(`Missing surface ${id}`);
  return location(container).x + ((side === 'left' ? -1 : 1) * container.frame.width) / 2;
}

function socket(block: ResourceBlock, side: 'input' | 'output', moved: MovePositions): RoutePoint {
  const position = location(block, moved);
  const y = parentOf(block, moved) === null ? groundY : subnetY;
  return side === 'output' ? [position.x, y, position.z + 2] : [position.x - 2, y, position.z];
}

function append(points: RoutePoint[], point: RoutePoint): void {
  const last = points.at(-1);
  if (last && last.every((value, index) => Math.abs(value - point[index]) < 0.001)) return;
  points.push(point);
}

export function displayRoute(
  connection: Connection,
  moved: MovePositions = new Map(),
): DisplayRoute {
  const [source, target] = endpointBlocks(connection);
  const semantic = parseEndpointId(connection.from)?.semantic;
  if (semantic !== 'http' && semantic !== 'data')
    throw new Error(`Unsupported route ${connection.id}`);
  const start = socket(source, 'output', moved);
  const end = socket(target, 'input', moved);
  const points: RoutePoint[] = [start];
  const sourceParent = parentOf(source, moved);
  const targetParent = parentOf(target, moved);

  if (sourceParent && sourceParent === targetParent) {
    const lane = Math.min(location(source, moved).z, location(target, moved).z) - 2.5;
    append(points, [start[0], subnetY, lane]);
    append(points, [end[0], subnetY, lane]);
    append(points, end);
  } else if (!sourceParent && !targetParent) {
    append(points, [start[0], groundY, end[2]]);
    append(points, end);
  } else if (!sourceParent && targetParent) {
    const westSubnetEdge = subnetEdge(targetParent, 'left');
    append(points, [westNetworkEdge - 0.7, groundY, start[2]]);
    append(points, [westNetworkEdge, groundY, start[2]]);
    append(points, [westNetworkEdge, networkY, start[2]]);
    append(points, [westSubnetEdge, networkY, start[2]]);
    append(points, [westSubnetEdge, subnetY, start[2]]);
    append(points, [end[0], subnetY, start[2]]);
    append(points, end);
  } else if (sourceParent && !targetParent) {
    const sourceEdge = subnetEdge(sourceParent, 'left');
    append(points, [sourceEdge, subnetY, start[2]]);
    append(points, [sourceEdge, networkY, start[2]]);
    append(points, [westNetworkEdge, networkY, start[2]]);
    append(points, [westNetworkEdge, groundY, start[2]]);
    append(points, [end[0], groundY, start[2]]);
    append(points, end);
  } else {
    const crossIndex = activeFixture.connections
      .filter((item) => {
        const [from, to] = endpointBlocks(item);
        return from.parentId !== null && from.parentId !== to.parentId;
      })
      .findIndex((item) => item.id === connection.id);
    if (!sourceParent || !targetParent) throw new Error(`Unsupported route ${connection.id}`);
    const sourceEdge = subnetEdge(sourceParent, 'right');
    const targetEdge = subnetEdge(targetParent, 'left');
    const passageX = sourceEdge + 0.24 + crossIndex * 0.26;
    append(points, [sourceEdge, subnetY, start[2]]);
    append(points, [sourceEdge, networkY, start[2]]);
    append(points, [passageX, networkY, start[2]]);
    append(points, [passageX, networkY, end[2]]);
    append(points, [targetEdge, networkY, end[2]]);
    append(points, [targetEdge, subnetY, end[2]]);
    append(points, end);
  }

  return { id: connection.id, semantic, points };
}

export const displayRoutes = activeFixture.connections.map((connection) =>
  displayRoute(connection),
);
