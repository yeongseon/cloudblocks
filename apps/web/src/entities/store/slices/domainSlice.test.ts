import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ArchitectureModel,
  ContainerBlock,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import {
  connectionTypeToSemantic,
  endpointId,
  generateEndpointsForBlock,
} from '@cloudblocks/schema';

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

const isPlateNode = (node: ArchitectureModel['nodes'][number]): node is ContainerBlock =>
  node.kind === 'container';
const isBlockNode = (node: ArchitectureModel['nodes'][number]): node is ResourceBlock =>
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

function makeLegacyConnection(
  id: string,
  sourceId: string,
  targetId: string,
  type = 'dataflow',
  metadata: Record<string, unknown> = {},
) {
  const semantic = connectionTypeToSemantic(type);
  return {
    id,
    from: endpointId(sourceId, 'output', semantic),
    to: endpointId(targetId, 'input', semantic),
    metadata: {
      ...metadata,
      type,
      sourceId,
      targetId,
    },
  };
}

function makeContainerNode(id: string, overrides: Partial<ContainerBlock> = {}): ContainerBlock {
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
    frame: { width: 16, height: 0.3, depth: 20 },
    metadata: {},
    ...overrides,
  };
}

function makeLeafNode(
  id: string,
  parentId: string,
  category: ResourceCategory = 'compute',
  overrides: Partial<ResourceBlock> = {},
): ResourceBlock {
  const resourceTypeByCategory: Record<ResourceCategory, string> = {
    compute: 'web_compute',
    data: 'relational_database',
    delivery: 'load_balancer',
    security: 'firewall_security',
    operations: 'monitoring',
    messaging: 'message_queue',
    identity: 'identity_service',
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

function makeExternalBlock(
  id: string,
  resourceType: 'internet' | 'browser',
  position: { x: number; y: number; z: number },
): ResourceBlock {
  return {
    id,
    name: resourceType === 'internet' ? 'Internet' : 'Browser',
    kind: 'resource',
    layer: 'resource',
    resourceType,
    category: 'delivery',
    provider: 'azure',
    parentId: null,
    position,
    metadata: {},
    roles: ['external'] as 'external'[],
  };
}

function seedState(arch: Partial<ArchitectureModel>) {
  const now = '2026-01-01T00:00:00.000Z';
  const defaultArchitecture: ArchitectureModel = {
    id: 'arch-test',
    name: 'Test Architecture',
    version: '2',
    nodes: [],
    connections: [],
    endpoints: [],
    externalActors: [
      { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
    ],
    createdAt: now,
    updatedAt: now,
  };
  const nodes = arch.nodes ?? defaultArchitecture.nodes;
  const base: ArchitectureModel = {
    id: arch.id ?? defaultArchitecture.id,
    name: arch.name ?? defaultArchitecture.name,
    version: arch.version ?? defaultArchitecture.version,
    nodes,
    connections: arch.connections ?? defaultArchitecture.connections,
    endpoints: arch.endpoints ?? nodes.flatMap((node) => generateEndpointsForBlock(node.id)),
    externalActors: arch.externalActors ?? defaultArchitecture.externalActors,
    createdAt: arch.createdAt ?? defaultArchitecture.createdAt,
    updatedAt: arch.updatedAt ?? defaultArchitecture.updatedAt,
  };
  useArchitectureStore.setState({
    workspace: {
      id: 'ws-test',
      name: 'Test WS',
      provider: 'azure' as const,
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
        provider: 'azure' as const,
        architecture: {
          id: 'arch-test',
          name: 'Test',
          version: '2',
          nodes: [],
          endpoints: [],
          connections: [],
          externalActors: [
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { x: -3, y: 0, z: 5 },
            },
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
      getState().addPlate('region', 'VNet', null, 'network-platform');
      const plateId = getPlates()[0].id;
      const archBefore = getArch();

      getState().setPlateProfile(plateId, 'network-platform');

      expect(getArch()).toBe(archBefore);
    });

    it('no-ops when plateId does not exist', () => {
      const archBefore = getArch();
      getState().setPlateProfile('nonexistent-container', 'network-hub');
      expect(getArch()).toBe(archBefore);
    });
  });

  // ── setPlateProfile: child clamping (lines 442-444) ──

  describe('setPlateProfile – child clamping with containers and blocks', () => {
    it('clamps child container positions when container is resized smaller', () => {
      const region = makeContainerNode('region-1', {
        name: 'VNet',
        layer: 'region',
        profileId: 'network-platform',
        frame: { width: 16, height: 0.3, depth: 20 },
      });
      const subnet = makeContainerNode('subnet-1', {
        name: 'Sub',
        layer: 'subnet',
        parentId: 'region-1',
        position: { x: 5, y: 0.7, z: 6 },
        frame: { width: 6, height: 0.3, depth: 8 },
      });
      const block = makeLeafNode('block-1', 'region-1', 'compute', {
        position: { x: 5, y: 0.5, z: 5 },
      });
      seedState({ nodes: [region, subnet, block] });

      getState().setPlateProfile('region-1', 'network-sandbox');

      const resized = getPlates().find((p) => p.id === 'region-1')!;
      expect(resized.frame.width).toBe(8);
      expect(resized.frame.depth).toBe(12);

      const subAfter = getPlates().find((p) => p.id === 'subnet-1')!;
      const maxRelX = resized.frame.width / 2 - subAfter.frame.width / 2;
      const actualRelX = subAfter.position.x - resized.position.x;
      expect(actualRelX).toBeLessThanOrEqual(maxRelX + 0.01);

      const blockAfter = getBlocks().find((b) => b.id === 'block-1')!;
      expect(blockAfter.position.x).toBeLessThanOrEqual(resized.frame.width / 2);
    });
  });

  describe('addExternalBlock – new forward-looking API', () => {
    it('creates an external block in nodes[] with default position', () => {
      seedState({ externalActors: [], nodes: [] });

      getState().addExternalBlock('internet');

      const externalBlocks = getBlocks().filter((block) => block.roles?.includes('external'));
      expect(externalBlocks).toHaveLength(1);
      expect(externalBlocks[0]).toMatchObject({
        kind: 'resource',
        resourceType: 'internet',
        name: 'Internet',
        parentId: null,
        roles: ['external'],
      });
    });

    it('creates an external block with custom position', () => {
      seedState({ externalActors: [], nodes: [] });

      getState().addExternalBlock('browser', { x: 10, y: 0, z: 5 });

      const externalBlocks = getBlocks().filter((block) => block.roles?.includes('external'));
      expect(externalBlocks).toHaveLength(1);
      expect(externalBlocks[0].position).toEqual({ x: 10, y: 0, z: 5 });
    });

    it('supports undo/redo after addExternalBlock with custom position', () => {
      seedState({ externalActors: [], nodes: [] });

      expect(getState().canUndo).toBe(false);
      getState().addExternalBlock('internet', { x: 7, y: 0, z: 3 });
      expect(getState().canUndo).toBe(true);

      const externalBlocks = getBlocks().filter((block) => block.roles?.includes('external'));
      expect(externalBlocks).toHaveLength(1);
      expect(externalBlocks[0].position).toEqual({ x: 7, y: 0, z: 3 });

      getState().undo();
      expect(getBlocks().filter((block) => block.roles?.includes('external'))).toHaveLength(0);

      getState().redo();
      const afterRedo = getBlocks().filter((block) => block.roles?.includes('external'));
      expect(afterRedo).toHaveLength(1);
      expect(afterRedo[0].resourceType).toBe('internet');
    });
  });

  describe('moveExternalBlockPosition', () => {
    it('no-ops when block is not found', () => {
      seedState({ externalActors: [], nodes: [] });
      const archBefore = getArch();

      getState().moveExternalBlockPosition('nonexistent-id', 1, 1);

      expect(getArch()).toBe(archBefore);
    });

    it('no-ops when block is not root-level', () => {
      const nestedExternal = makeExternalBlock('ext-nested', 'internet', { x: -3, y: 0, z: 5 });
      seedState({
        nodes: [{ ...nestedExternal, parentId: 'some-container' }],
        externalActors: [
          { id: 'ext-nested', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
        ],
      });
      const archBefore = getArch();

      getState().moveExternalBlockPosition('ext-nested', 1, 1);

      expect(getArch()).toBe(archBefore);
    });

    it('moves only root-level external block node position', () => {
      seedState({ externalActors: [], nodes: [] });
      getState().addExternalBlock('internet', { x: -3, y: 0, z: 5 });

      const movedId = getBlocks().find((block) => block.roles?.includes('external'))?.id;
      expect(movedId).toBeDefined();
      const beforeNode = getBlocks().find((block) => block.id === movedId)!;
      useArchitectureStore.setState((state) => ({
        ...state,
        workspace: {
          ...state.workspace,
          architecture: {
            ...state.workspace.architecture,
            nodes: [
              ...state.workspace.architecture.nodes,
              makeExternalBlock('ext-other', 'browser', { x: 9, y: 0, z: 9 }),
            ],
            externalActors: [
              ...(state.workspace.architecture.externalActors ?? []),
              {
                id: movedId!,
                name: 'Internet',
                type: 'internet',
                position: {
                  x: beforeNode.position.x,
                  y: beforeNode.position.y,
                  z: beforeNode.position.z,
                },
              },
              {
                id: 'ext-other',
                name: 'Browser',
                type: 'browser',
                position: { x: 9, y: 0, z: 9 },
              },
            ],
          },
        },
      }));
      const beforeOtherNode = getBlocks().find((block) => block.id === 'ext-other')!;

      getState().moveExternalBlockPosition(movedId!, 2, 3);

      const afterNode = getBlocks().find((block) => block.id === movedId)!;

      expect(afterNode.position).toEqual({
        x: beforeNode.position.x + 2,
        y: beforeNode.position.y,
        z: beforeNode.position.z + 3,
      });
      expect(getBlocks().find((block) => block.id === 'ext-other')!.position).toEqual(
        beforeOtherNode.position,
      );
    });
  });

  describe('addConnection – external block in nodes[] (new path)', () => {
    it('rejects connection from external block in nodes[] to non-edge block', () => {
      const externalInternet = makeExternalBlock('ext-internet', 'internet', { x: -3, y: 0, z: 5 });
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('c1', 's1', 'compute', { name: 'VM' }),
          externalInternet,
        ],
        externalActors: [],
      });

      const success = getState().addConnection('ext-internet', 'c1');
      expect(success).toBe(false);
      expect(getArch().connections).toHaveLength(0);
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
        frame: { width: 6, height: 0.3, depth: 8 },
      });
      const gateway = makeLeafNode('gw1', 's1', 'delivery', { name: 'Gateway' });
      const compute = makeLeafNode('c1', 's1', 'compute', { name: 'VM' });
      seedState({
        nodes: [region, subnet, gateway, compute],
        connections: [makeLegacyConnection('conn-1', 'gw1', 'c1', 'dataflow')],
      });

      getState().updateConnectionType('conn-1', 'http');

      const conn = getArch().connections.find((c) => c.id === 'conn-1');
      expect(conn?.metadata['type']).toBe('http');
    });

    it('updates connection type to async', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('gw1', 's1', 'delivery'),
          makeLeafNode('c1', 's1', 'compute'),
        ],
        connections: [makeLegacyConnection('conn-2', 'gw1', 'c1', 'dataflow')],
      });

      getState().updateConnectionType('conn-2', 'async');
      expect(getArch().connections[0].metadata['type']).toBe('async');
    });

    it('no-ops when connectionId does not exist', () => {
      seedState({
        connections: [makeLegacyConnection('conn-x', 'a', 'b', 'dataflow')],
      });
      const archBefore = getArch();

      getState().updateConnectionType('nonexistent-conn', 'http');

      expect(getArch()).toBe(archBefore);
    });

    it('pushes to undo history on successful update', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('gw1', 's1', 'delivery'),
          makeLeafNode('c1', 's1', 'compute'),
        ],
        connections: [makeLegacyConnection('conn-h', 'gw1', 'c1', 'dataflow')],
      });

      expect(getState().canUndo).toBe(false);
      getState().updateConnectionType('conn-h', 'internal');
      expect(getState().canUndo).toBe(true);

      getState().undo();
      expect(getArch().connections[0].metadata['type']).toBe('dataflow');
    });

    it('updates type to data', () => {
      seedState({
        connections: [makeLegacyConnection('conn-d', 'a', 'b', 'dataflow')],
        nodes: [
          makeContainerNode('r1'),
          makeLeafNode('a', 'r1', 'compute'),
          makeLeafNode('b', 'r1', 'data'),
        ],
      });

      getState().updateConnectionType('conn-d', 'data');
      expect(getArch().connections[0].metadata['type']).toBe('data');
    });

    it('preserves other connections when updating one', () => {
      seedState({
        connections: [
          makeLegacyConnection('conn-1', 'a', 'b', 'dataflow'),
          makeLegacyConnection('conn-2', 'c', 'd', 'http'),
        ],
        nodes: [
          makeContainerNode('r1'),
          makeLeafNode('a', 'r1', 'delivery'),
          makeLeafNode('b', 'r1', 'compute'),
          makeLeafNode('c', 'r1', 'compute'),
          makeLeafNode('d', 'r1', 'data'),
        ],
      });

      getState().updateConnectionType('conn-1', 'internal');

      const conns = getArch().connections;
      expect(conns).toHaveLength(2);
      expect(conns.find((c) => c.id === 'conn-1')?.metadata['type']).toBe('internal');
      expect(conns.find((c) => c.id === 'conn-2')?.metadata['type']).toBe('http');
    });
  });

  // ── addConnection: external actor as source/target ──

  describe('addConnection – external actor endpoints', () => {
    it('creates a connection from external actor to edge block', () => {
      const externalInternet = makeExternalBlock('ext-internet', 'internet', { x: -3, y: 0, z: 5 });
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('gw1', 's1', 'delivery', { name: 'Gateway' }),
          externalInternet,
        ],
      });

      const success = getState().addConnection('ext-internet', 'gw1');
      expect(success).toBe(true);
      expect(getArch().connections).toHaveLength(1);
      expect(getArch().connections[0].from).toContain('ext-internet');
      expect(getArch().connections[0].to).toContain('gw1');
    });

    it('rejects connection from external actor to non-edge block', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('c1', 's1', 'compute', { name: 'VM' }),
        ],
        externalActors: [
          {
            id: 'ext-internet',
            name: 'Internet',
            type: 'internet',
            position: { x: -3, y: 0, z: 5 },
          },
        ],
      });

      const success = getState().addConnection('ext-internet', 'c1');
      expect(success).toBe(false);
      expect(getArch().connections).toHaveLength(0);
    });
  });

  describe('addConnection – port allocation and capacity', () => {
    it('assigns sourcePort/targetPort automatically', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('c1', 's1', 'compute'),
          makeLeafNode('d1', 's1', 'data'),
          makeLeafNode('d2', 's1', 'data'),
        ],
      });

      expect(getState().addConnection('c1', 'd1')).toBe(true);
      expect(getState().addConnection('c1', 'd2')).toBe(true);

      const connections = getArch().connections;
      expect(connections).toHaveLength(2);
      expect(connections[0].metadata['sourcePort']).toBe(0);
      expect(connections[0].metadata['targetPort']).toBe(0);
      expect(connections[1].metadata['sourcePort']).toBe(1);
      expect(connections[1].metadata['targetPort']).toBe(0);
    });

    it('rejects connection when source outbound ports are full', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('c1', 's1', 'compute'),
          makeLeafNode('d1', 's1', 'data'),
          makeLeafNode('d2', 's1', 'data'),
          makeLeafNode('d3', 's1', 'data'),
        ],
      });

      expect(getState().addConnection('c1', 'd1')).toBe(true);
      expect(getState().addConnection('c1', 'd2')).toBe(true);
      expect(getState().addConnection('c1', 'd3')).toBe(false);
      expect(getArch().connections).toHaveLength(2);
    });

    it('rejects connection when target inbound ports are full', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('c1', 's1', 'compute'),
          makeLeafNode('c2', 's1', 'compute'),
          makeLeafNode('c3', 's1', 'compute'),
          makeLeafNode('d1', 's1', 'data'),
        ],
      });

      expect(getState().addConnection('c1', 'd1')).toBe(true);
      expect(getState().addConnection('c2', 'd1')).toBe(true);
      expect(getState().addConnection('c3', 'd1')).toBe(false);
      expect(getArch().connections).toHaveLength(2);
    });

    it('allocates next port index when existing connection has no port fields', () => {
      seedState({
        nodes: [
          makeContainerNode('r1'),
          makeContainerNode('s1', {
            layer: 'subnet',
            parentId: 'r1',
            position: { x: 0, y: 0.7, z: 0 },
            frame: { width: 6, height: 0.3, depth: 8 },
          }),
          makeLeafNode('c1', 's1', 'compute'),
          makeLeafNode('d1', 's1', 'data'),
          makeLeafNode('d2', 's1', 'data'),
        ],
        connections: [makeLegacyConnection('legacy-conn', 'c1', 'd1', 'dataflow')],
      });

      expect(getState().addConnection('c1', 'd2')).toBe(true);

      const newConnection = getArch().connections.find(
        (connection) => connection.id !== 'legacy-conn',
      );
      expect(newConnection?.metadata['sourcePort']).toBe(1);
      expect(newConnection?.metadata['targetPort']).toBe(0);
    });
  });

  // ── duplicateBlock: block without parent container ──

  describe('duplicateBlock – orphan block guard', () => {
    it('no-ops when source block has no matching parent container', () => {
      seedState({
        nodes: [makeLeafNode('orphan-block', 'missing-container', 'compute', { name: 'Orphan' })],
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
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getPlates()[1].id;

      getState().addBlock('compute', 'VM', subId, 'azure', 'vm', {
        sku: 'Standard_B2s',
        tier: 'basic',
      });

      const block = getBlocks()[0];
      expect(block.config).toEqual({ sku: 'Standard_B2s', tier: 'basic' });
      expect(block.subtype).toBe('vm');
    });
  });

  // ── removeConnection: no-op on already-empty connections ──

  describe('removeConnection – non-existent id', () => {
    it('removes nothing when id does not match any connection', () => {
      seedState({
        connections: [makeLegacyConnection('conn-keep', 'a', 'b', 'dataflow')],
      });

      getState().removeConnection('nonexistent');

      expect(getArch().connections).toHaveLength(1);
      expect(getArch().connections[0].id).toBe('conn-keep');
    });
  });

  // ── setPlateProfile: container without parent (root container resize) ──

  describe('setPlateProfile – root container without parent', () => {
    it('resizes a root container without parent clamping', () => {
      getState().addPlate('region', 'VNet', null, 'network-platform');
      const plateId = getPlates()[0].id;

      getState().setPlateProfile(plateId, 'network-hub');

      const resized = getPlates().find((p) => p.id === plateId)!;
      expect(resized.profileId).toBe('network-hub');
      expect(resized.frame.width).toBe(20);
      expect(resized.frame.depth).toBe(24);
    });
  });

  // ── addPlate: region type forces position to origin ──

  describe('addPlate – region container position', () => {
    it('places region container at origin regardless of other state', () => {
      getState().addPlate('region', 'VNet1', null);
      const container = getPlates()[0];
      expect(container.position).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  // ── movePlatePosition: root container with no siblings ──

  describe('movePlatePosition – single root container', () => {
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
      getState().addPlate('subnet', 'Sub', regionId);
      const subId = getPlates()[1].id;

      getState().addBlock('delivery', 'LB', subId);
      const blockId = getBlocks()[0].id;

      const archBefore = getArch();
      getState().moveBlock(blockId, regionId);

      expect(getArch()).toBe(archBefore);
    });
  });

  describe('additional guard and fallback branches', () => {
    it('falls back to compute category for unknown addNode resourceType', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getPlates()[0].id;

      getState().addNode({
        kind: 'resource',
        resourceType: 'unknown_runtime' as never,
        name: 'Unknown Resource',
        parentId: regionId,
        provider: 'azure',
      });

      const block = getBlocks()[0];
      expect(block).toMatchObject({ category: 'compute', subtype: 'unknown_runtime' });
    });

    it('no-ops removeNode, renameNode, and moveNodePosition for unknown ids', () => {
      const before = getArch();

      getState().removeNode('missing-node-id');
      getState().renameNode('missing-node-id', 'new-name');
      getState().moveNodePosition('missing-node-id', 2, 2);

      expect(getArch()).toBe(before);
    });

    it('moveBlockPosition moves root-level block when parentId is null', () => {
      getState().addExternalBlock('internet');
      const rootBlock = getBlocks().find((b) => b.resourceType === 'internet')!;
      expect(rootBlock).toBeDefined();
      expect(rootBlock.parentId).toBeNull();

      const origX = rootBlock.position.x;
      const origZ = rootBlock.position.z;

      getState().moveBlockPosition(rootBlock.id, 3, -2);

      const moved = getBlocks().find((b) => b.id === rootBlock.id)!;
      expect(moved.position.x).toBe(origX + 3);
      expect(moved.position.z).toBe(origZ - 2);
      expect(moved.position.y).toBe(rootBlock.position.y);
    });

    it('handles addConnection branches with actors and endpoint parse fallback', () => {
      const externalInternet = makeExternalBlock('ext-internet', 'internet', { x: -3, y: 0, z: 5 });
      const subnet = makeContainerNode('container-1', {
        layer: 'subnet',
        resourceType: 'subnet',
        frame: { width: 8, height: 0.3, depth: 10 },
      });
      const edge = makeLeafNode('delivery-1', 'container-1', 'delivery', {
        resourceType: 'load_balancer',
      });
      const compute = makeLeafNode('compute-1', 'container-1', 'compute', {
        resourceType: 'web_compute',
      });
      seedState({
        nodes: [subnet, edge, compute, externalInternet],
        endpoints: [
          ...generateEndpointsForBlock(edge.id),
          ...generateEndpointsForBlock(compute.id),
          ...generateEndpointsForBlock(externalInternet.id),
        ],
        connections: [makeLegacyConnection('conn-existing', edge.id, compute.id)],
      });

      expect(getState().addConnection('compute-1', 'ext-internet')).toBe(false);

      expect(getState().addConnection('ext-internet', 'delivery-1')).toBe(true);
    });

    it('uses parseEndpointId fallback for capacity counting when endpoints are missing', () => {
      const subnet = makeContainerNode('container-1', {
        layer: 'subnet',
        resourceType: 'subnet',
        frame: { width: 8, height: 0.3, depth: 10 },
      });
      const delivery = makeLeafNode('delivery-1', 'container-1', 'delivery', {
        resourceType: 'load_balancer',
      });
      const compute = makeLeafNode('compute-1', 'container-1', 'compute', {
        resourceType: 'web_compute',
      });

      const deliveryDataOutput = generateEndpointsForBlock(delivery.id).find(
        (endpoint) => endpoint.id === endpointId(delivery.id, 'output', 'data'),
      );
      const computeDataInput = generateEndpointsForBlock(compute.id).find(
        (endpoint) => endpoint.id === endpointId(compute.id, 'input', 'data'),
      );

      expect(deliveryDataOutput).toBeDefined();
      expect(computeDataInput).toBeDefined();

      seedState({
        nodes: [subnet, delivery, compute],
        endpoints: [deliveryDataOutput!, computeDataInput!],
        connections: [
          {
            id: 'conn-http',
            from: endpointId(delivery.id, 'output', 'http'),
            to: endpointId(compute.id, 'input', 'http'),
            metadata: {
              type: 'http',
              sourceId: delivery.id,
              targetId: compute.id,
            },
          },
        ],
      });

      expect(getState().addConnection('delivery-1', 'compute-1')).toBe(true);

      const createdConnection = getArch().connections.at(-1);
      expect(createdConnection?.metadata?.sourcePort).toBe(1);
      expect(createdConnection?.metadata?.targetPort).toBe(1);
    });

    it('returns false when endpoint-backed source/target cannot be resolved', () => {
      const subnet = makeContainerNode('container-1', { layer: 'subnet', resourceType: 'subnet' });
      const edge = makeLeafNode('delivery-1', 'container-1', 'delivery');
      const compute = makeLeafNode('compute-1', 'container-1', 'compute');
      seedState({
        nodes: [subnet, edge, compute],
        endpoints: [],
        externalActors: [],
      });

      expect(getState().addConnection('delivery-1', 'compute-1')).toBe(false);
    });

    it('returns false when target has no stored endpoint and is not an actor', () => {
      const subnet = makeContainerNode('container-1', {
        layer: 'subnet',
        resourceType: 'subnet',
        frame: { width: 8, height: 0.3, depth: 10 },
      });
      const edge = makeLeafNode('delivery-1', 'container-1', 'delivery', {
        resourceType: 'load_balancer',
      });
      const compute = makeLeafNode('compute-1', 'container-1', 'compute', {
        resourceType: 'web_compute',
      });
      seedState({
        nodes: [subnet, edge, compute],
        // Only source endpoints, no target endpoints
        endpoints: [...generateEndpointsForBlock(edge.id)],
        externalActors: [],
      });

      // Source (delivery-1) has endpoints, target (compute-1) does not
      expect(getState().addConnection('delivery-1', 'compute-1')).toBe(false);
    });

    it('no-ops updateConnectionType when endpoints for existing connection are missing', () => {
      const subnet = makeContainerNode('container-1', { layer: 'subnet', resourceType: 'subnet' });
      const edge = makeLeafNode('delivery-1', 'container-1', 'delivery');
      const compute = makeLeafNode('compute-1', 'container-1', 'compute');
      const connection = makeLegacyConnection('conn-1', edge.id, compute.id, 'dataflow');
      seedState({
        nodes: [subnet, edge, compute],
        endpoints: [],
        connections: [connection],
      });

      const before = getArch();
      getState().updateConnectionType('conn-1', 'async');
      expect(getArch()).toBe(before);
    });
  });
});
