import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArchitectureModel, ContainerNode, LeafNode, ResourceCategory } from '@cloudblocks/schema';

// Mock uuid before importing the store
const { uuidState } = vi.hoisted(() => ({
  uuidState: { counter: 0 },
}));
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    const n = ++uuidState.counter;
    return n.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
  }),
}));

import { useArchitectureStore } from '../architectureStore';
import { useUIStore } from '../uiStore';

function getState() {
  return useArchitectureStore.getState();
}

const isPlateNode = (node: ArchitectureModel['nodes'][number]): node is ContainerNode =>
  node.kind === 'container';
const isBlockNode = (node: ArchitectureModel['nodes'][number]): node is LeafNode =>
  node.kind === 'resource';

function getArch() {
  return getState().workspace.architecture;
}

function getPlates() {
  return getArch().nodes.filter(isPlateNode);
}

function getBlocks() {
  return getArch().nodes.filter(isBlockNode);
}

function makeContainerNode(
  id: string,
  overrides: Partial<ContainerNode> = {},
): ContainerNode {
  return {
    id,
    name: 'TestPlate',
    kind: 'container',
    layer: 'region',
    resourceType: 'virtual_network',
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    size: { width: 16, height: 0.3, depth: 20 },
    metadata: {},
    ...overrides,
  };
}

function makeLeafNode(
  id: string,
  parentId: string,
  category: ResourceCategory = 'compute',
  overrides: Partial<LeafNode> = {},
): LeafNode {
  const resourceTypeByCategory: Record<ResourceCategory, string> = {
    compute: 'web_compute',
    data: 'relational_database',
    edge: 'load_balancer',
    security: 'firewall_security',
    operations: 'monitoring',
    messaging: 'message_queue',
    network: 'virtual_network',
  };
  return {
    id,
    name: 'TestBlock',
    kind: 'resource',
    layer: 'resource',
    resourceType: resourceTypeByCategory[category],
    category,
    provider: 'azure',
    parentId,
    position: { x: 0, y: 0.5, z: 0 },
    metadata: {},
    ...overrides,
  };
}

