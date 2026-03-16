import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, ExternalActor, Plate } from '../types/index';
import {
  EXTERNAL_ACTOR_LABEL_POSITION,
  EXTERNAL_ACTOR_POSITION,
  GRID_CELL,
  getBlockWorldPosition,
  getEndpointWorldPosition,
} from './position';

function createPlate(id: string): Plate {
  return {
    id,
    name: `Plate ${id}`,
    type: 'subnet',
    subnetAccess: 'public',
    parentId: 'network-1',
    children: [],
    position: { x: 10, y: 2, z: -3 },
    size: { width: 5, height: 2, depth: 4 },
    metadata: {},
  };
}

function createBlock(id: string, placementId: string): Block {
  return {
    id,
    name: `Block ${id}`,
    category: 'compute',
    placementId,
    position: { x: 4, y: 1, z: -2 },
    metadata: {},
  };
}

describe('position utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports expected constants', () => {
    expect(GRID_CELL).toBe(3.0);
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

  it('getEndpointWorldPosition resolves external actor endpoint and returns a copy', () => {
    const actor: ExternalActor = { id: 'ext-internet', name: 'Internet', type: 'internet' };

    const endpoint = getEndpointWorldPosition(actor.id, [], [], [actor]);

    expect(endpoint).toEqual(EXTERNAL_ACTOR_POSITION);
    expect(endpoint).not.toBe(EXTERNAL_ACTOR_POSITION);
  });

  it('falls back to external actor when block exists but parent plate is missing', () => {
    const id = 'shared-id';
    const block = createBlock(id, 'missing-plate');
    const actor: ExternalActor = { id, name: 'Internet', type: 'internet' };

    const endpoint = getEndpointWorldPosition(id, [block], [], [actor]);

    expect(endpoint).toEqual(EXTERNAL_ACTOR_POSITION);
  });

  it('returns null when endpoint id cannot be resolved', () => {
    const plate = createPlate('plate-1');
    const block = createBlock('block-1', plate.id);

    const endpoint = getEndpointWorldPosition('unknown-id', [block], [plate], []);

    expect(endpoint).toBeNull();
  });
});
