import type { Block } from '@cloudblocks/schema';
import { getBlockDimensions } from '../../../shared/types/visualProfile';
import { screenToWorld, snapToGrid, worldToScreen } from '../../../shared/utils/isometric';
import type { Point2D } from './viewportUtils';

export interface ViewportRect {
  left: number;
  top: number;
}

export interface SnappedPlacement {
  localPoint: Point2D;
  worldPoint: { x: number; z: number };
  screenPoint: Point2D;
}

export function getScenePointFromViewportPoint(
  clientX: number,
  clientY: number,
  viewportRect: ViewportRect,
  pan: Point2D,
  zoom: number,
): Point2D {
  return {
    x: (clientX - viewportRect.left - pan.x) / zoom,
    y: (clientY - viewportRect.top - pan.y) / zoom,
  };
}

export function getSnappedPlacement(
  clientX: number,
  clientY: number,
  viewportRect: ViewportRect,
  pan: Point2D,
  zoom: number,
  origin: Point2D,
): SnappedPlacement {
  const localPoint = getScenePointFromViewportPoint(clientX, clientY, viewportRect, pan, zoom);
  const worldPoint = screenToWorld(localPoint.x, localPoint.y, 0, origin.x, origin.y);
  const snappedWorldPoint = snapToGrid(worldPoint.worldX, worldPoint.worldZ);
  const screenPoint = worldToScreen(
    snappedWorldPoint.x,
    0,
    snappedWorldPoint.z,
    origin.x,
    origin.y,
  );

  return {
    localPoint,
    worldPoint: snappedWorldPoint,
    screenPoint,
  };
}

export function computeOccupiedCellsByContainer(nodes: Block[]): Map<string, Set<string>> {
  const occupiedCellsByContainer = new Map<string, Set<string>>();

  for (const node of nodes) {
    if (node.kind !== 'resource' || node.parentId === null) {
      continue;
    }

    const dimensions = getBlockDimensions(node.category, node.provider, node.subtype);
    const occupiedCells = occupiedCellsByContainer.get(node.parentId) ?? new Set<string>();

    for (let dx = 0; dx < dimensions.width; dx++) {
      for (let dz = 0; dz < dimensions.depth; dz++) {
        occupiedCells.add(`${node.position.x + dx}:${node.position.z + dz}`);
      }
    }

    occupiedCellsByContainer.set(node.parentId, occupiedCells);
  }

  return occupiedCellsByContainer;
}
