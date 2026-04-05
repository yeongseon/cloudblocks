import type { Workspace } from '../../../shared/types/index';
import type {
  ArchitectureModel,
  Position,
  ResourceBlock,
  ContainerBlock,
} from '@cloudblocks/schema';
import {
  DEFAULT_BLOCK_SIZE,
  DEFAULT_CONTAINER_BLOCK_SIZE,
  inferLegacyContainerBlockProfileId,
} from '../../../shared/types/index';
import { createBlankArchitecture } from '../../../shared/types/schema';
import { getBlockDimensions } from '../../../shared/types/visualProfile';
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  pushHistory,
  resetHistory,
} from '../../../shared/utils/history';
import { generateId } from '../../../shared/utils/id';
import type { ArchitectureState } from './types';

const DEFAULT_WORKSPACE_NAME = 'My Architecture';

export function createDefaultWorkspace(): Workspace {
  const now = new Date().toISOString();

  return {
    id: generateId('ws'),
    name: DEFAULT_WORKSPACE_NAME,
    provider: 'azure',
    architecture: createBlankArchitecture(generateId('arch'), DEFAULT_WORKSPACE_NAME),
    createdAt: now,
    updatedAt: now,
  };
}

export function touchModel(model: ArchitectureModel): ArchitectureModel {
  return { ...model, updatedAt: new Date().toISOString() };
}

const BLOCK_GAP = 0.5;
const SUBNET_PAD = 1;
const VNET_PAD = 2;
const MIN_SUBNET: { width: number; depth: number } = { width: 4, depth: 6 };
const MIN_VNET: { width: number; depth: number } = { width: 8, depth: 12 };

export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function snapEvenUp(v: number): number {
  return Math.ceil(v / 2) * 2;
}

export function chooseGrid(count: number): {
  cols: number;
  rows: number;
  width: number;
  depth: number;
} {
  if (count === 0) {
    return { cols: 1, rows: 1, width: 4, depth: 6 };
  }

  const blockW = DEFAULT_BLOCK_SIZE.width;
  const blockD = DEFAULT_BLOCK_SIZE.depth;

  let best: { cols: number; rows: number; width: number; depth: number } | null = null;
  let fallback: { cols: number; rows: number; width: number; depth: number } | null = null;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const rawWidth = cols * blockW + (cols - 1) * BLOCK_GAP + 2 * SUBNET_PAD;
    const rawDepth = rows * blockD + (rows - 1) * BLOCK_GAP + 2 * SUBNET_PAD;
    const width = snapEvenUp(Math.max(MIN_SUBNET.width, rawWidth));
    const depth = snapEvenUp(Math.max(MIN_SUBNET.depth, rawDepth));
    const candidate = { cols, rows, width, depth };

    if (
      fallback === null ||
      width * depth < fallback.width * fallback.depth ||
      (width * depth === fallback.width * fallback.depth && depth < fallback.depth)
    ) {
      fallback = candidate;
    }

    const aspectRatio = Math.max(width / depth, depth / width);
    if (aspectRatio > 2) {
      continue;
    }

    if (
      best === null ||
      width * depth < best.width * best.depth ||
      (width * depth === best.width * best.depth && depth < best.depth)
    ) {
      best = candidate;
    }
  }

  return best ?? fallback ?? { cols: 1, rows: 1, width: 4, depth: 6 };
}

export function reflowBlockPositions(
  count: number,
  grid: { cols: number; rows: number; width: number; depth: number },
  containerHeight: number,
): Position[] {
  const blockW = DEFAULT_BLOCK_SIZE.width;
  const blockD = DEFAULT_BLOCK_SIZE.depth;
  const stepX = blockW + BLOCK_GAP;
  const stepZ = blockD + BLOCK_GAP;
  const contentWidth = (grid.cols - 1) * stepX;
  const contentDepth = (grid.rows - 1) * stepZ;
  const startX = -contentWidth / 2;
  const startZ = contentDepth / 2;

  return Array.from({ length: count }, (_, index) => {
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    return {
      x: roundToTenth(startX + col * stepX),
      y: containerHeight,
      z: roundToTenth(startZ - row * stepZ),
    };
  });
}

export function subnetFrameFromBounds(blocks: ResourceBlock[]): { width: number; depth: number } {
  if (blocks.length === 0) {
    return { ...MIN_SUBNET };
  }

  const halfW = DEFAULT_BLOCK_SIZE.width / 2;
  const halfD = DEFAULT_BLOCK_SIZE.depth / 2;

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const block of blocks) {
    left = Math.min(left, block.position.x - halfW);
    right = Math.max(right, block.position.x + halfW);
    top = Math.min(top, block.position.z - halfD);
    bottom = Math.max(bottom, block.position.z + halfD);
  }

  return {
    width: snapEvenUp(Math.max(MIN_SUBNET.width, right - left + 2 * SUBNET_PAD)),
    depth: snapEvenUp(Math.max(MIN_SUBNET.depth, bottom - top + 2 * SUBNET_PAD)),
  };
}

