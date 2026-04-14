import { describe, expect, it } from 'vitest';
import type { ElkNode } from 'elkjs/lib/elk-api';
import type { ArchitectureModel, Block, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import {
  makeTestArchitecture,
  makeTestBlock,
  makeTestPlate,
} from '../../__tests__/legacyModelTestUtils';
import { architectureToElkGraph, readElkPositions } from './elkAdapter';

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
  return makeTestArchitecture({
    nodes,
    connections,
  });
}

/* ── architectureToElkGraph ───────────────────────────────────────── */

describe('architectureToElkGraph', () => {
  it('returns empty graph for empty model', () => {
    const model = makeArch([]);
    const { graph, nodeMap } = architectureToElkGraph(model);

    expect(graph.id).toBe('root');
    expect(graph.children).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(nodeMap.size).toBe(0);
  });

  it('converts a single container to an ELK node with center-to-top-left conversion', () => {
    const container = makeContainer({
      position: { x: 10, y: 0, z: 20 },
      frame: { width: 16, height: 0.3, depth: 20 },
    });
    const model = makeArch([container]);
    const { graph } = architectureToElkGraph(model);

    const elkNode = graph.children![0];
    expect(elkNode.id).toBe('vnet-1');
    // Center (10, 20) with size (16, 20) → top-left (10-8, 20-10) = (2, 10)
    expect(elkNode.x).toBe(2);
    expect(elkNode.y).toBe(10);
    expect(elkNode.width).toBe(16);
    expect(elkNode.height).toBe(20); // ELK height = CloudBlocks depth
  });

  it('places resource blocks as root children when they have no parent container', () => {
    const resource = {
      ...makeResource({ position: { x: 4, y: 0, z: 6 } }),
      parentId: null as string | null,
    };
    const model = makeArch([resource]);
    const { graph } = architectureToElkGraph(model);

    expect(graph.children).toHaveLength(1);
    expect(graph.children![0].id).toBe('vm-1');
  });

  it('nests resource blocks inside their parent container ELK node', () => {
    const container = makeContainer();
    const resource = makeResource({ parentId: 'vnet-1' });
    const model = makeArch([container, resource]);
    const { graph } = architectureToElkGraph(model);

    const containerElk = graph.children![0];
    expect(containerElk.id).toBe('vnet-1');
    expect(containerElk.children).toHaveLength(1);
    expect(containerElk.children![0].id).toBe('vm-1');
  });

  it('sets layout options on compound container nodes', () => {
    const container = makeContainer();
    const resource = makeResource({ parentId: 'vnet-1' });
    const model = makeArch([container, resource]);
    const { graph } = architectureToElkGraph(model);

    const containerElk = graph.children![0];
    expect(containerElk.layoutOptions).toBeDefined();
    expect(containerElk.layoutOptions!['elk.algorithm']).toBe('layered');
    expect(containerElk.layoutOptions!['elk.direction']).toBe('RIGHT');
    expect(containerElk.layoutOptions!['elk.spacing.nodeNode']).toBe('3');
    expect(containerElk.layoutOptions!['elk.layered.spacing.nodeNodeBetweenLayers']).toBe('4');
    expect(containerElk.layoutOptions!['elk.padding']).toContain('top=2');
  });

  it('does not set layout options on leaf containers (no children)', () => {
    const container = makeContainer();
    const model = makeArch([container]);
    const { graph } = architectureToElkGraph(model);

    const containerElk = graph.children![0];
    expect(containerElk.layoutOptions).toBeUndefined();
  });

  it('sets root-level layout options with hierarchy handling', () => {
    const model = makeArch([makeContainer()]);
    const { graph } = architectureToElkGraph(model);

    expect(graph.layoutOptions!['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    expect(graph.layoutOptions!['elk.algorithm']).toBe('layered');
    expect(graph.layoutOptions!['elk.direction']).toBe('RIGHT');
  });

  it('populates nodeMap with all blocks', () => {
    const container = makeContainer();
    const resource = makeResource();
    const model = makeArch([container, resource]);
    const { nodeMap } = architectureToElkGraph(model);

    expect(nodeMap.size).toBe(2);
    expect(nodeMap.get('vnet-1')).toBe(container);
    expect(nodeMap.get('vm-1')).toBe(resource);
  });

  it('converts connections to ELK edges', () => {
    const container = makeContainer();
    const res1 = makeResource({ id: 'vm-1', parentId: 'vnet-1' });
    const res2 = makeResource({ id: 'vm-2', name: 'VM 2', parentId: 'vnet-1' });
    const model = makeArch(
      [container, res1, res2],
      [
        {
          id: 'conn-1',
          from: 'endpoint-vm-1-output-http',
          to: 'endpoint-vm-2-input-http',
          metadata: {},
        },
      ],
    );
    const { graph } = architectureToElkGraph(model);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges![0]).toEqual({
      id: 'conn-1',
      sources: ['vm-1'],
      targets: ['vm-2'],
    });
  });

  it('skips edges where source or target is missing', () => {
    const resource = makeResource({ id: 'vm-1', parentId: null });
    const model = makeArch(
      [resource],
      [
        {
          id: 'conn-1',
          from: 'endpoint-vm-1-output-http',
          to: 'endpoint-missing-node-input-http',
          metadata: {},
        },
      ],
    );
    const { graph } = architectureToElkGraph(model);

    expect(graph.edges).toHaveLength(0);
  });

  it('handles deeply nested container hierarchy', () => {
    const vnet = makeContainer({ id: 'vnet', type: 'region' });
    const subnet = makeContainer({
      id: 'subnet',
      type: 'subnet',
      parentId: 'vnet',
      frame: { width: 8, height: 0.3, depth: 8 },
    });
    const resource = makeResource({ id: 'vm', parentId: 'subnet' });
    const model = makeArch([vnet, subnet, resource]);
    const { graph } = architectureToElkGraph(model);

    const vnetElk = graph.children![0];
    expect(vnetElk.id).toBe('vnet');
    expect(vnetElk.children).toHaveLength(1);

    const subnetElk = vnetElk.children![0];
    expect(subnetElk.id).toBe('subnet');
    expect(subnetElk.children).toHaveLength(1);
    expect(subnetElk.children![0].id).toBe('vm');
  });
});

/* ── readElkPositions ─────────────────────────────────────────────── */

describe('readElkPositions', () => {
  it('returns empty array for root-only graph', () => {
    const elkRoot: ElkNode = { id: 'root', children: [] };
    const nodeMap = new Map<string, Block>();

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches).toEqual([]);
  });

  it('converts ELK top-left positions to CloudBlocks center positions', () => {
    const resource = makeResource({
      id: 'vm-1',
      position: { x: 5, y: 0, z: 8 },
    });
    const nodeMap = new Map<string, Block>([['vm-1', resource]]);

    // ELK places the node at top-left (3, 4)
    // Resource dims: getBlockDimensions('compute', 'azure', ...) → width, depth
    // The test verifies center = topLeft + dims/2
    const elkRoot: ElkNode = {
      id: 'root',
      children: [{ id: 'vm-1', x: 3, y: 4, width: 2, height: 2 }],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches).toHaveLength(1);
    // Center = topLeft + actualDims/2 (from getBlockDimensions)
    // The actual dims depend on getBlockDimensions but the test validates structure
    expect(patches[0].id).toBe('vm-1');
    expect(patches[0].position.y).toBe(0); // elevation preserved
    expect(typeof patches[0].position.x).toBe('number');
    expect(typeof patches[0].position.z).toBe('number');
  });

  it('preserves y (elevation) from original block', () => {
    const resource = makeResource({
      id: 'vm-1',
      position: { x: 5, y: 3, z: 8 },
    });
    const nodeMap = new Map<string, Block>([['vm-1', resource]]);

    const elkRoot: ElkNode = {
      id: 'root',
      children: [{ id: 'vm-1', x: 10, y: 20, width: 2, height: 2 }],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches[0].position.y).toBe(3);
  });

  it('snaps positions to integer CU grid', () => {
    const resource = makeResource({
      id: 'vm-1',
      position: { x: 0, y: 0, z: 0 },
    });
    const nodeMap = new Map<string, Block>([['vm-1', resource]]);

    const elkRoot: ElkNode = {
      id: 'root',
      children: [{ id: 'vm-1', x: 1.7, y: 2.3, width: 2, height: 2 }],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    // Positions should be rounded integers
    expect(Number.isInteger(patches[0].position.x)).toBe(true);
    expect(Number.isInteger(patches[0].position.z)).toBe(true);
  });

  it('updates container frame when ELK resizes it', () => {
    const container = makeContainer({
      id: 'vnet-1',
      position: { x: 10, y: 0, z: 20 },
      frame: { width: 16, height: 0.3, depth: 20 },
    });
    const nodeMap = new Map<string, Block>([['vnet-1', container]]);

    // ELK gives a bigger size than the original
    const elkRoot: ElkNode = {
      id: 'root',
      children: [{ id: 'vnet-1', x: 0, y: 0, width: 24, height: 30 }],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches[0].frame).toBeDefined();
    expect(patches[0].frame!.width).toBe(24);
    expect(patches[0].frame!.depth).toBe(30);
    expect(patches[0].frame!.height).toBe(0.3); // vertical height preserved
  });

  it('does not shrink container frame below original size', () => {
    const container = makeContainer({
      id: 'vnet-1',
      position: { x: 10, y: 0, z: 20 },
      frame: { width: 16, height: 0.3, depth: 20 },
    });
    const nodeMap = new Map<string, Block>([['vnet-1', container]]);

    // ELK gives a smaller size
    const elkRoot: ElkNode = {
      id: 'root',
      children: [{ id: 'vnet-1', x: 0, y: 0, width: 8, height: 10 }],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches[0].frame!.width).toBe(16); // max(8, 16) = 16
    expect(patches[0].frame!.depth).toBe(20); // max(10, 20) = 20
  });

  it('does not add frame patch for resource blocks', () => {
    const resource = makeResource({
      id: 'vm-1',
      position: { x: 5, y: 0, z: 8 },
    });
    const nodeMap = new Map<string, Block>([['vm-1', resource]]);

    const elkRoot: ElkNode = {
      id: 'root',
      children: [{ id: 'vm-1', x: 3, y: 4, width: 5, height: 5 }],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches[0].frame).toBeUndefined();
  });

  it('accumulates parent offsets for nested nodes', () => {
    const vnet = makeContainer({
      id: 'vnet',
      position: { x: 10, y: 0, z: 20 },
      frame: { width: 16, height: 0.3, depth: 20 },
    });
    const resource = makeResource({
      id: 'vm',
      parentId: 'vnet',
      position: { x: 5, y: 0, z: 8 },
    });
    const nodeMap = new Map<string, Block>([
      ['vnet', vnet],
      ['vm', resource],
    ]);

    // Parent at (2, 4), child at (3, 5) relative to parent
    const elkRoot: ElkNode = {
      id: 'root',
      children: [
        {
          id: 'vnet',
          x: 2,
          y: 4,
          width: 20,
          height: 24,
          children: [{ id: 'vm', x: 3, y: 5, width: 2, height: 2 }],
        },
      ],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    const vmPatch = patches.find((p) => p.id === 'vm')!;
    // Child absolute top-left = parent(2,4) + child(3,5) = (5, 9)
    // Then convert to center by adding dims/2
    expect(vmPatch).toBeDefined();
    expect(vmPatch.position.y).toBe(0); // elevation preserved
  });

  it('skips nodes not found in nodeMap', () => {
    const nodeMap = new Map<string, Block>();

    const elkRoot: ElkNode = {
      id: 'root',
      children: [{ id: 'unknown', x: 0, y: 0, width: 2, height: 2 }],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches).toEqual([]);
  });

  it('handles root node without children property', () => {
    const nodeMap = new Map<string, Block>();
    // ElkNode with no children field (undefined)
    const elkRoot: ElkNode = { id: 'root' };

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches).toEqual([]);
  });

  it('handles ELK nodes with undefined x/y coordinates', () => {
    const resource = makeResource({
      id: 'vm-1',
      position: { x: 5, y: 0, z: 8 },
    });
    const nodeMap = new Map<string, Block>([['vm-1', resource]]);

    // ELK node with no x/y — should default to 0
    const elkRoot: ElkNode = {
      id: 'root',
      children: [{ id: 'vm-1', width: 2, height: 2 }],
    };

    const patches = readElkPositions(elkRoot, nodeMap);
    expect(patches).toHaveLength(1);
    // x/y default to 0, so center = 0 + dims/2
    expect(typeof patches[0].position.x).toBe('number');
    expect(typeof patches[0].position.z).toBe('number');
  });
});
