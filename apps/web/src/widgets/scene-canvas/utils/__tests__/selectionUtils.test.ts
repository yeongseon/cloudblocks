import { describe, expect, it } from 'vitest';
import type { Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import {
  createLassoRect,
  getLassoSelectionIds,
  getNodeScenePoint,
  pointInRect,
} from '../selectionUtils';

const container: ContainerBlock = {
  id: 'container-1',
  name: 'Subnet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'aws',
  parentId: null,
  position: { x: 4, y: 0, z: 4 },
  frame: { width: 10, height: 2, depth: 8 },
  metadata: {},
};

const childBlock: ResourceBlock = {
  id: 'resource-1',
  name: 'App',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'web_compute',
  category: 'compute',
  provider: 'aws',
  parentId: 'container-1',
  position: { x: 2, y: 0, z: 3 },
  metadata: {},
};

describe('selectionUtils', () => {
  it('returns null when drag distance does not reach lasso threshold', () => {
    expect(
      createLassoRect(
        { x: 100, y: 100 },
        { x: 103, y: 104 },
        { left: 10, top: 20 },
        { x: 0, y: 0 },
        1,
      ),
    ).toBeNull();
  });

  it('creates a normalized lasso rectangle in scene coordinates', () => {
    expect(
      createLassoRect(
        { x: 210, y: 180 },
        { x: 110, y: 80 },
        { left: 10, top: 20 },
        { x: 20, y: 30 },
        2,
      ),
    ).toEqual({ x: 40, y: 15, width: 50, height: 50 });
  });

  it('checks whether points fall inside the lasso rectangle boundaries', () => {
    const rect = { x: 10, y: 20, width: 30, height: 40 };

    expect(pointInRect({ x: 10, y: 20 }, rect)).toBe(true);
    expect(pointInRect({ x: 40, y: 60 }, rect)).toBe(true);
    expect(pointInRect({ x: 41, y: 60 }, rect)).toBe(false);
  });

  it('projects child resources using their parent container elevation', () => {
    expect(
      getNodeScenePoint(childBlock, new Map([[container.id, container]]), { x: 200, y: 100 }),
    ).toEqual({
      x: 168,
      y: 244,
    });
  });

  it('returns null for child resources whose parent container is unavailable', () => {
    expect(getNodeScenePoint(childBlock, new Map(), { x: 200, y: 100 })).toBeNull();
  });

  it('returns lasso hit ids for containers and resources inside the rectangle', () => {
    const rootBlock: ResourceBlock = {
      id: 'resource-2',
      name: 'Client',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'browser',
      category: 'delivery',
      provider: 'aws',
      parentId: null,
      position: { x: 3, y: 0, z: 1 },
      metadata: {},
      roles: ['external'],
    };
    const farAway: Block = { ...rootBlock, id: 'resource-3', position: { x: 20, y: 0, z: 20 } };

    expect(
      getLassoSelectionIds(
        [container, childBlock, rootBlock, farAway],
        new Map([[container.id, container]]),
        { x: 200, y: 100 },
        { x: 100, y: 20, width: 180, height: 240 },
      ),
    ).toEqual(['container-1', 'resource-1', 'resource-2']);
  });
});
