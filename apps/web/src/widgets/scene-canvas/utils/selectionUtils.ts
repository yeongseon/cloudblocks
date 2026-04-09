import type { Block, ContainerBlock } from '@cloudblocks/schema';
import { worldToScreen } from '../../../shared/utils/isometric';
import { getScenePointFromViewportPoint, type ViewportRect } from './placementUtils';
import type { Point2D, Rect2D } from './viewportUtils';

export const LASSO_THRESHOLD = 5;

export function createLassoRect(
  start: Point2D,
  current: Point2D,
  viewportRect: ViewportRect,
  pan: Point2D,
  zoom: number,
  threshold = LASSO_THRESHOLD,
): Rect2D | null {
  if (Math.abs(current.x - start.x) < threshold && Math.abs(current.y - start.y) < threshold) {
    return null;
  }

  const worldStart = getScenePointFromViewportPoint(start.x, start.y, viewportRect, pan, zoom);
  const worldCurrent = getScenePointFromViewportPoint(
    current.x,
    current.y,
    viewportRect,
    pan,
    zoom,
  );

  return {
    x: Math.min(worldStart.x, worldCurrent.x),
    y: Math.min(worldStart.y, worldCurrent.y),
    width: Math.abs(worldCurrent.x - worldStart.x),
    height: Math.abs(worldCurrent.y - worldStart.y),
  };
}

export function pointInRect(point: Point2D, rect: Rect2D): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function getNodeScenePoint(
  node: Block,
  parentContainers: ReadonlyMap<string, ContainerBlock>,
  origin: Point2D,
): Point2D | null {
  if (node.kind === 'resource' && node.parentId !== null) {
    const parentContainer = parentContainers.get(node.parentId);
    if (!parentContainer?.frame) {
      return null;
    }

    return worldToScreen(
      parentContainer.position.x + node.position.x,
      parentContainer.position.y + parentContainer.frame.height,
      parentContainer.position.z + node.position.z,
      origin.x,
      origin.y,
    );
  }

  return worldToScreen(node.position.x, node.position.y, node.position.z, origin.x, origin.y);
}

export function getLassoSelectionIds(
  nodes: Block[],
  parentContainers: ReadonlyMap<string, ContainerBlock>,
  origin: Point2D,
  lassoRect: Rect2D,
): string[] {
  return nodes
    .filter((node) => {
      const point = getNodeScenePoint(node, parentContainers, origin);
      return point ? pointInRect(point, lassoRect) : false;
    })
    .map((node) => node.id);
}
