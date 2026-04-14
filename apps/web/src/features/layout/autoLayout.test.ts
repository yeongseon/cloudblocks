import { beforeEach, describe, expect, it, vi } from 'vitest';
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

/* ── runAutoLayout ────────────────────────────────────────────────── */

// Mock the architecture store
vi.mock('../../entities/store/architectureStore', () => ({
  useArchitectureStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

// Mock elkjs dynamic import
vi.mock('elkjs/lib/elk.bundled', () => ({
  default: class MockELK {
    async layout(graph: Record<string, unknown>) {
      // Return the graph with positions assigned
      const typedGraph = graph as {
        children?: { id: string; width?: number; height?: number; children?: unknown[] }[];
      };
      return {
        ...graph,
        children: (typedGraph.children ?? []).map(
          (
            child: { id: string; width?: number; height?: number; children?: unknown[] },
            i: number,
          ) => ({
            ...child,
            x: i * 5,
            y: i * 3,
            width: child.width ?? 2,
            height: child.height ?? 2,
          }),
        ),
      };
    }
  },
}));

describe('runAutoLayout', () => {
  let runAutoLayout: typeof import('./autoLayout').runAutoLayout;
  let storeModule: typeof import('../../entities/store/architectureStore');

  beforeEach(async () => {
    vi.resetModules();
    const autoLayoutMod = await import('./autoLayout');
    runAutoLayout = autoLayoutMod.runAutoLayout;
    storeModule = await import('../../entities/store/architectureStore');
  });

  it('returns false when architecture has no nodes', async () => {
    const emptyArch = makeArch([]);
    vi.mocked(storeModule.useArchitectureStore.getState).mockReturnValue({
      workspace: { architecture: emptyArch },
    } as ReturnType<typeof storeModule.useArchitectureStore.getState>);

    const result = await runAutoLayout();
    expect(result).toBe(false);
    expect(storeModule.useArchitectureStore.setState).not.toHaveBeenCalled();
  });

  it('returns true and applies layout when nodes exist', async () => {
    const resource = {
      ...makeResource({ id: 'vm-1', position: { x: 0, y: 0, z: 0 } }),
      parentId: null as string | null,
    };
    const arch = makeArch([resource]);
    vi.mocked(storeModule.useArchitectureStore.getState).mockReturnValue({
      workspace: { architecture: arch },
    } as ReturnType<typeof storeModule.useArchitectureStore.getState>);

    const result = await runAutoLayout();
    expect(result).toBe(true);
    expect(storeModule.useArchitectureStore.setState).toHaveBeenCalledTimes(1);
  });

  it('applies layout as a single undo step via setState callback', async () => {
    const resource = {
      ...makeResource({ id: 'vm-1', position: { x: 0, y: 0, z: 0 } }),
      parentId: null as string | null,
    };
    const arch = makeArch([resource]);
    vi.mocked(storeModule.useArchitectureStore.getState).mockReturnValue({
      workspace: { architecture: arch },
    } as ReturnType<typeof storeModule.useArchitectureStore.getState>);

    await runAutoLayout();
    const setStateFn = vi.mocked(storeModule.useArchitectureStore.setState);
    expect(setStateFn).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handles container and resource blocks together', async () => {
    const container = makeContainer();
    const resource = makeResource({ parentId: 'vnet-1' });
    const arch = makeArch([container, resource]);
    vi.mocked(storeModule.useArchitectureStore.getState).mockReturnValue({
      workspace: { architecture: arch },
    } as ReturnType<typeof storeModule.useArchitectureStore.getState>);

    const result = await runAutoLayout();
    expect(result).toBe(true);
  });
});
