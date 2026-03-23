import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerNode, ExternalActor, LeafNode } from '../types/index';
import {
  EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
  EXTERNAL_ACTOR_LABEL_POSITION,
  EXTERNAL_ACTOR_POSITION,
  getBlockWorldPosition,
  getEndpointWorldPosition,
} from './position';
import { GRID_CELL } from './isometric';

function createPlate(id: string): ContainerNode {
  return {
    id,
    name: `Plate ${id}`,
    kind: 'container',
    layer: 'subnet',
    resourceType: 'subnet',
    category: 'network',
    provider: 'azure',
    parentId: 'network-1',
    position: { x: 10, y: 2, z: -3 },
    size: { width: 5, height: 2, depth: 4 },
    metadata: {},
  };
}

function createBlock(id: string, parentId: string): LeafNode {
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
    expect(EXTERNAL_ACTOR_POSITION).toEqual([-3, 0, 5]);
    expect(EXTERNAL_ACTOR_LABEL_POSITION).toEqual([-3, 1, 5]);
  });

  it('getBlockWorldPosition adds plate and block positions with height offsets', () => {
    const plate = createPlate('plate-1');
    const block = createBlock('block-1', plate.id);

    const world = getBlockWorldPosition(block, plate);

    // plate.position.x + block.position.x = 10 + 4 = 14
    // plate.position.y + plate.size.height = 2 + 2 = 4
    // plate.position.z + block.position.z = -3 + (-2) = -5
    expect(world).toEqual([14, 4, -5]);
  });

  it('getEndpointWorldPosition resolves block endpoint using parent plate', () => {
    const plate = createPlate('plate-1');
    const block = createBlock('block-1', plate.id);

    const endpoint = getEndpointWorldPosition(block.id, [block], [plate], []);

    expect(endpoint).toEqual([14, 4, -5]);
  });

  it('getEndpointWorldPosition resolves external actor endpoint from actor position', () => {
    const actor: ExternalActor = {
      id: 'ext-internet',
      name: 'Internet',
      type: 'internet',
      position: { x: 42, y: 1, z: -7 },
    };

    const endpoint = getEndpointWorldPosition(actor.id, [], [], [actor]);

    expect(endpoint).toEqual([42, 1 + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, -7]);
  });

  it('falls back to external actor when block exists but parent plate is missing', () => {
    const id = 'shared-id';
    const block = createBlock(id, 'missing-plate');
    const actor: ExternalActor = {
      id,
      name: 'Internet',
      type: 'internet',
      position: { x: -2, y: 3, z: 4 },
    };

    const endpoint = getEndpointWorldPosition(id, [block], [], [actor]);

    expect(endpoint).toEqual([-2, 3 + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET, 4]);
  });

  it('falls back to default external actor position for legacy actor payloads', () => {
    const legacyActor = { id: 'ext-legacy', name: 'Internet', type: 'internet' } as unknown as ExternalActor;

    const endpoint = getEndpointWorldPosition(legacyActor.id, [], [], [legacyActor]);

    expect(endpoint).toEqual([
      EXTERNAL_ACTOR_POSITION[0],
      EXTERNAL_ACTOR_POSITION[1] + EXTERNAL_ACTOR_ENDPOINT_Y_OFFSET,
      EXTERNAL_ACTOR_POSITION[2],
    ]);
  });

  it('returns null when endpoint id cannot be resolved', () => {
    const plate = createPlate('plate-1');
    const block = createBlock('block-1', plate.id);

    const endpoint = getEndpointWorldPosition('unknown-id', [block], [plate], []);

    expect(endpoint).toBeNull();
  });
});
