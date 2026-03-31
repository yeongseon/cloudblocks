import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerBlock, ResourceBlock } from '../types/index';
import { getBlockWorldPosition, getEndpointWorldPosition } from './position';
import { GRID_CELL } from './isometric';

function createPlate(id: string): ContainerBlock {
  return {
    id,
    name: `ContainerBlock ${id}`,
    kind: 'container',
    layer: 'subnet',
    resourceType: 'subnet',
    category: 'network',
    provider: 'azure',
    parentId: 'network-1',
    position: { x: 10, y: 2, z: -3 },
    frame: { width: 5, height: 2, depth: 4 },
    metadata: {},
  };
}

function createBlock(id: string, parentId: string | null): ResourceBlock {
  return {
    id,
    name: `Block ${id}`,
    kind: 'resource',
    layer: 'resource',
    resourceType: 'web_compute',
    category: 'compute',
    provider: 'azure',
    parentId,
    position: { x: 4, y: 1, z: -2 },
    metadata: {},
  };
}

describe('position utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports expected constants', () => {
    expect(GRID_CELL).toBe(1);
  });

  it('getBlockWorldPosition adds container and block positions with height offsets', () => {
    const container = createPlate('container-1');
    const block = createBlock('block-1', container.id);

    const world = getBlockWorldPosition(block, container);

    // container.position.x + block.position.x = 10 + 4 = 14
    // container.position.y + container.frame.height = 2 + 2 = 4
    // container.position.z + block.position.z = -3 + (-2) = -5
    expect(world).toEqual([14, 4, -5]);
  });

  it('getEndpointWorldPosition resolves block endpoint using parent container', () => {
    const container = createPlate('container-1');
    const block = createBlock('block-1', container.id);

    const endpoint = getEndpointWorldPosition(block.id, [block], [container]);

    expect(endpoint).toEqual([14, 4, -5]);
  });

  it('resolves root-level external block endpoints from world coordinates', () => {
    const rootBlock = createBlock('root-block', null);
    rootBlock.resourceType = 'internet';
    rootBlock.category = 'delivery';
    (rootBlock as ResourceBlock & { roles?: string[] }).roles = ['external'];
    rootBlock.position = { x: 7, y: 3, z: -2 };

    const endpoint = getEndpointWorldPosition(rootBlock.id, [rootBlock], []);

    expect(endpoint).toEqual([7, 3, -2]);
  });

  it('returns null for non-external root-level blocks with parentId null', () => {
    // A non-external block with parentId: null should NOT get actor-style handling
    const rootBlock = createBlock('orphan-block', null);
    rootBlock.position = { x: 7, y: 3, z: -2 };

    const endpoint = getEndpointWorldPosition(rootBlock.id, [rootBlock], []);

    expect(endpoint).toBeNull();
  });

  it('returns null when endpoint id cannot be resolved', () => {
    const container = createPlate('container-1');
    const block = createBlock('block-1', container.id);

    const endpoint = getEndpointWorldPosition('unknown-id', [block], [container]);

    expect(endpoint).toBeNull();
  });
});
