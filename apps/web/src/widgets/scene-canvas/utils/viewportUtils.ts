import type { Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { worldSizeToScreen, worldToScreen } from '../../../shared/utils/isometric';

export interface Point2D {
  x: number;
  y: number;
}

export interface Rect2D extends Point2D {
  width: number;
  height: number;
}

export interface ViewportTransform {
  pan: Point2D;
  zoom: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export const MIN_CANVAS_ZOOM = 0.3;
export const MAX_CANVAS_ZOOM = 3;
export const MAX_FIT_ZOOM = 1.2;
export const FIT_TO_CONTENT_PADDING = 80;
export const EXTERNAL_LANE_PADDING_X = 48;
export const EXTERNAL_LANE_PADDING_Y = 36;
export const EXTERNAL_BLOCK_WIDTH = 72;
export const EXTERNAL_BLOCK_HEIGHT = 96;
export const BLOCK_HALF_WIDTH = 36;
export const BLOCK_HEIGHT = 96;

export function computeViewportOrigin(width: number, height: number): Point2D {
  return { x: width / 2, y: height * 0.4 };
}

export function clampZoom(
  zoom: number,
  minZoom = MIN_CANVAS_ZOOM,
  maxZoom = MAX_CANVAS_ZOOM,
): number {
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

export function computeWheelViewportTransform(
  pan: Point2D,
  zoom: number,
  mouseX: number,
  mouseY: number,
  deltaY: number,
): ViewportTransform {
  const zoomDelta = deltaY > 0 ? 0.9 : 1.1;
  const nextZoom = clampZoom(zoom * zoomDelta);
  const scaleChange = nextZoom / zoom;

  return {
    zoom: nextZoom,
    pan: {
      x: mouseX - (mouseX - pan.x) * scaleChange,
      y: mouseY - (mouseY - pan.y) * scaleChange,
    },
  };
}

export function computeExternalLaneBounds(
  externalBlocks: ResourceBlock[],
  origin: Point2D,
): Rect2D | null {
  if (externalBlocks.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const block of externalBlocks) {
    const screenPoint = worldToScreen(
      block.position.x,
      block.position.y,
      block.position.z,
      origin.x,
      origin.y,
    );
    minX = Math.min(minX, screenPoint.x);
    minY = Math.min(minY, screenPoint.y);
    maxX = Math.max(maxX, screenPoint.x);
    maxY = Math.max(maxY, screenPoint.y);
  }

  return {
    x: minX - EXTERNAL_LANE_PADDING_X,
    y: minY - EXTERNAL_LANE_PADDING_Y,
    width: maxX - minX + EXTERNAL_BLOCK_WIDTH + EXTERNAL_LANE_PADDING_X * 2,
    height: maxY - minY + EXTERNAL_BLOCK_HEIGHT + EXTERNAL_LANE_PADDING_Y * 2,
  };
}

function getContainerScreenBounds(container: ContainerBlock): Rect2D {
  const screenPoint = worldToScreen(
    container.position.x,
    container.position.y,
    container.position.z,
    0,
    0,
  );

  if (!container.frame) {
    return { x: screenPoint.x, y: screenPoint.y, width: 0, height: 0 };
  }

  const { screenWidth, screenHeight } = worldSizeToScreen(
    container.frame.width,
    container.frame.height,
    container.frame.depth,
  );
  const diamondHalfHeight = screenWidth / 4;

  return {
    x: screenPoint.x - screenWidth / 2,
    y: screenPoint.y - diamondHalfHeight - (screenHeight - 2 * diamondHalfHeight),
    width: screenWidth,
    height: diamondHalfHeight * 2 + (screenHeight - 2 * diamondHalfHeight),
  };
}

function getResourceWorldPosition(
  block: ResourceBlock,
  parentContainers: ReadonlyMap<string, ContainerBlock>,
) {
  if (!block.parentId) {
    return block.position;
  }

  const parent = parentContainers.get(block.parentId);
  if (!parent) {
    return block.position;
  }

  return {
    x: parent.position.x + block.position.x,
    y: parent.position.y + (parent.frame?.height ?? 0),
    z: parent.position.z + block.position.z,
  };
}

export function computeContentBounds(
  nodes: Block[],
  parentContainers: ReadonlyMap<string, ContainerBlock>,
): Rect2D | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    if (node.kind === 'container') {
      const bounds = getContainerScreenBounds(node);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
      continue;
    }

    const worldPosition = getResourceWorldPosition(node, parentContainers);
    const screenPoint = worldToScreen(worldPosition.x, worldPosition.y, worldPosition.z, 0, 0);
    minX = Math.min(minX, screenPoint.x - BLOCK_HALF_WIDTH);
    maxX = Math.max(maxX, screenPoint.x + BLOCK_HALF_WIDTH);
    minY = Math.min(minY, screenPoint.y - BLOCK_HEIGHT);
    maxY = Math.max(maxY, screenPoint.y);
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function computeFitToContentTransform(
  nodes: Block[],
  parentContainers: ReadonlyMap<string, ContainerBlock>,
  viewportSize: ViewportSize,
  origin: Point2D,
): ViewportTransform | null {
  const contentBounds = computeContentBounds(nodes, parentContainers);
  if (!contentBounds) {
    return null;
  }

  const fitWidth = Math.max(1, viewportSize.width - FIT_TO_CONTENT_PADDING * 2);
  const fitHeight = Math.max(1, viewportSize.height - FIT_TO_CONTENT_PADDING * 2);
  const zoom = Math.max(
    MIN_CANVAS_ZOOM,
    Math.min(
      MAX_FIT_ZOOM,
      Math.min(fitWidth / contentBounds.width, fitHeight / contentBounds.height),
    ),
  );
  const centerX = contentBounds.x + contentBounds.width / 2;
  const centerY = contentBounds.y + contentBounds.height / 2;

  return {
    zoom,
    pan: {
      x: viewportSize.width / 2 - (origin.x + centerX) * zoom,
      y: viewportSize.height / 2 - (origin.y + centerY) * zoom,
    },
  };
}