export function parentFrameFromChildSubnets(
  children: Array<{ position: { x: number; z: number }; frame: { width: number; depth: number } }>,
): { width: number; depth: number } {
  if (children.length === 0) {
    return { ...MIN_VNET };
  }

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const child of children) {
    const halfW = child.frame.width / 2;
    const halfD = child.frame.depth / 2;
    left = Math.min(left, child.position.x - halfW);
    right = Math.max(right, child.position.x + halfW);
    top = Math.min(top, child.position.z - halfD);
    bottom = Math.max(bottom, child.position.z + halfD);
  }

  return {
    width: snapEvenUp(Math.max(MIN_VNET.width, right - left + 2 * VNET_PAD)),
    depth: snapEvenUp(Math.max(MIN_VNET.depth, bottom - top + 2 * VNET_PAD)),
  };
}

export function autosizeContainerTree(
  nodes: (ContainerBlock | ResourceBlock)[],
  changedSubnetIds: string[],
  reflow: boolean,
): (ContainerBlock | ResourceBlock)[] {
  if (changedSubnetIds.length === 0 || nodes.length === 0) {
    return nodes;
  }

  const nodeUpdates = new Map<string, ContainerBlock | ResourceBlock>();
  const getCurrentNodes = (): (ContainerBlock | ResourceBlock)[] =>
    nodes.map((node) => nodeUpdates.get(node.id) ?? node);

  const getCurrentNode = (id: string): ContainerBlock | ResourceBlock | undefined => {
    const updated = nodeUpdates.get(id);
    if (updated) {
      return updated;
    }
    return nodes.find((node) => node.id === id);
  };

  const parentVNetIds = new Set<string>();

  for (const changedSubnetId of new Set(changedSubnetIds)) {
    const subnet = getCurrentNode(changedSubnetId);
    if (!subnet || subnet.kind !== 'container' || subnet.layer !== 'subnet') {
      continue;
    }

    const childResources = getCurrentNodes().filter(
      (node): node is ResourceBlock =>
        node.kind === 'resource' && node.parentId === changedSubnetId,
    );

    const nextGrid = reflow ? chooseGrid(childResources.length) : null;
    const nextSize = nextGrid ?? subnetFrameFromBounds(childResources);
    const nextFrame = {
      ...subnet.frame,
      width: nextSize.width,
      depth: nextSize.depth,
    };
    const resizedSubnet: ContainerBlock = {
      ...subnet,
      frame: nextFrame,
      ...(Object.prototype.hasOwnProperty.call(subnet, 'profileId')
        ? {
            profileId: inferLegacyContainerBlockProfileId({
              type: subnet.layer,
              size: { width: nextFrame.width, depth: nextFrame.depth },
            } as Parameters<typeof inferLegacyContainerBlockProfileId>[0]),
          }
        : {}),
    };
    nodeUpdates.set(resizedSubnet.id, resizedSubnet);

    if (reflow) {
      const positions = reflowBlockPositions(
        childResources.length,
        nextGrid ?? chooseGrid(childResources.length),
        resizedSubnet.frame.height,
      );
      childResources.forEach((child, index) => {
        nodeUpdates.set(child.id, {
          ...child,
          position: positions[index],
        });
      });
    }

    if (!resizedSubnet.parentId) {
      continue;
    }
    const parent = getCurrentNode(resizedSubnet.parentId);
    if (parent?.kind === 'container' && parent.resourceType === 'virtual_network') {
      parentVNetIds.add(parent.id);
    }
  }

  for (const parentId of parentVNetIds) {
    const parent = getCurrentNode(parentId);
    if (!parent || parent.kind !== 'container') {
      continue;
    }

    const childSubnets = getCurrentNodes().filter(
      (node): node is ContainerBlock =>
        node.kind === 'container' && node.parentId === parentId && node.layer === 'subnet',
    );
    const parentSize = parentFrameFromChildSubnets(
      childSubnets.map((child) => ({
        position: { x: child.position.x, z: child.position.z },
        frame: { width: child.frame.width, depth: child.frame.depth },
      })),
    );

    const nextParentFrame = {
      ...parent.frame,
      width: parentSize.width,
      depth: parentSize.depth,
    };
    const resizedParent: ContainerBlock = {
      ...parent,
      frame: nextParentFrame,
      ...(Object.prototype.hasOwnProperty.call(parent, 'profileId')
        ? {
            profileId: inferLegacyContainerBlockProfileId({
              type: parent.layer,
              size: { width: nextParentFrame.width, depth: nextParentFrame.depth },
            } as Parameters<typeof inferLegacyContainerBlockProfileId>[0]),
          }
        : {}),
    };
    nodeUpdates.set(parentId, resizedParent);
  }

  if (nodeUpdates.size === 0) {
    return nodes;
  }

  return nodes.map((node) => nodeUpdates.get(node.id) ?? node);
}

