import { describe, expect, it } from 'vitest';
import type { Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import {
  computeContentBounds,
  computeExternalLaneBounds,
  computeFitToContentTransform,
  computeViewportOrigin,
  computeWheelViewportTransform,
  MAX_FIT_ZOOM,
  MIN_CANVAS_ZOOM,
} from '../viewportUtils';

const rootContainer: ContainerBlock = {
  id: 'container-1',
  name: 'VNet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'virtual_network',
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

describe('viewportUtils', () => {
  it('computes viewport origin from viewport size', () => {
    expect(computeViewportOrigin(1200, 800)).toEqual({ x: 600, y: 320 });
  });

  it('keeps wheel zoom centered on the pointer and clamps zoom', () => {
    const zoomIn = computeWheelViewportTransform({ x: 10, y: -20 }, 1, 300, 200, -100);
    expect(zoomIn.zoom).toBeCloseTo(1.1);
    expect(zoomIn.pan.x).toBeCloseTo(-19);
    expect(zoomIn.pan.y).toBeCloseTo(-42);

    const zoomOut = computeWheelViewportTransform({ x: 0, y: 0 }, MIN_CANVAS_ZOOM, 200, 150, 100);
    expect(zoomOut.zoom).toBe(MIN_CANVAS_ZOOM);
    expect(zoomOut.pan).toEqual({ x: 0, y: 0 });
  });

  it('returns null external lane bounds for empty input', () => {
    expect(computeExternalLaneBounds([], { x: 100, y: 100 })).toBeNull();
  });

  it('computes padded external lane bounds around root external blocks', () => {
    const externalBlocks: ResourceBlock[] = [
      {
        id: 'ext-1',
        name: 'Client',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'browser',
        category: 'delivery',
        provider: 'aws',
        parentId: null,
        position: { x: -2, y: 0, z: 1 },
        metadata: {},
        roles: ['external'],
      },
      {
        id: 'ext-2',
        name: 'Internet',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'browser',
        category: 'delivery',
        provider: 'aws',
        parentId: null,
        position: { x: 4, y: 0, z: 0 },
        metadata: {},
        roles: ['external'],
      },
    ];

    expect(computeExternalLaneBounds(externalBlocks, { x: 200, y: 150 })).toEqual({
      x: 56,
      y: 98,
      width: 392,
      height: 248,
    });
  });

  it('computes content bounds for mixed container and child resource nodes', () => {
    const bounds = computeContentBounds(
      [rootContainer, childBlock],
      new Map([[rootContainer.id, rootContainer]]),
    );

    expect(bounds).toEqual({
      x: -288,
      y: -80,
      width: 576,
      height: 352,
    });
  });

  it('returns null fit transform for empty content', () => {
    expect(
      computeFitToContentTransform([], new Map(), { width: 1200, height: 800 }, { x: 600, y: 320 }),
    ).toBeNull();
  });

  it('computes fit-to-content transform for multiple nodes', () => {
    const transform = computeFitToContentTransform(
      [rootContainer, childBlock],
      new Map([[rootContainer.id, rootContainer]]),
      { width: 1200, height: 800 },
      { x: 600, y: 320 },
    );

    expect(transform).toEqual({
      zoom: MAX_FIT_ZOOM,
      pan: { x: -120, y: -99.19999999999999 },
    });
  });

  it('falls back to the resource local position when a parent container is missing', () => {
    const orphan: Block = { ...childBlock, id: 'orphan', parentId: 'missing-parent' };

    expect(computeContentBounds([orphan], new Map())).toEqual({
      x: -68,
      y: -16,
      width: 72,
      height: 96,
    });
  });
});
