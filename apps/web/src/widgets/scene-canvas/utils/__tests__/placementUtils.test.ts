import { describe, expect, it } from 'vitest';
import type { Block, ResourceBlock } from '@cloudblocks/schema';
import {
  computeOccupiedCellsByContainer,
  getScenePointFromViewportPoint,
  getSnappedPlacement,
} from '../placementUtils';

describe('placementUtils', () => {
  it('converts viewport coordinates into scene coordinates with pan and zoom', () => {
    expect(
      getScenePointFromViewportPoint(420, 310, { left: 100, top: 50 }, { x: 40, y: 20 }, 2),
    ).toEqual({ x: 140, y: 120 });
  });

  it('snaps placement to the nearest world grid and projects back to screen', () => {
    const placement = getSnappedPlacement(420, 310, { left: 100, top: 50 }, { x: 40, y: 20 }, 2, {
      x: 200,
      y: 150,
    });

    expect(placement).toEqual({
      localPoint: { x: 140, y: 120 },
      worldPoint: { x: -2, z: 0 },
      screenPoint: { x: 136, y: 118 },
    });
  });

  it('tracks occupied cells for each container using block footprint dimensions', () => {
    const nodes: Block[] = [
      {
        id: 'resource-1',
        name: 'App',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'web_compute',
        category: 'compute',
        provider: 'aws',
        parentId: 'container-a',
        position: { x: 2, y: 0, z: 3 },
        metadata: {},
      },
      {
        id: 'resource-2',
        name: 'Cache',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'cache',
        category: 'data',
        provider: 'aws',
        parentId: 'container-a',
        position: { x: 5, y: 0, z: 1 },
        metadata: {},
      },
      {
        id: 'resource-3',
        name: 'Client',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'browser',
        category: 'delivery',
        provider: 'aws',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
        roles: ['external'],
      } satisfies ResourceBlock,
    ];

    const occupiedCells = computeOccupiedCellsByContainer(nodes);

    expect([...occupiedCells.keys()]).toEqual(['container-a']);
    expect([...occupiedCells.get('container-a')!]).toEqual([
      '2:3',
      '2:4',
      '3:3',
      '3:4',
      '5:1',
      '5:2',
      '5:3',
      '6:1',
      '6:2',
      '6:3',
      '7:1',
      '7:2',
      '7:3',
    ]);
  });

  it('returns an empty map when there are no container-scoped resources', () => {
    expect(
      computeOccupiedCellsByContainer([
        {
          id: 'resource-1',
          name: 'Client',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'browser',
          category: 'delivery',
          provider: 'aws',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          metadata: {},
          roles: ['external'],
        },
      ]),
    ).toEqual(new Map());
  });
});