export function nextGridPosition(
  existingBlocks: ResourceBlock[],
  plateSize: { width: number; depth: number },
  blockSize?: { width: number; depth: number },
  containerHeight: number = 0.5,
): Position {
  const blockWidth = blockSize?.width ?? DEFAULT_BLOCK_SIZE.width;
  const blockDepth = blockSize?.depth ?? DEFAULT_BLOCK_SIZE.depth;
  const spacing = 0.2;
  const stepX = blockWidth + spacing;
  const stepZ = blockDepth + spacing;

  const maxCols = Math.max(1, Math.floor((plateSize.width - blockWidth) / stepX) + 1);
  const index = existingBlocks.length;
  const col = index % maxCols;
  const row = Math.floor(index / maxCols);
  const startX = -((maxCols - 1) * stepX) / 2;
  const startZ = 0;

  return {
    x: roundToTenth(startX + col * stepX),
    y: containerHeight,
    z: roundToTenth(startZ - row * stepZ),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampWithinParent(
  relativePosition: { x: number; z: number },
  parentSize: { width: number; depth: number },
  childSize: { width: number; depth: number },
): { x: number; z: number } {
  const minX = -(parentSize.width / 2) + childSize.width / 2;
  const maxX = parentSize.width / 2 - childSize.width / 2;
  const minZ = -(parentSize.depth / 2) + childSize.depth / 2;
  const maxZ = parentSize.depth / 2 - childSize.depth / 2;

  return {
    x: clamp(relativePosition.x, minX, maxX),
    z: clamp(relativePosition.z, minZ, maxZ),
  };
}

export function withHistory(
  state: ArchitectureState,
  newArch: ArchitectureModel,
): Partial<ArchitectureState> {
  const newHistory = pushHistory(state.history, state.workspace.architecture);

  return {
    workspace: {
      ...state.workspace,
      architecture: touchModel(newArch),
      updatedAt: new Date().toISOString(),
    },
    history: newHistory,
    canUndo: historyCanUndo(newHistory),
    canRedo: historyCanRedo(newHistory),
    validationResult: null,
  };
}

export function upsertCurrentWorkspace(workspaces: Workspace[], workspace: Workspace): Workspace[] {
  const updated = workspaces.map((candidate) =>
    candidate.id === workspace.id ? workspace : candidate,
  );

  if (!updated.find((candidate) => candidate.id === workspace.id)) {
    updated.push(workspace);
  }

  return updated;
}

export function resetTransientState(): Pick<
  ArchitectureState,
  'validationResult' | 'history' | 'canUndo' | 'canRedo'
> {
  return {
    validationResult: null,
    history: resetHistory(),
    canUndo: false,
    canRedo: false,
  };
}

/**
 * Generic AABB overlap on XZ plane (touching edges excluded).
 * Both container and resource blocks use center-based positions with
 * half-width/half-depth extents, so a single implementation covers both.
 */
export function blocksOverlapAABB(
  posA: { x: number; z: number },
  sizeA: { width: number; depth: number },
  posB: { x: number; z: number },
  sizeB: { width: number; depth: number },
): boolean {
  const halfWA = sizeA.width / 2;
  const halfDA = sizeA.depth / 2;
  const halfWB = sizeB.width / 2;
  const halfDB = sizeB.depth / 2;

  const overlapX = posA.x - halfWA < posB.x + halfWB && posA.x + halfWA > posB.x - halfWB;
  const overlapZ = posA.z - halfDA < posB.z + halfDB && posA.z + halfDA > posB.z - halfDB;

  return overlapX && overlapZ;
}

/** @deprecated Use `blocksOverlapAABB` — kept as alias for existing call sites. */
export const containerBlocksOverlap = blocksOverlapAABB;

/** @deprecated Use `blocksOverlapAABB` — kept as alias for existing call sites. */
export const resourceBlocksOverlap = blocksOverlapAABB;

/**
 * Check whether moving a resource block to `candidatePos` would overlap any sibling.
 *
 * **Escape-hatch behaviour**: when `currentPos` is provided and the block is
 * already overlapping at that position, the function returns `false` (no overlap)
 * unconditionally — even if `candidatePos` would overlap a *different* sibling.
 * This is intentional: the goal is to never trap the user. Once the block reaches
 * a valid (non-overlapping) position, normal collision checks resume.
 *
 * Why "allow any move while invalid"?
 * - The user may need to traverse through other blocks to reach an open space.
 * - A stricter "only allow moves that reduce overlap" policy would still trap
 *   blocks in tight layouts where the only exit path crosses another sibling.
 * - Post-placement validation (`validateNoOverlap` in placement.ts) ensures that
 *   any remaining overlap is surfaced as a validation error for the user to fix.
 */
export function overlapsAnySiblingResource(
  candidatePos: { x: number; z: number },
  candidateSize: { width: number; depth: number },
  siblings: ReadonlyArray<{
    id: string;
    position: { x: number; z: number };
    category: ResourceBlock['category'];
    provider: ResourceBlock['provider'];
    subtype?: ResourceBlock['subtype'];
  }>,
  excludeId: string,
  currentPos?: { x: number; z: number },
): boolean {
  // Escape hatch: if block is already overlapping at its current position,
  // allow the move so the user can drag it out of the invalid state.
  if (currentPos) {
    const alreadyOverlapping = siblings.some((sibling) => {
      if (sibling.id === excludeId) return false;
      const siblingSize = getBlockDimensions(sibling.category, sibling.provider, sibling.subtype);
      return blocksOverlapAABB(currentPos, candidateSize, sibling.position, siblingSize);
    });
    if (alreadyOverlapping) return false;
  }

  return siblings.some((sibling) => {
    if (sibling.id === excludeId) {
      return false;
    }

    const siblingSize = getBlockDimensions(sibling.category, sibling.provider, sibling.subtype);
    return blocksOverlapAABB(candidatePos, candidateSize, sibling.position, siblingSize);
  });
}

export function overlapsSibling(
  candidatePos: { x: number; z: number },
  candidateSize: { width: number; depth: number },
  siblings: ReadonlyArray<{
    id: string;
    position: { x: number; z: number };
    frame: { width: number; depth: number };
  }>,
  excludeId?: string,
): boolean {
  return siblings.some(
    (sibling) =>
      sibling.id !== excludeId &&
      containerBlocksOverlap(candidatePos, candidateSize, sibling.position, sibling.frame),
  );
}

export function findNonOverlappingPosition(
  initialPos: { x: number; z: number },
  plateSize: { width: number; depth: number },
  siblings: ReadonlyArray<{
    id: string;
    position: { x: number; z: number };
    frame: { width: number; depth: number };
  }>,
): { x: number; z: number } {
  const pos = { ...initialPos };
  const step = plateSize.width + 1.0;
  const maxAttempts = 50;

  for (let i = 0; i < maxAttempts; i++) {
    if (!overlapsSibling(pos, plateSize, siblings)) {
      return pos;
    }
    pos.x += step;
  }

  return pos;
}

/** Binary-search refinement: reduces delta to last non-overlapping fraction. */
export function resolveMoveDelta(
  container: {
    id: string;
    position: { x: number; z: number };
    frame: { width: number; depth: number };
  },
  deltaX: number,
  deltaZ: number,
  siblings: ReadonlyArray<{
    id: string;
    position: { x: number; z: number };
    frame: { width: number; depth: number };
  }>,
): { deltaX: number; deltaZ: number } {
  const targetPos = {
    x: container.position.x + deltaX,
    z: container.position.z + deltaZ,
  };

  if (!overlapsSibling(targetPos, container.frame, siblings, container.id)) {
    return { deltaX, deltaZ };
  }

  let lo = 0;
  let hi = 1;
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const testPos = {
      x: container.position.x + deltaX * mid,
      z: container.position.z + deltaZ * mid,
    };
    if (overlapsSibling(testPos, container.frame, siblings, container.id)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return {
    deltaX: deltaX * lo,
    deltaZ: deltaZ * lo,
  };
}

export { DEFAULT_CONTAINER_BLOCK_SIZE as DEFAULT_PLATE_SIZE };

/**
 * Auto-suffix a workspace name if it already exists in the list.
 * "My Project" → "My Project (2)", "My Project (3)", etc.
 * If excludeId is provided, that workspace is excluded from the collision check
 * (useful for rename where the current workspace already has a slot).
 */
export function deduplicateWorkspaceName(
  name: string,
  workspaces: Workspace[],
  excludeId?: string,
): string {
  const existing = new Set(
    workspaces.filter((ws) => !excludeId || ws.id !== excludeId).map((ws) => ws.name),
  );
  if (!existing.has(name)) return name;

  let counter = 2;
  while (existing.has(`${name} (${counter})`)) {
    counter++;
  }
  return `${name} (${counter})`;
}