function seedState(arch: Partial<ArchitectureModel>) {
  const now = '2026-01-01T00:00:00.000Z';
  const base: ArchitectureModel = {
    id: 'arch-test',
    name: 'Test Architecture',
    version: '2',
    nodes: [],
    connections: [],
    externalActors: [
      { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
    ],
    createdAt: now,
    updatedAt: now,
    ...arch,
  };
  useArchitectureStore.setState({
    workspace: {
      id: 'ws-test',
      name: 'Test WS',
      architecture: base,
      createdAt: now,
      updatedAt: now,
    },
    workspaces: [],
    validationResult: null,
    canUndo: false,
    canRedo: false,
  });
}

describe('domainSlice – targeted branch coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    localStorage.clear();
    uuidState.counter = 0;
    const now = new Date().toISOString();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-test',
        name: 'Test',
        architecture: {
          id: 'arch-test',
          name: 'Test',
          version: '2',
          nodes: [],
          connections: [],
          externalActors: [
            { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
          ],
          createdAt: now,
          updatedAt: now,
        },
        createdAt: now,
        updatedAt: now,
      },
      workspaces: [],
      validationResult: null,
      canUndo: false,
      canRedo: false,
    });
    useUIStore.getState().clearDiffState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── setPlateProfile: same profileId no-op (lines 393-394) ──

  describe('setPlateProfile – same profileId no-op', () => {
    it('no-ops when setting the same profileId that is already set', () => {
      getState().addPlate('region', 'VNet', null, undefined, 'network-platform');
      const plateId = getPlates()[0].id;
      const archBefore = getArch();

      getState().setPlateProfile(plateId, 'network-platform');

      expect(getArch()).toBe(archBefore);
    });

    it('no-ops when plateId does not exist', () => {
      const archBefore = getArch();
      getState().setPlateProfile('nonexistent-plate', 'network-hub');
      expect(getArch()).toBe(archBefore);
    });
  });

  // ── setPlateProfile: child clamping (lines 442-444) ──

  describe('setPlateProfile – child clamping with containers and blocks', () => {
    it('clamps child container positions when plate is resized smaller', () => {
      const region = makeContainerNode('region-1', {
        name: 'VNet',
        layer: 'region',
        profileId: 'network-platform',
        size: { width: 16, height: 0.3, depth: 20 },
      });
      const subnet = makeContainerNode('subnet-1', {
        name: 'Sub',
        layer: 'subnet',
        parentId: 'region-1',
        position: { x: 5, y: 0.7, z: 6 },
        size: { width: 6, height: 0.3, depth: 8 },
      });
      const block = makeLeafNode('block-1', 'region-1', 'compute', {
        position: { x: 5, y: 0.5, z: 5 },
      });
      seedState({ nodes: [region, subnet, block] });

      getState().setPlateProfile('region-1', 'network-sandbox');

      const resized = getPlates().find((p) => p.id === 'region-1')!;
      expect(resized.size.width).toBe(8);
      expect(resized.size.depth).toBe(12);

      const subAfter = getPlates().find((p) => p.id === 'subnet-1')!;
      const maxRelX = resized.size.width / 2 - subAfter.size.width / 2;
      const actualRelX = subAfter.position.x - resized.position.x;
      expect(actualRelX).toBeLessThanOrEqual(maxRelX + 0.01);

      const blockAfter = getBlocks().find((b) => b.id === 'block-1')!;
      expect(blockAfter.position.x).toBeLessThanOrEqual(resized.size.width / 2);
    });
  });

  // ── moveActorPosition: multiple actors, non-matching skip (line 642) ──

  describe('moveActorPosition – multiple actors with non-matching skip', () => {
    it('moves target actor and leaves other actors unchanged', () => {
      seedState({
        externalActors: [
          { id: 'actor-1', name: 'Internet', type: 'internet', position: { x: 0, y: 0, z: 0 } },
          { id: 'actor-2', name: 'Partner', type: 'internet', position: { x: 5, y: 0, z: 5 } },
        ],
      });

      getState().moveActorPosition('actor-1', 2, -3);

      const actors = getArch().externalActors;
      const moved = actors.find((a) => a.id === 'actor-1')!;
      const unmoved = actors.find((a) => a.id === 'actor-2')!;

      expect(moved.position).toEqual({ x: 2, y: 0, z: -3 });
      expect(unmoved.position).toEqual({ x: 5, y: 0, z: 5 });
    });
  });

  // ── updateConnectionType (lines 718-724) ──

  describe('updateConnectionType', () => {
    it('updates the type of an existing connection', () => {
      const region = makeContainerNode('r1', { layer: 'region' });
      const subnet = makeContainerNode('s1', {
        layer: 'subnet',
        parentId: 'r1',
        position: { x: 0, y: 0.7, z: 0 },
        size: { width: 6, height: 0.3, depth: 8 },
      });
      const gateway = makeLeafNode('gw1', 's1', 'edge', { name: 'Gateway' });
      const compute = makeLeafNode('c1', 's1', 'compute', { name: 'VM' });
      seedState({
        nodes: [region, subnet, gateway, compute],
        connections: [
          { id: 'conn-1', sourceId: 'gw1', targetId: 'c1', type: 'dataflow', metadata: {} },
        ],
      });

      getState().updateConnectionType('conn-1', 'http');

      const conn = getArch().connections.find((c) => c.id === 'conn-1');
      expect(conn?.type).toBe('http');
    });

    it('updates connection type to async', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', { layer: 'subnet', parentId: 'r1', position: { x: 0, y: 0.7, z: 0 }, size: { width: 6, height: 0.3, depth: 8 } }),
          makeLeafNode('gw1', 's1', 'edge'),
          makeLeafNode('c1', 's1', 'compute'),
        ],
        connections: [
          { id: 'conn-2', sourceId: 'gw1', targetId: 'c1', type: 'dataflow', metadata: {} },
        ],
      });

      getState().updateConnectionType('conn-2', 'async');
      expect(getArch().connections[0].type).toBe('async');
    });

    it('no-ops when connectionId does not exist', () => {
      seedState({
        connections: [
          { id: 'conn-x', sourceId: 'a', targetId: 'b', type: 'dataflow', metadata: {} },
        ],
      });
      const archBefore = getArch();

      getState().updateConnectionType('nonexistent-conn', 'http');

      expect(getArch()).toBe(archBefore);
    });

    it('pushes to undo history on successful update', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', { layer: 'subnet', parentId: 'r1', position: { x: 0, y: 0.7, z: 0 }, size: { width: 6, height: 0.3, depth: 8 } }),
          makeLeafNode('gw1', 's1', 'edge'),
          makeLeafNode('c1', 's1', 'compute'),
        ],
        connections: [
          { id: 'conn-h', sourceId: 'gw1', targetId: 'c1', type: 'dataflow', metadata: {} },
        ],
      });

      expect(getState().canUndo).toBe(false);
      getState().updateConnectionType('conn-h', 'internal');
      expect(getState().canUndo).toBe(true);

      getState().undo();
      expect(getArch().connections[0].type).toBe('dataflow');
    });

    it('updates type to data', () => {
      seedState({
        connections: [
          { id: 'conn-d', sourceId: 'a', targetId: 'b', type: 'dataflow', metadata: {} },
        ],
        nodes: [
          makeContainerNode('r1'),
          makeLeafNode('a', 'r1', 'compute'),
          makeLeafNode('b', 'r1', 'data'),
        ],
      });

      getState().updateConnectionType('conn-d', 'data');
      expect(getArch().connections[0].type).toBe('data');
    });

    it('preserves other connections when updating one', () => {
      seedState({
        connections: [
          { id: 'conn-1', sourceId: 'a', targetId: 'b', type: 'dataflow', metadata: {} },
          { id: 'conn-2', sourceId: 'c', targetId: 'd', type: 'http', metadata: {} },
        ],
        nodes: [
          makeContainerNode('r1'),
          makeLeafNode('a', 'r1', 'edge'),
          makeLeafNode('b', 'r1', 'compute'),
          makeLeafNode('c', 'r1', 'compute'),
          makeLeafNode('d', 'r1', 'data'),
        ],
      });

      getState().updateConnectionType('conn-1', 'internal');

      const conns = getArch().connections;
      expect(conns).toHaveLength(2);
      expect(conns.find((c) => c.id === 'conn-1')?.type).toBe('internal');
      expect(conns.find((c) => c.id === 'conn-2')?.type).toBe('http');
    });
  });

  // ── addConnection: external actor as source/target ──

  describe('addConnection – external actor endpoints', () => {
    it('creates a connection from external actor to edge block', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', { layer: 'subnet', parentId: 'r1', position: { x: 0, y: 0.7, z: 0 }, size: { width: 6, height: 0.3, depth: 8 } }),
          makeLeafNode('gw1', 's1', 'edge', { name: 'Gateway' }),
        ],
        externalActors: [
          { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
        ],
      });

      const success = getState().addConnection('ext-internet', 'gw1');
      expect(success).toBe(true);
      expect(getArch().connections).toHaveLength(1);
      expect(getArch().connections[0].sourceId).toBe('ext-internet');
      expect(getArch().connections[0].targetId).toBe('gw1');
    });

    it('rejects connection from external actor to non-edge block', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', { layer: 'subnet', parentId: 'r1', position: { x: 0, y: 0.7, z: 0 }, size: { width: 6, height: 0.3, depth: 8 } }),
          makeLeafNode('c1', 's1', 'compute', { name: 'VM' }),
        ],
        externalActors: [
          { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
        ],
      });

      const success = getState().addConnection('ext-internet', 'c1');
      expect(success).toBe(false);
      expect(getArch().connections).toHaveLength(0);
    });
  });

  // ── duplicateBlock: block without parent plate ──

  describe('duplicateBlock – orphan block guard', () => {
    it('no-ops when source block has no matching parent plate', () => {
      seedState({
        nodes: [
          makeLeafNode('orphan-block', 'missing-plate', 'compute', { name: 'Orphan' }),
        ],
      });
      const archBefore = getArch();

      getState().duplicateBlock('orphan-block');

      expect(getArch()).toBe(archBefore);
    });
  });

  // ── addBlock: stores config when provided ──

  describe('addBlock – config parameter', () => {
    it('stores config when provided during block creation', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getPlates()[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getPlates()[1].id;

      getState().addBlock('compute', 'VM', subId, 'azure', 'vm', { sku: 'Standard_B2s', tier: 'basic' });

      const block = getBlocks()[0];
      expect(block.config).toEqual({ sku: 'Standard_B2s', tier: 'basic' });
      expect(block.subtype).toBe('vm');
    });
  });

  // ── removeConnection: no-op on already-empty connections ──

  describe('removeConnection – non-existent id', () => {
    it('removes nothing when id does not match any connection', () => {
      seedState({
        connections: [
          { id: 'conn-keep', sourceId: 'a', targetId: 'b', type: 'dataflow', metadata: {} },
        ],
      });

      getState().removeConnection('nonexistent');

      expect(getArch().connections).toHaveLength(1);
      expect(getArch().connections[0].id).toBe('conn-keep');
    });
  });

  // ── setPlateProfile: plate without parent (root plate resize) ──

  describe('setPlateProfile – root plate without parent', () => {
    it('resizes a root plate without parent clamping', () => {
      getState().addPlate('region', 'VNet', null, undefined, 'network-platform');
      const plateId = getPlates()[0].id;

      getState().setPlateProfile(plateId, 'network-hub');

      const resized = getPlates().find((p) => p.id === plateId)!;
      expect(resized.profileId).toBe('network-hub');
      expect(resized.size.width).toBe(20);
      expect(resized.size.depth).toBe(24);
    });
  });

  // ── addPlate: region type forces position to origin ──

  describe('addPlate – region plate position', () => {
    it('places region plate at origin regardless of other state', () => {
      getState().addPlate('region', 'VNet1', null);
      const plate = getPlates()[0];
      expect(plate.position).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  // ── movePlatePosition: root plate with no siblings ──

  describe('movePlatePosition – single root plate', () => {
    it('moves freely when there are no sibling plates', () => {
      getState().addPlate('region', 'VNet', null);
      const plateId = getPlates()[0].id;

      getState().movePlatePosition(plateId, 10, -5);

      const moved = getPlates().find((p) => p.id === plateId)!;
      expect(moved.position.x).toBe(10);
      expect(moved.position.z).toBe(-5);
    });
  });

  // ── moveBlock: validatePlacement rejection ──

  describe('moveBlock – validatePlacement rejection', () => {
    it('rejects move when placement validation fails', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getPlates()[0].id;
      getState().addPlate('subnet', 'Sub', regionId, 'private');
      const subId = getPlates()[1].id;

      getState().addBlock('edge', 'LB', subId);
      const blockId = getBlocks()[0].id;

      const archBefore = getArch();
      getState().moveBlock(blockId, regionId);

      expect(getArch()).toBe(archBefore);
    });
  });
});
