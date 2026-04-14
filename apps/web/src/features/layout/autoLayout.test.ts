import { describe, expect, it } from 'vitest';
import type { ArchitectureModel, Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import {
  makeTestArchitecture,
  makeTestBlock,
  makeTestPlate,
} from '../../__tests__/legacyModelTestUtils';
import { applyLayoutPatch } from './autoLayout';
import type { LayoutPatchEntry } from './elkAdapter';

/* ── Test helpers ─────────────────────────────────────────────────── */

function makeContainer(overrides: Partial<ContainerBlock> = {}): ContainerBlock {
  return makeTestPlate({
    id: 'vnet-1',
    name: 'VNet',
    type: 'region',
    parentId: null,
    position: { x: 10, y: 0, z: 20 },
    frame: { width: 16, height: 0.3, depth: 20 },
    ...overrides,
  });
}

function makeResource(overrides: Partial<ResourceBlock> = {}): ResourceBlock {
  return makeTestBlock({
    id: 'vm-1',
    name: 'VM',
    category: 'compute',
    parentId: 'vnet-1',
    position: { x: 5, y: 0, z: 8 },
    ...overrides,
  });
}

function makeArch(
  nodes: Block[],
  connections: ArchitectureModel['connections'] = [],
): ArchitectureModel {
  return makeTestArchitecture({ nodes, connections });
}

/* ── applyLayoutPatch ─────────────────────────────────────────────── */

describe('applyLayoutPatch', () => {
  it('returns unchanged model when no patches match', () => {
    const container = makeContainer();
    const model = makeArch([container]);

    const patches: LayoutPatchEntry[] = [{ id: 'nonexistent', position: { x: 99, y: 0, z: 99 } }];

    const result = applyLayoutPatch(model, patches);
    expect(result.nodes[0].position).toEqual(container.position);
  });

  it('updates position for matched resource block', () => {
    const resource = makeResource({
      position: { x: 5, y: 0, z: 8 },
    });
    const model = makeArch([resource]);

    const patches: LayoutPatchEntry[] = [{ id: 'vm-1', position: { x: 12, y: 0, z: 15 } }];

    const result = applyLayoutPatch(model, patches);
    expect(result.nodes[0].position).toEqual({ x: 12, y: 0, z: 15 });
  });

  it('updates both position and frame for container blocks', () => {
    const container = makeContainer({
      position: { x: 10, y: 0, z: 20 },
      frame: { width: 16, height: 0.3, depth: 20 },
    });
    const model = makeArch([container]);

    const patches: LayoutPatchEntry[] = [
      {
        id: 'vnet-1',
        position: { x: 5, y: 0, z: 10 },
        frame: { width: 24, height: 0.3, depth: 30 },
      },
    ];

    const result = applyLayoutPatch(model, patches);
    expect(result.nodes[0].position).toEqual({ x: 5, y: 0, z: 10 });
    expect((result.nodes[0] as ContainerBlock).frame).toEqual({
      width: 24,
      height: 0.3,
      depth: 30,
    });
  });

  it('does not mutate the original model', () => {
    const resource = makeResource({
      position: { x: 5, y: 0, z: 8 },
    });
    const model = makeArch([resource]);
    const originalPosition = { ...resource.position };

    applyLayoutPatch(model, [{ id: 'vm-1', position: { x: 99, y: 0, z: 99 } }]);

    expect(resource.position).toEqual(originalPosition);
  });

  it('applies patches to multiple nodes simultaneously', () => {
    const container = makeContainer();
    const res1 = makeResource({ id: 'vm-1', parentId: 'vnet-1' });
    const res2 = makeResource({ id: 'vm-2', name: 'VM 2', parentId: 'vnet-1' });
    const model = makeArch([container, res1, res2]);

    const patches: LayoutPatchEntry[] = [
      {
        id: 'vnet-1',
        position: { x: 0, y: 0, z: 0 },
        frame: { width: 20, height: 0.3, depth: 24 },
      },
      { id: 'vm-1', position: { x: 3, y: 0, z: 3 } },
      { id: 'vm-2', position: { x: 7, y: 0, z: 3 } },
    ];

    const result = applyLayoutPatch(model, patches);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.find((n) => n.id === 'vnet-1')!.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(result.nodes.find((n) => n.id === 'vm-1')!.position).toEqual({ x: 3, y: 0, z: 3 });
    expect(result.nodes.find((n) => n.id === 'vm-2')!.position).toEqual({ x: 7, y: 0, z: 3 });
  });

  it('preserves connections and other model properties', () => {
    const resource = makeResource();
    const model = makeArch([resource]);

    const patches: LayoutPatchEntry[] = [{ id: 'vm-1', position: { x: 99, y: 0, z: 99 } }];

    const result = applyLayoutPatch(model, patches);
    expect(result.id).toBe(model.id);
    expect(result.name).toBe(model.name);
    expect(result.version).toBe(model.version);
    expect(result.connections).toBe(model.connections);
  });

  it('does not add frame to resource blocks even if patch has frame', () => {
    const resource = makeResource();
    const model = makeArch([resource]);

    const patches: LayoutPatchEntry[] = [
      {
        id: 'vm-1',
        position: { x: 99, y: 0, z: 99 },
        frame: { width: 10, height: 1, depth: 10 },
      },
    ];

    const result = applyLayoutPatch(model, patches);
    // Resource blocks don't have frame, patch.frame is ignored for non-containers
    expect('frame' in result.nodes[0]).toBe(false);
  });
});
