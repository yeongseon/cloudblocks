import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ArchitectureModel,
  ContainerBlock,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import type { ArchitectureTemplate } from '../../shared/types/template';
import { endpointId } from '@cloudblocks/schema';
import { resolveConnectionNodes } from '@cloudblocks/schema';

// Mock uuid before importing the store
// vi.hoisted() runs before vi.mock hoisting, making the variable available
const { uuidState } = vi.hoisted(() => ({
  uuidState: { counter: 0 },
}));
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    const n = ++uuidState.counter;
    // Produce a UUID that survives .replace(/-/g, '').slice(0, 8)
    // e.g. n=1 → '00000001-0000-0000-0000-000000000000' → slice(0,8) = '00000001'
    return n.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
  }),
}));

import { useArchitectureStore } from './architectureStore';
import { useUIStore } from './uiStore';

function getState() {
  return useArchitectureStore.getState();
}

function makeRegionNode(id = 'p1', overrides: Partial<ContainerBlock> = {}): ContainerBlock {
  return {
    id,
    name: 'Net',
    kind: 'container',
    layer: 'region',
    resourceType: 'virtual_network',
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 12, height: 0.3, depth: 10 },
    metadata: {},
    ...overrides,
  };
}

function makeResourceNode(
  id = 'b1',
  parentId = 'p1',
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
    identity: 'identity_access',
    network: 'virtual_network',
  };
  return {
    id,
    name: 'VM',
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

type LegacyPlate = ContainerBlock & {
  type: ContainerBlock['layer'];
  children: string[];
};

type LegacyBlock = ResourceBlock & {
  placementId: string;
};

type LegacyArchitectureModel = Omit<ArchitectureModel, 'blocks' | 'plates'> & {
  plates: LegacyPlate[];
  blocks: LegacyBlock[];
};

const isPlateNode = (node: ArchitectureModel['nodes'][number]): node is ContainerBlock =>
  node.kind === 'container';
const isBlockNode = (node: ArchitectureModel['nodes'][number]): node is ResourceBlock =>
  node.kind === 'resource';

function getArch(): LegacyArchitectureModel {
  const architecture = getState().workspace.architecture;
  const plates = architecture.nodes.filter(isPlateNode).map((container) => ({
    ...container,
    type: container.layer,
    children: architecture.nodes
      .filter((node) => node.parentId === container.id)
      .map((node) => node.id),
  }));
  const blocks: LegacyBlock[] = architecture.nodes.filter(isBlockNode).map(
    (block): LegacyBlock => ({
      ...block,
      placementId: block.parentId ?? '',
    }),
  );
  return {
    ...architecture,
    plates,
    blocks,
  };
}

function activateDiffState() {
  useUIStore.getState().setDiffMode(
    true,
    {
      plates: { added: [], removed: [], modified: [] },
      blocks: { added: [], removed: [], modified: [] },
      connections: { added: [], removed: [], modified: [] },
      rootChanges: [],
      summary: { totalChanges: 0, hasBreakingChanges: false },
    },
    {
      id: 'base-arch',
      name: 'Base',
      version: '1',
      nodes: [],
      connections: [],
      endpoints: [],
      externalActors: [],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
  );
}

describe('architectureStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    localStorage.clear();
    uuidState.counter = 0;
    // Build a fresh default workspace directly to avoid resetWorkspace side effects
    // (resetWorkspace persists to localStorage and consumes UUID counters)
    const now = new Date().toISOString();
    const freshWorkspace = {
      id: 'ws-test',
      name: 'My Architecture',
      provider: 'azure' as const,
      architecture: {
        id: 'arch-test',
        name: 'My Architecture',
        version: '2',
        nodes: [] as ArchitectureModel['nodes'],
        connections: [] as ArchitectureModel['connections'],
        endpoints: [],
        externalActors: [
          {
            id: 'ext-internet',
            name: 'Internet',
            type: 'internet' as const,
            position: { x: -3, y: 0, z: 5 },
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };
    useArchitectureStore.setState({
      workspace: freshWorkspace,
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

  // ── Initial state ──

  describe('initial state', () => {
    it('has a default workspace with blank architecture', () => {
      const state = getState();
      expect(state.workspace).toBeDefined();
      expect(state.workspace.name).toBe('My Architecture');
      expect(getArch().plates).toEqual([]);
      expect(getArch().blocks).toEqual([]);
      expect(state.workspace.architecture.connections).toEqual([]);
    });

    it('has empty history', () => {
      const state = getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });

    it('has no validation result', () => {
      expect(getState().validationResult).toBeNull();
    });
  });

  describe('unified node API', () => {
    it('addNode adds container and resource nodes', () => {
      getState().addNode({
        kind: 'container',
        layer: 'region',
        resourceType: 'virtual_network',
        name: 'Node VNet',
        parentId: null,
      });
      const plateId = getArch().plates[0].id;

      getState().addNode({
        kind: 'resource',
        resourceType: 'web_compute',
        name: 'Node VM',
        parentId: plateId,
      });

      expect(getArch().plates).toHaveLength(1);
      expect(getArch().blocks).toHaveLength(1);
      expect(getArch().blocks[0].category).toBe('compute');
    });

    it('addNode falls back to compute category for unknown resource type', () => {
      getState().addPlate('region', 'VNet', null);
      const plateId = getArch().plates[0].id;

      getState().addNode({
        kind: 'resource',
        resourceType: 'totally_unknown_type',
        name: 'Fallback VM',
        parentId: plateId,
      });

      expect(getArch().blocks).toHaveLength(1);
      expect(getArch().blocks[0].category).toBe('compute');
      expect(getArch().blocks[0].resourceType).toBe('totally_unknown_type');
    });

    it('removeNode cascades for container by default and removes only target resource nodes', () => {
      getState().addPlate('region', 'VNet', null);
      const plateId = getArch().plates[0].id;
      getState().addBlock('compute', 'VM', plateId);
      const blockId = getArch().blocks[0].id;

      getState().removeNode(blockId);
      expect(getArch().blocks).toHaveLength(0);

      getState().removeNode(plateId);
      expect(getArch().plates).toHaveLength(0);
    });

    it('removeNode with cascade false does not remove container', () => {
      getState().addPlate('region', 'VNet', null);
      const plateId = getArch().plates[0].id;

      getState().removeNode(plateId, { cascade: false });
      expect(getArch().plates).toHaveLength(1);
      expect(getArch().plates[0].id).toBe(plateId);
    });

    it('renameNode and moveNodePosition handle both containers and resources', () => {
      getState().addPlate('region', 'Old Region', null);
      const plateId = getArch().plates[0].id;
      getState().addBlock('compute', 'Old VM', plateId);
      const blockId = getArch().blocks[0].id;
      const originalBlockPosition = { ...getArch().blocks[0].position };

      getState().renameNode(plateId, 'New Region');
      getState().renameNode(blockId, 'New VM');
      getState().moveNodePosition(plateId, 2, 1);
      getState().moveNodePosition(blockId, 1, 1);

      const renamedContainer = getArch().plates.find((c) => c.id === plateId);
      const renamedBlock = getArch().blocks.find((block) => block.id === blockId);
      expect(renamedContainer?.name).toBe('New Region');
      expect(renamedBlock?.name).toBe('New VM');
      expect(renamedContainer?.position).toEqual({ x: 2, y: 0, z: 1 });
      expect(renamedBlock?.position).not.toEqual(originalBlockPosition);
    });

    it('updateNodeMetadata updates existing node and no-ops for missing node', () => {
      getState().addPlate('region', 'Meta Region', null);
      const plateId = getArch().plates[0].id;

      getState().updateNodeMetadata(plateId, 'owner', 'team-a');
      expect(getArch().plates[0].metadata.owner).toBe('team-a');

      const beforeMissingUpdate = getState().workspace.architecture;
      getState().updateNodeMetadata('missing-node', 'owner', 'team-b');
      expect(getState().workspace.architecture).toBe(beforeMissingUpdate);
      expect(getArch().plates[0].metadata.owner).toBe('team-a');
    });
  });

  // ── ContainerBlock actions ──

  describe('addPlate', () => {
    it('adds a network container at origin', () => {
      getState().addPlate('region', 'VNet', null);
      const plates = getArch().plates;
      expect(plates).toHaveLength(1);
      expect(plates[0].name).toBe('VNet');
      expect(plates[0].type).toBe('region');
      expect(plates[0].position).toEqual({ x: 0, y: 0, z: 0 });
      expect(plates[0].parentId).toBeNull();
      expect(plates[0].children).toEqual([]);
    });

    it('adds a container with explicit profileId', () => {
      getState().addPlate('region', 'Hub', null, 'network-hub');
      const plates = getArch().plates;
      expect(plates).toHaveLength(1);
      expect(plates[0].profileId).toBe('network-hub');
      expect(plates[0].frame.width).toBe(20);
      expect(plates[0].frame.depth).toBe(24);
      expect(plates[0].frame.height).toBe(1.0);
    });

    it('adds a subnet container with explicit profileId', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Scale', netId, 'subnet-scale');
      const subnet = getArch().plates[1];
      expect(subnet.profileId).toBe('subnet-scale');
      expect(subnet.frame.width).toBe(10);
      expect(subnet.frame.depth).toBe(12);
      expect(subnet.frame.height).toBe(0.6);
    });

    it('adds a subnet container as child of network', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', netId);

      const plates = getArch().plates;
      expect(plates).toHaveLength(2);

      const subnet = plates[1];
      expect(subnet.name).toBe('Public');
      expect(subnet.type).toBe('subnet');
      expect(subnet.parentId).toBe(netId);
      expect(subnet.position.y).toBe(1.0);

      // Network container should have subnet as child
      const network = plates.find((p) => p.id === netId);
      expect(network?.children).toContain(subnet.id);
    });

    it('positions sibling subnets based on count', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;

      getState().addPlate('subnet', 'Sub1', netId);
      getState().addPlate('subnet', 'Sub2', netId);

      const plates = getArch().plates;
      const sub1 = plates[1];
      const sub2 = plates[2];

      expect(sub1.position.x).toBe(-3.5);
      expect(sub2.position.x).toBe(3.5);
    });

    it('pushes to undo history', () => {
      getState().addPlate('region', 'VNet', null);
      expect(getState().canUndo).toBe(true);
    });

    it('rejects subnet when parentId does not exist', () => {
      getState().addPlate('subnet', 'Orphan Subnet', 'missing-parent');

      expect(getArch().plates).toHaveLength(0);
      expect(getState().canUndo).toBe(false);
    });

    it('auto-positions second root container to avoid overlap with first', () => {
      getState().addPlate('region', 'VNet1', null);
      getState().addPlate('region', 'VNet2', null);

      const plates = getArch().plates;
      expect(plates).toHaveLength(2);

      const p1 = plates[0];
      const p2 = plates[1];
      const halfW1 = p1.frame.width / 2;
      const halfW2 = p2.frame.width / 2;
      const gap = p2.position.x - halfW2 - (p1.position.x + halfW1);
      expect(gap).toBeGreaterThanOrEqual(0);
    });

    it('auto-positions third root container to avoid both existing plates', () => {
      getState().addPlate('region', 'VNet1', null);
      getState().addPlate('region', 'VNet2', null);
      getState().addPlate('region', 'VNet3', null);

      const plates = getArch().plates;
      expect(plates).toHaveLength(3);

      for (let i = 0; i < plates.length; i++) {
        for (let j = i + 1; j < plates.length; j++) {
          const a = plates[i];
          const b = plates[j];
          const overlapX =
            a.position.x - a.frame.width / 2 < b.position.x + b.frame.width / 2 &&
            a.position.x + a.frame.width / 2 > b.position.x - b.frame.width / 2;
          const overlapZ =
            a.position.z - a.frame.depth / 2 < b.position.z + b.frame.depth / 2 &&
            a.position.z + a.frame.depth / 2 > b.position.z - b.frame.depth / 2;
          expect(overlapX && overlapZ).toBe(false);
        }
      }
    });

    it('auto-positions subnets within same parent to avoid sibling overlap', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;

      getState().addPlate('subnet', 'Sub1', netId);
      getState().addPlate('subnet', 'Sub2', netId);
      getState().addPlate('subnet', 'Sub3', netId);

      const subnets = getArch().plates.filter((p) => p.parentId === netId);
      expect(subnets).toHaveLength(3);

      for (let i = 0; i < subnets.length; i++) {
        for (let j = i + 1; j < subnets.length; j++) {
          const a = subnets[i];
          const b = subnets[j];
          const overlapX =
            a.position.x - a.frame.width / 2 < b.position.x + b.frame.width / 2 &&
            a.position.x + a.frame.width / 2 > b.position.x - b.frame.width / 2;
          const overlapZ =
            a.position.z - a.frame.depth / 2 < b.position.z + b.frame.depth / 2 &&
            a.position.z + a.frame.depth / 2 > b.position.z - b.frame.depth / 2;
          expect(overlapX && overlapZ).toBe(false);
        }
      }
    });
  });

  describe('removePlate', () => {
    it('removes a container', () => {
      getState().addPlate('region', 'VNet', null);
      const plateId = getArch().plates[0].id;
      getState().removePlate(plateId);
      expect(getArch().plates).toHaveLength(0);
    });

    it('removes child plates recursively', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);

      expect(getArch().plates).toHaveLength(2);
      getState().removePlate(netId);
      expect(getArch().plates).toHaveLength(0);
    });

    it('removes blocks on removed plates and their connections', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      getState().addBlock('data', 'DB', subId);
      const sourceId = getArch().blocks[0].id;
      const targetId = getArch().blocks[1].id;

      getState().addConnection(sourceId, targetId);

      expect(getArch().blocks).toHaveLength(2);
      expect(getArch().connections).toHaveLength(1);

      getState().removePlate(subId);

      expect(getArch().blocks).toHaveLength(0);
      expect(getArch().connections).toHaveLength(0);
    });

    it('removes container from parent children', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().removePlate(subId);

      const network = getArch().plates[0];
      expect(network.children).not.toContain(subId);
    });

    it('no-ops on non-existent container ID', () => {
      getState().addPlate('region', 'VNet', null);
      const before = getArch();
      getState().removePlate('nonexistent-id');
      // Architecture should be unchanged (same reference since withHistory wasn't called)
      expect(getArch().plates).toHaveLength(1);
      expect(getArch().plates[0].name).toBe(before.plates[0].name);
    });

    it('removes deep nested child plates and their blocks recursively', () => {
      getState().addPlate('region', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Outer', networkId);
      const outerId = getArch().plates[1].id;
      getState().addPlate('subnet', 'Inner', outerId);
      const innerId = getArch().plates[2].id;

      getState().addBlock('compute', 'VM', innerId);
      expect(getArch().plates).toHaveLength(3);
      expect(getArch().blocks).toHaveLength(1);

      getState().removePlate(networkId);

      expect(getArch().plates).toHaveLength(0);
      expect(getArch().blocks).toHaveLength(0);
    });
  });

  // ── Block actions ──

  describe('addBlock', () => {
    it('adds a block to a container', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'WebApp', subId);

      const blocks = getArch().blocks;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].name).toBe('WebApp');
      expect(blocks[0].category).toBe('compute');
      expect(blocks[0].placementId).toBe(subId);
    });

    it('adds block to container children', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'WebApp', subId);
      const blockId = getArch().blocks[0].id;

      const container = getArch().plates.find((p) => p.id === subId);
      expect(container?.children).toContain(blockId);
    });

    it('stores provider when provided during block creation', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'WebApp', subId, 'aws');

      const blocks = getArch().blocks;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].provider).toBe('aws');
    });

    it('persists subtype when provided', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId, 'azure', 'vm');

      expect(getArch().blocks[0].subtype).toBe('vm');
    });

    it('no-ops on non-existent container', () => {
      const blocksBefore = getArch().blocks.length;
      getState().addBlock('compute', 'VM', 'nonexistent');
      expect(getArch().blocks).toHaveLength(blocksBefore);
    });

    it('positions blocks using grid layout', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'A', subId);
      getState().addBlock('compute', 'B', subId);

      const blocks = getArch().blocks;
      // They should have different positions
      expect(blocks[0].position).not.toEqual(blocks[1].position);
    });
  });

  describe('duplicateBlock', () => {
    it('duplicates a block with proper grid position', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId, 'azure');
      const source = getArch().blocks[0];

      getState().duplicateBlock(source.id);

      const blocks = getArch().blocks;
      expect(blocks).toHaveLength(2);

      const duplicate = blocks[1];
      expect(duplicate.id).not.toBe(source.id);
      expect(duplicate.name).toBe('VM (copy)');
      expect(duplicate.category).toBe(source.category);
      expect(duplicate.placementId).toBe(source.placementId);
      expect(duplicate.provider).toBe(source.provider);
      expect(duplicate.position.y).toBe(0.6);
      expect(duplicate.position).not.toEqual(source.position);

      const container = getArch().plates.find((p) => p.id === subId);
      expect(container?.children).toContain(source.id);
      expect(container?.children).toContain(duplicate.id);
    });

    it('no-ops on non-existent block id', () => {
      getState().addPlate('region', 'VNet', null);
      const before = getState().workspace.architecture;

      getState().duplicateBlock('missing-block');

      expect(getState().workspace.architecture).toBe(before);
    });

    it('deep-copies nested block fields so source and duplicate are independent', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId, 'azure', 'vm', { sku: 'Standard_B2s' });
      const source = getArch().blocks[0];

      getState().duplicateBlock(source.id);

      const blocks = getArch().blocks;
      expect(blocks).toHaveLength(2);

      const duplicate = blocks[1];
      expect(duplicate.config).toEqual({ sku: 'Standard_B2s' });
      expect(duplicate.config).not.toBe(source.config);
      expect(duplicate.metadata).not.toBe(source.metadata);
    });

    it('deep-copies aggregation and roles when present', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId, 'azure');
      const sourceId = getArch().blocks[0].id;

      // Inject aggregation and roles via setState (addBlock doesn't support them)
      const arch = getState().workspace.architecture;
      const resourceNodes = arch.nodes.filter(isBlockNode);
      const enrichedBlock = {
        ...resourceNodes[0],
        aggregation: { mode: 'count' as const, count: 3 },
        roles: ['primary' as const, 'writer' as const],
      };
      useArchitectureStore.setState({
        workspace: {
          ...getState().workspace,
          architecture: {
            ...arch,
            nodes: [...arch.nodes.filter((node) => !isBlockNode(node)), enrichedBlock],
          },
        },
      });

      getState().duplicateBlock(sourceId);

      const blocks = getArch().blocks;
      expect(blocks).toHaveLength(2);

      const duplicate = blocks[1];
      expect(duplicate.aggregation).toEqual({ mode: 'count', count: 3 });
      expect(duplicate.aggregation).not.toBe(enrichedBlock.aggregation);
      expect(duplicate.roles).toEqual(['primary', 'writer']);
      expect(duplicate.roles).not.toBe(enrichedBlock.roles);
    });
  });

  describe('renameBlock', () => {
    it('renames a block', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;
      getState().addBlock('compute', 'Old Name', subId);
      const blockId = getArch().blocks[0].id;

      getState().renameBlock(blockId, 'New Name');

      expect(getArch().blocks[0].name).toBe('New Name');
    });

    it('no-ops when blockId does not exist', () => {
      const before = getState().workspace.architecture;
      getState().renameBlock('missing-block', 'New Name');

      expect(getState().workspace.architecture).toBe(before);
      expect(getState().canUndo).toBe(false);
    });
  });

  describe('renamePlate', () => {
    it('renames a container', () => {
      getState().addPlate('region', 'Old ContainerBlock', null);
      const plateId = getArch().plates[0].id;

      getState().renamePlate(plateId, 'New ContainerBlock');

      expect(getArch().plates[0].name).toBe('New ContainerBlock');
    });

    it('no-ops when plateId does not exist', () => {
      const before = getState().workspace.architecture;
      getState().renamePlate('missing-container', 'New ContainerBlock');

      expect(getState().workspace.architecture).toBe(before);
      expect(getState().canUndo).toBe(false);
    });
  });

  describe('removeBlock', () => {
    it('removes a block and its connections', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('delivery', 'Gateway', subId);
      getState().addBlock('compute', 'VM', subId);
      const gatewayId = getArch().blocks[0].id;
      const blockId = getArch().blocks[1].id;
      getState().addConnection(gatewayId, blockId);

      getState().removeBlock(blockId);

      expect(getArch().blocks).toHaveLength(1);
      expect(getArch().connections).toHaveLength(0);
    });

    it('removes block from container children', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      getState().removeBlock(blockId);

      const container = getArch().plates.find((p) => p.id === subId);
      expect(container?.children).not.toContain(blockId);
    });

    it('no-ops on non-existent block', () => {
      getState().addPlate('region', 'VNet', null);
      const before = getArch().blocks.length;
      getState().removeBlock('nonexistent');
      expect(getArch().blocks).toHaveLength(before);
    });
  });

  describe('moveBlock', () => {
    it('moves a block between plates', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub1', netId);
      const sub1Id = getArch().plates[1].id;
      getState().addPlate('subnet', 'Sub2', netId);
      const sub2Id = getArch().plates[2].id;

      getState().addBlock('compute', 'VM', sub1Id);
      const blockId = getArch().blocks[0].id;

      getState().moveBlock(blockId, sub2Id);

      const block = getArch().blocks[0];
      expect(block.placementId).toBe(sub2Id);

      // Old container should not have block
      const oldPlate = getArch().plates.find((p) => p.id === sub1Id);
      expect(oldPlate?.children).not.toContain(blockId);

      // New container should have block
      const newPlate = getArch().plates.find((p) => p.id === sub2Id);
      expect(newPlate?.children).toContain(blockId);
    });

    it('no-ops when moving to same container', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub1', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;
      // Reset history so we can detect if moveBlock pushes

      // Reset history so we can detect if moveBlock pushes
      getState().moveBlock(blockId, subId);

      // Still on same container
      expect(getArch().blocks[0].placementId).toBe(subId);
    });

    it('keeps architecture reference when moving to same container', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub1', netId);
      const subId = getArch().plates[1].id;
      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      const before = getState().workspace.architecture;
      getState().moveBlock(blockId, subId);
      expect(getState().workspace.architecture).toBe(before);
    });

    it('no-ops on non-existent block', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().moveBlock('nonexistent', subId);
      // No crash
    });

    it('no-ops on non-existent target container', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      getState().moveBlock(blockId, 'nonexistent');
      expect(getArch().blocks[0].placementId).toBe(subId);
    });

    it('keeps architecture reference when target container does not exist', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const subId = getArch().plates[1].id;
      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      const before = getState().workspace.architecture;
      getState().moveBlock(blockId, 'missing-target');
      expect(getState().workspace.architecture).toBe(before);
    });

    it('rejects move when placement rules are violated', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId);
      const privateSubId = getArch().plates[1].id;

      getState().addBlock('delivery', 'FW', privateSubId);
      const blockId = getArch().blocks[0].id;

      const before = getState().workspace.architecture;
      getState().moveBlock(blockId, netId);

      expect(getState().workspace.architecture).toBe(before);
      expect(getArch().blocks[0].placementId).toBe(privateSubId);
    });
  });

  describe('setPlateProfile', () => {
    it('resizes child container and clamps position within parent bounds', () => {
      getState().addPlate('region', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', networkId);
      const subnetId = getArch().plates[1].id;

      getState().movePlatePosition(subnetId, 100, 100);
      const before = getArch().plates.find((container) => container.id === subnetId);
      expect(before?.position.x).toBe(5);

      getState().setPlateProfile(subnetId, 'subnet-scale');
      const resized = getArch().plates.find((container) => container.id === subnetId);
      expect(resized?.profileId).toBe('subnet-scale');
      expect(resized?.frame.width).toBe(10);
      expect(resized?.position.x).toBe(3);
    });

    it('resizes container even when parentId points to missing parent', () => {
      const orphan = {
        id: 'orphan-subnet',
        name: 'Orphan',
        kind: 'container' as const,
        layer: 'subnet' as const,
        resourceType: 'subnet' as const,
        category: 'network' as const,
        provider: 'azure' as const,
        parentId: 'missing-parent',
        position: { x: 4, y: 0.3, z: 4 },
        frame: { width: 6, height: 0.3, depth: 8 },
        metadata: {},
      };
      useArchitectureStore.setState({
        workspace: {
          ...getState().workspace,
          architecture: { ...getState().workspace.architecture, nodes: [orphan] },
        },
      });

      getState().setPlateProfile('orphan-subnet', 'subnet-scale');
      const resized = getArch().plates.find((container) => container.id === 'orphan-subnet');
      expect(resized?.profileId).toBe('subnet-scale');
      expect(resized?.position).toEqual({ x: 4, y: 0.3, z: 4 });
    });

    it('clamps child plates and blocks when parent container shrinks', () => {
      // Region default (network-platform): 16 x 20
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;

      // Subnet default (subnet-service): 6 x 8
      getState().addPlate('subnet', 'Public', regionId);
      const subnetId = getArch().plates[1].id;

      // Add a block on the region
      getState().addBlock('compute', 'VM', regionId);
      const blockId = getArch().blocks[0].id;

      // Move subnet and block to the far edge (will be beyond bounds after resize)
      getState().movePlatePosition(subnetId, 100, 100);
      getState().moveBlockPosition(blockId, 100, 100);

      // Verify they are clamped to region edges before resize
      const subnetBefore = getArch().plates.find((p) => p.id === subnetId)!;
      const blockBefore = getArch().blocks.find((b) => b.id === blockId)!;
      expect(subnetBefore.position.x).toBeGreaterThan(0);
      expect(blockBefore.position.x).toBeGreaterThan(0);

      // Shrink the region from network-platform (16x20) to network-sandbox (8x12)
      getState().setPlateProfile(regionId, 'network-sandbox');

      // After resize, children should be clamped within the new smaller bounds
      const subnetAfter = getArch().plates.find((p) => p.id === subnetId)!;
      const blockAfter = getArch().blocks.find((b) => b.id === blockId)!;
      const regionAfter = getArch().plates.find((p) => p.id === regionId)!;

      // Subnet relative position should be clamped: max relative x = (8/2) - (6/2) = 1
      const subnetRelX = subnetAfter.position.x - regionAfter.position.x;
      expect(subnetRelX).toBeLessThanOrEqual(1);

      // Block position should be within new bounds: max x = (8/2) - (2.4/2) = 2.8
      expect(blockAfter.position.x).toBeLessThanOrEqual(2.8);
    });

    it('returns unchanged state for non-existent plate', () => {
      getState().addPlate('region', 'VNet', null);
      const before = getState().workspace.architecture;

      getState().setPlateProfile('nonexistent-plate', 'subnet-service');

      expect(getState().workspace.architecture).toBe(before);
    });
  });

  describe('resizePlate', () => {
    it('resizes a container to the specified even dimensions', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;

      getState().resizePlate(regionId, 20, 24);
      const resized = getArch().plates.find((p) => p.id === regionId)!;
      expect(resized.frame.width).toBe(20);
      expect(resized.frame.depth).toBe(24);
    });

    it('snaps odd dimensions to nearest even integer', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;

      getState().resizePlate(regionId, 11, 15);
      const resized = getArch().plates.find((p) => p.id === regionId)!;
      // 11 → 12, 15 → 16 (nearest even)
      expect(resized.frame.width % 2).toBe(0);
      expect(resized.frame.depth % 2).toBe(0);
    });

    it('enforces minimum size for network containers (4x4)', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;

      getState().resizePlate(regionId, 1, 1);
      const resized = getArch().plates.find((p) => p.id === regionId)!;
      expect(resized.frame.width).toBeGreaterThanOrEqual(4);
      expect(resized.frame.depth).toBeGreaterThanOrEqual(4);
    });

    it('enforces minimum size for subnet containers (2x2)', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', regionId);
      const subnetId = getArch().plates[1].id;

      getState().resizePlate(subnetId, 1, 1);
      const resized = getArch().plates.find((p) => p.id === subnetId)!;
      expect(resized.frame.width).toBeGreaterThanOrEqual(2);
      expect(resized.frame.depth).toBeGreaterThanOrEqual(2);
    });

    it('enforces maximum size cap (40x40)', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;

      getState().resizePlate(regionId, 100, 100);
      const resized = getArch().plates.find((p) => p.id === regionId)!;
      expect(resized.frame.width).toBeLessThanOrEqual(40);
      expect(resized.frame.depth).toBeLessThanOrEqual(40);
    });

    it('anchors S edge when anchorEdge includes s', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      const before = getArch().plates.find((p) => p.id === regionId)!;
      const southEdge = before.position.x - before.frame.width / 2;

      getState().resizePlate(regionId, 20, before.frame.depth, 's');
      const after = getArch().plates.find((p) => p.id === regionId)!;
      const southEdgeAfter = after.position.x - after.frame.width / 2;
      expect(southEdgeAfter).toBeCloseTo(southEdge, 5);
    });

    it('anchors N edge when anchorEdge includes n', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      const before = getArch().plates.find((p) => p.id === regionId)!;
      const northEdge = before.position.x + before.frame.width / 2;

      getState().resizePlate(regionId, 20, before.frame.depth, 'n');
      const after = getArch().plates.find((p) => p.id === regionId)!;
      const northEdgeAfter = after.position.x + after.frame.width / 2;
      expect(northEdgeAfter).toBeCloseTo(northEdge, 5);
    });

    it('anchors W edge when anchorEdge includes w', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      const before = getArch().plates.find((p) => p.id === regionId)!;
      const westEdge = before.position.z - before.frame.depth / 2;

      getState().resizePlate(regionId, before.frame.width, 24, 'w');
      const after = getArch().plates.find((p) => p.id === regionId)!;
      const westEdgeAfter = after.position.z - after.frame.depth / 2;
      expect(westEdgeAfter).toBeCloseTo(westEdge, 5);
    });

    it('anchors E edge when anchorEdge includes e', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      const before = getArch().plates.find((p) => p.id === regionId)!;
      const eastEdge = before.position.z + before.frame.depth / 2;

      getState().resizePlate(regionId, before.frame.width, 24, 'e');
      const after = getArch().plates.find((p) => p.id === regionId)!;
      const eastEdgeAfter = after.position.z + after.frame.depth / 2;
      expect(eastEdgeAfter).toBeCloseTo(eastEdge, 5);
    });

    it('anchors SW corner when anchorEdge is sw', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      const before = getArch().plates.find((p) => p.id === regionId)!;
      const southEdge = before.position.x - before.frame.width / 2;
      const westEdge = before.position.z - before.frame.depth / 2;

      getState().resizePlate(regionId, 20, 24, 'sw');
      const after = getArch().plates.find((p) => p.id === regionId)!;
      expect(after.position.x - after.frame.width / 2).toBeCloseTo(southEdge, 5);
      expect(after.position.z - after.frame.depth / 2).toBeCloseTo(westEdge, 5);
    });

    it('updates profileId to closest matching profile', () => {
      getState().addPlate('subnet', 'Public', null);
      const subnetId = getArch().plates[0].id;

      // Resize to subnet-workload dimensions (8x10)
      getState().resizePlate(subnetId, 8, 10);
      const resized = getArch().plates.find((p) => p.id === subnetId)!;
      expect(resized.profileId).toBe('subnet-workload');
    });

    it('clamps child containers when parent shrinks', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', regionId);
      const subnetId = getArch().plates[1].id;

      // Move subnet to far edge
      getState().movePlatePosition(subnetId, 100, 100);

      // Shrink region to 10x12 (still fits subnet 6×8)
      getState().resizePlate(regionId, 10, 12);
      const regionAfter = getArch().plates.find((p) => p.id === regionId)!;
      const subnetAfter = getArch().plates.find((p) => p.id === subnetId)!;

      // Subnet should be clamped within new bounds
      const relX = subnetAfter.position.x - regionAfter.position.x;
      const relZ = subnetAfter.position.z - regionAfter.position.z;
      const maxRelX = (regionAfter.frame.width - subnetAfter.frame.width) / 2;
      const maxRelZ = (regionAfter.frame.depth - subnetAfter.frame.depth) / 2;
      expect(Math.abs(relX)).toBeLessThanOrEqual(maxRelX + 0.01);
      expect(Math.abs(relZ)).toBeLessThanOrEqual(maxRelZ + 0.01);
    });

    it('clamps child resource blocks when parent shrinks', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      getState().addBlock('compute', 'VM', regionId);
      const blockId = getArch().blocks[0].id;

      // Move block to far edge
      getState().moveBlockPosition(blockId, 100, 100);

      // Shrink region to 6x6
      getState().resizePlate(regionId, 6, 6);
      const blockAfter = getArch().blocks.find((b) => b.id === blockId)!;

      // Block relative position should be within bounds
      // Max relative x for block = (6 - 2.4) / 2 = 1.8
      expect(Math.abs(blockAfter.position.x)).toBeLessThanOrEqual(1.8 + 0.01);
    });

    it('returns unchanged state when container not found', () => {
      getState().addPlate('region', 'VNet', null);
      const before = getArch();
      getState().resizePlate('nonexistent', 20, 20);
      const after = getArch();
      expect(after.nodes).toEqual(before.nodes);
    });

    it('returns unchanged state when dimensions match current', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      const before = getArch().plates.find((p) => p.id === regionId)!;

      getState().resizePlate(regionId, before.frame.width, before.frame.depth);
      // Should be no-op (same dimensions)
      const after = getArch().plates.find((p) => p.id === regionId)!;
      expect(after.frame.width).toBe(before.frame.width);
      expect(after.frame.depth).toBe(before.frame.depth);
    });

    it('preserves frame height during resize', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      const before = getArch().plates.find((p) => p.id === regionId)!;

      getState().resizePlate(regionId, 20, 24);
      const resized = getArch().plates.find((p) => p.id === regionId)!;
      expect(resized.frame.height).toBe(before.frame.height);
    });
  });

  describe('movePlatePosition', () => {
    it('moves a root container by the provided delta', () => {
      getState().addPlate('region', 'VNet', null);
      const rootPlate = getArch().plates[0];

      getState().movePlatePosition(rootPlate.id, 2, -3);

      const moved = getArch().plates.find((container) => container.id === rootPlate.id);
      expect(moved?.position).toEqual({ x: 2, y: 0, z: -3 });
    });

    it('clamps child container movement within parent bounds', () => {
      getState().addPlate('region', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', networkId);
      const subnet = getArch().plates[1];

      getState().movePlatePosition(subnet.id, 100, 100);

      const movedSubnet = getArch().plates.find((container) => container.id === subnet.id);
      expect(movedSubnet?.position.x).toBe(5);
      expect(movedSubnet?.position.z).toBe(6);
    });

    it('moves direct child plates by the same applied delta', () => {
      getState().addPlate('region', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Outer', networkId);
      const outerSubnetId = getArch().plates[1].id;
      getState().addPlate('subnet', 'Inner', outerSubnetId);
      const outerBefore = getArch().plates.find((container) => container.id === outerSubnetId);
      const innerBefore = getArch().plates.find(
        (container) => container.id !== outerSubnetId && container.parentId === outerSubnetId,
      );

      getState().movePlatePosition(outerSubnetId, 1.25, -1.5);

      const outerAfter = getArch().plates.find((container) => container.id === outerSubnetId);
      const innerAfter = getArch().plates.find((container) => container.parentId === outerSubnetId);

      expect(outerAfter?.position.x).toBe((outerBefore?.position.x ?? 0) + 1.25);
      expect(outerAfter?.position.z).toBe((outerBefore?.position.z ?? 0) - 1.5);
      expect(innerAfter?.position.x).toBe((innerBefore?.position.x ?? 0) + 1.25);
      expect(innerAfter?.position.z).toBe((innerBefore?.position.z ?? 0) - 1.5);
    });

    it('moves deeply nested descendant plates recursively', () => {
      getState().addPlate('region', 'VNet', null);
      const regionId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Outer', regionId);
      const outerId = getArch().plates[1].id;
      getState().addPlate('subnet', 'Inner', outerId);
      const innerId = getArch().plates[2].id;

      const regionBefore = getArch().plates.find((p) => p.id === regionId)!;
      const outerBefore = getArch().plates.find((p) => p.id === outerId)!;
      const innerBefore = getArch().plates.find((p) => p.id === innerId)!;

      getState().movePlatePosition(regionId, 3, -2);

      const regionAfter = getArch().plates.find((p) => p.id === regionId)!;
      const outerAfter = getArch().plates.find((p) => p.id === outerId)!;
      const innerAfter = getArch().plates.find((p) => p.id === innerId)!;

      expect(regionAfter.position.x).toBe(regionBefore.position.x + 3);
      expect(regionAfter.position.z).toBe(regionBefore.position.z - 2);
      expect(outerAfter.position.x).toBe(outerBefore.position.x + 3);
      expect(outerAfter.position.z).toBe(outerBefore.position.z - 2);
      expect(innerAfter.position.x).toBe(innerBefore.position.x + 3);
      expect(innerAfter.position.z).toBe(innerBefore.position.z - 2);
    });

    it('no-ops when moving a non-existent container', () => {
      getState().addPlate('region', 'VNet', null);
      const before = getState().workspace.architecture;

      getState().movePlatePosition('missing-container', 1, 1);

      expect(getState().workspace.architecture).toBe(before);
    });

    it('prevents root container from overlapping a sibling when dragged', () => {
      getState().addPlate('region', 'VNet1', null);
      getState().addPlate('region', 'VNet2', null);

      const plates = getArch().plates;
      const p1 = plates[0];
      const p2 = plates[1];

      getState().movePlatePosition(p2.id, -(p2.position.x - p1.position.x), 0);

      const afterP1 = getArch().plates.find((p) => p.id === p1.id)!;
      const afterP2 = getArch().plates.find((p) => p.id === p2.id)!;

      const overlapX =
        afterP1.position.x - afterP1.frame.width / 2 <
          afterP2.position.x + afterP2.frame.width / 2 &&
        afterP1.position.x + afterP1.frame.width / 2 > afterP2.position.x - afterP2.frame.width / 2;
      const overlapZ =
        afterP1.position.z - afterP1.frame.depth / 2 <
          afterP2.position.z + afterP2.frame.depth / 2 &&
        afterP1.position.z + afterP1.frame.depth / 2 > afterP2.position.z - afterP2.frame.depth / 2;
      expect(overlapX && overlapZ).toBe(false);
    });

    it('allows movement that does not cause overlap', () => {
      getState().addPlate('region', 'VNet1', null);
      getState().addPlate('region', 'VNet2', null);

      const p2Before = getArch().plates[1];
      getState().movePlatePosition(p2Before.id, 5, 0);

      const p2After = getArch().plates.find((p) => p.id === p2Before.id)!;
      expect(p2After.position.x).toBe(p2Before.position.x + 5);
    });
  });

  describe('moveBlockPosition', () => {
    it('moves a block without clamping in parent container', () => {
      getState().addPlate('region', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', networkId);
      const subnetId = getArch().plates[1].id;
      getState().addBlock('compute', 'VM', subnetId);
      const blockId = getArch().blocks[0].id;

      getState().moveBlockPosition(blockId, 100, -100);

      const moved = getArch().blocks.find((block) => block.id === blockId);
      expect(moved?.position.x).toBe(100);
      expect(moved?.position.z).toBe(-100);
    });

    it('no-ops when moving a block whose parent container is missing', () => {
      const before = getState().workspace.architecture;
      const orphaned: ArchitectureModel = {
        ...before,
        nodes: [
          makeResourceNode('orphan-block', 'missing-container', 'compute', { name: 'Orphan' }),
        ],
      };
      useArchitectureStore.setState({
        workspace: {
          ...getState().workspace,
          architecture: orphaned,
        },
      });

      const archBeforeMove = getState().workspace.architecture;
      getState().moveBlockPosition('orphan-block', 1, 1);

      expect(getState().workspace.architecture).toBe(archBeforeMove);
    });

    it('no-ops when moving a non-existent block', () => {
      getState().addPlate('region', 'VNet', null);
      const before = getState().workspace.architecture;

      getState().moveBlockPosition('missing-block', 1, 1);

      expect(getState().workspace.architecture).toBe(before);
    });

    it('moves a top-level block with null parentId', () => {
      getState().addBlock('compute', 'Internet VM', null);
      const blockId = getArch().blocks[0].id;
      const before = getArch().blocks.find((block) => block.id === blockId)!;

      getState().moveBlockPosition(blockId, 1, -2);

      const after = getArch().blocks.find((block) => block.id === blockId)!;
      expect(after.position.x).toBe(before.position.x + 1);
      expect(after.position.z).toBe(before.position.z - 2);
      expect(after.position.y).toBe(before.position.y);
    });
  });

  // ── Connection actions ──

  describe('addConnection', () => {
    const createConnectionFixture = () => {
      getState().addPlate('region', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Subnet', networkId);
      const subnetId = getArch().plates[1].id;

      getState().addBlock('delivery', 'Gateway', subnetId);
      getState().addBlock('compute', 'Compute', subnetId);
      getState().addBlock('data', 'Database', subnetId);
      getState().addBlock('data', 'Storage', subnetId);

      const [gatewayId, computeId, databaseId, storageId] = getArch().blocks.map(
        (block) => block.id,
      );
      return { gatewayId, computeId, databaseId, storageId };
    };

    it('creates a dataflow connection', () => {
      const { gatewayId, computeId } = createConnectionFixture();
      const success = getState().addConnection(gatewayId, computeId);

      expect(success).toBe(true);
      const conns = getArch().connections;
      expect(conns).toHaveLength(1);
      const { sourceId, targetId, type } = resolveConnectionNodes(conns[0]);
      expect(sourceId).toBe(gatewayId);
      expect(targetId).toBe(computeId);
      expect(type).toBe('dataflow');
    });

    it('prevents duplicate connections', () => {
      const { gatewayId, computeId } = createConnectionFixture();
      getState().addConnection(gatewayId, computeId);
      const success = getState().addConnection(gatewayId, computeId);

      expect(success).toBe(false);
      expect(getArch().connections).toHaveLength(1);
    });

    it('rejects self-connections', () => {
      const { computeId } = createConnectionFixture();

      const success = getState().addConnection(computeId, computeId);

      expect(success).toBe(false);
      expect(getArch().connections).toHaveLength(0);
    });

    it('rejects invalid category pairs', () => {
      const { databaseId, computeId, storageId, gatewayId } = createConnectionFixture();

      const dbToCompute = getState().addConnection(databaseId, computeId);
      const storageToGateway = getState().addConnection(storageId, gatewayId);

      expect(dbToCompute).toBe(false);
      expect(storageToGateway).toBe(false);
      expect(getArch().connections).toHaveLength(0);
    });

    it('accepts valid category pairs', () => {
      const { gatewayId, computeId, databaseId } = createConnectionFixture();

      const gatewayToCompute = getState().addConnection(gatewayId, computeId);
      const computeToDatabase = getState().addConnection(computeId, databaseId);

      expect(gatewayToCompute).toBe(true);
      expect(computeToDatabase).toBe(true);
      expect(getArch().connections).toHaveLength(2);
    });

    it('returns false when source block does not exist', () => {
      const { computeId } = createConnectionFixture();

      const success = getState().addConnection('missing-source', computeId);

      expect(success).toBe(false);
      expect(getArch().connections).toHaveLength(0);
    });

    it('returns false when target block does not exist', () => {
      const { gatewayId } = createConnectionFixture();

      const success = getState().addConnection(gatewayId, 'missing-target');

      expect(success).toBe(false);
      expect(getArch().connections).toHaveLength(0);
    });
  });

  describe('removeConnection', () => {
    it('removes a connection by ID', () => {
      getState().addPlate('region', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Subnet', networkId);
      const subnetId = getArch().plates[1].id;
      getState().addBlock('delivery', 'Gateway', subnetId);
      getState().addBlock('compute', 'Compute', subnetId);
      const sourceId = getArch().blocks[0].id;
      const targetId = getArch().blocks[1].id;

      getState().addConnection(sourceId, targetId);
      const connId = getArch().connections[0].id;
      getState().removeConnection(connId);
      expect(getArch().connections).toHaveLength(0);
    });
  });

  // ── Validation ──

  describe('validate', () => {
    it('sets validationResult and returns it', () => {
      const result = getState().validate();
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(getState().validationResult).toEqual(result);
    });

    it('returns errors for invalid architectures', () => {
      getState().addPlate('region', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addBlock('compute', 'VM', netId);

      const result = getState().validate();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── History (v0.2) ──

  describe('undo/redo', () => {
    it('undoes the last action', () => {
      getState().addPlate('region', 'VNet', null);
      expect(getArch().plates).toHaveLength(1);
      expect(getState().canUndo).toBe(true);

      getState().undo();
      expect(getArch().plates).toHaveLength(0);
      expect(getState().canRedo).toBe(true);
    });

    it('redoes an undone action', () => {
      getState().addPlate('region', 'VNet', null);
      getState().undo();
      expect(getArch().plates).toHaveLength(0);

      getState().redo();
      expect(getArch().plates).toHaveLength(1);
    });

    it('undo is no-op when history is empty', () => {
      const archBefore = getArch();
      getState().undo();
      expect(getArch().name).toBe(archBefore.name);
    });

    it('redo is no-op when future is empty', () => {
      getState().addPlate('region', 'VNet', null);
      const archBefore = getArch();
      getState().redo();
      expect(getArch().plates).toHaveLength(archBefore.plates.length);
    });

    it('clears validationResult on undo', () => {
      getState().addPlate('region', 'VNet', null);
      getState().validate();
      expect(getState().validationResult).not.toBeNull();

      getState().undo();
      expect(getState().validationResult).toBeNull();
    });

    it('tracks multiple undo steps', () => {
      getState().addPlate('region', 'A', null);
      getState().addPlate('region', 'B', null);
      getState().addPlate('region', 'C', null);

      expect(getArch().plates).toHaveLength(3);
      getState().undo();
      expect(getArch().plates).toHaveLength(2);
      getState().undo();
      expect(getArch().plates).toHaveLength(1);
      getState().undo();
      expect(getArch().plates).toHaveLength(0);
    });
  });

  // ── Workspace persistence ──

  describe('saveToStorage / loadFromStorage', () => {
    it('saves and loads workspaces', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      getState().addPlate('region', 'VNet', null);
      getState().saveToStorage();

      expect(setItemSpy).toHaveBeenCalled();
      setItemSpy.mockRestore();

      // Manually clear in-memory state without persisting, then reload from storage
      useArchitectureStore.setState({
        workspace: {
          ...getState().workspace,
          architecture: { ...getState().workspace.architecture, nodes: [], connections: [] },
        },
      });
      expect(getArch().plates).toHaveLength(0);

      getState().loadFromStorage();
      expect(getArch().plates).toHaveLength(1);
    });

    it('saveToStorage returns true on success', () => {
      const result = getState().saveToStorage();
      expect(result).toBe(true);
    });

    it('saveToStorage returns false when localStorage throws', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const result = getState().saveToStorage();
      expect(result).toBe(false);
      spy.mockRestore();
    });

    it('loadFromStorage restores last active workspace', () => {
      getState().addPlate('region', 'First', null);
      getState().saveToStorage();

      getState().createWorkspace('Second WS');
      getState().addPlate('region', 'SecondPlate', null);
      getState().saveToStorage();

      const secondId = getState().workspace.id;

      // Reset and reload — should restore Second WS (last active)
      useArchitectureStore.setState({
        workspace: { ...getState().workspace, id: 'temp', name: 'Temp' },
        workspaces: [],
      });

      getState().loadFromStorage();
      expect(getState().workspace.id).toBe(secondId);
      expect(getState().workspace.name).toBe('Second WS');
    });

    it('loadFromStorage is no-op when localStorage is empty', () => {
      const archBefore = getArch();
      getState().loadFromStorage();
      // No crash, workspace still has content
      expect(getArch().name).toBe(archBefore.name);
    });

    it('loadFromStorage resets history', () => {
      getState().addPlate('region', 'VNet', null);
      getState().saveToStorage();
      expect(getState().canUndo).toBe(true);

      getState().loadFromStorage();
      expect(getState().canUndo).toBe(false);
      expect(getState().canRedo).toBe(false);
    });

    it('loadFromStorage clears active diff state', () => {
      getState().saveToStorage();
      activateDiffState();

      getState().loadFromStorage();

      const uiState = useUIStore.getState();
      expect(uiState.diffMode).toBe(false);
      expect(uiState.diffDelta).toBe(null);
      expect(uiState.diffBaseArchitecture).toBe(null);
    });
  });

  describe('resetWorkspace', () => {
    it('resets to default empty workspace while preserving workspace identity', () => {
      getState().addPlate('region', 'VNet', null);
      getState().addBlock('compute', 'VM', getArch().plates[0].id);
      const workspaceId = getState().workspace.id;
      const workspaceName = getState().workspace.name;

      getState().resetWorkspace();

      expect(getArch().plates).toHaveLength(0);
      expect(getArch().blocks).toHaveLength(2);
      expect(
        getArch()
          .blocks.map((block) => block.id)
          .sort(),
      ).toEqual(['ext-browser', 'ext-internet']);
      expect(getState().validationResult).toBeNull();
      expect(getState().canUndo).toBe(false);
      expect(getState().canRedo).toBe(false);
      expect(getState().workspace.id).toBe(workspaceId);
      expect(getState().workspace.name).toBe(workspaceName);
    });

    it('skips saveActiveWorkspaceId when saveWorkspaces fails', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key) => {
        if (key === 'cloudblocks:workspaces') {
          throw new Error('QuotaExceededError');
        }
      });

      getState().resetWorkspace();

      // State should still be updated even when persistence fails
      expect(getArch().plates).toHaveLength(0);
      // saveActiveWorkspaceId should NOT have been called
      const activeIdCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:activeWorkspaceId');
      expect(activeIdCalls).toHaveLength(0);
      spy.mockRestore();
    });

    it('clears active diff state', () => {
      activateDiffState();

      getState().resetWorkspace();

      const uiState = useUIStore.getState();
      expect(uiState.diffMode).toBe(false);
      expect(uiState.diffDelta).toBe(null);
      expect(uiState.diffBaseArchitecture).toBe(null);
    });
  });

  describe('renameWorkspace', () => {
    it('updates workspace name without changing architecture name', () => {
      const originalArchName = getArch().name;
      getState().renameWorkspace('New Name');
      expect(getState().workspace.name).toBe('New Name');
      expect(getArch().name).toBe(originalArchName);
    });

    it('updates updatedAt timestamp', () => {
      const before = getState().workspace.updatedAt;
      vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
      getState().renameWorkspace('Renamed');
      expect(getState().workspace.updatedAt).not.toBe(before);
    });

    it('persists the renamed workspace to storage', () => {
      const spy = vi.spyOn(localStorage, 'setItem');
      getState().renameWorkspace('Persisted Name');
      const workspaceCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:workspaces');
      expect(workspaceCalls.length).toBeGreaterThan(0);
      spy.mockRestore();
    });

    it('auto-suffixes name when renaming to an existing workspace name', () => {
      getState().createWorkspace('Other');
      getState().renameWorkspace('My Architecture');
      const names = getState().workspaces.map((ws) => ws.name);
      expect(names).toContain('My Architecture');
      expect(getState().workspace.name).toBe('My Architecture (2)');
    });
  });

  // ── Multi-workspace (v0.4) ──

  describe('createWorkspace', () => {
    it('creates a new workspace and switches to it', () => {
      const oldId = getState().workspace.id;
      getState().createWorkspace('New Project');

      expect(getState().workspace.name).toBe('New Project');
      expect(getState().workspace.id).not.toBe(oldId);
      expect(getArch().plates).toHaveLength(0);
    });

    it('saves current workspace to list', () => {
      getState().addPlate('region', 'VNet', null);
      const oldId = getState().workspace.id;

      getState().createWorkspace('New Project');

      const saved = getState().workspaces.find((ws) => ws.id === oldId);
      expect(saved).toBeDefined();
      expect(saved?.architecture.nodes.filter((node) => node.kind === 'container')).toHaveLength(1);
    });

    it('resets history for the new workspace', () => {
      getState().addPlate('region', 'VNet', null);
      expect(getState().canUndo).toBe(true);

      getState().createWorkspace('New Project');
      expect(getState().canUndo).toBe(false);
    });

    it('skips saveActiveWorkspaceId when saveWorkspaces fails', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key) => {
        if (key === 'cloudblocks:workspaces') {
          throw new Error('QuotaExceededError');
        }
      });

      getState().createWorkspace('Fail Project');

      expect(getState().workspace.name).toBe('Fail Project');
      const activeIdCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:activeWorkspaceId');
      expect(activeIdCalls).toHaveLength(0);
      spy.mockRestore();
    });

    it('auto-suffixes name when a workspace with the same name exists', () => {
      getState().createWorkspace('Alpha');
      expect(getState().workspace.name).toBe('Alpha');

      getState().createWorkspace('Alpha');
      expect(getState().workspace.name).toBe('Alpha (2)');

      getState().createWorkspace('Alpha');
      expect(getState().workspace.name).toBe('Alpha (3)');
    });
  });

  describe('switchWorkspace', () => {
    it('switches to a different workspace', () => {
      getState().addPlate('region', 'Original', null);
      const originalId = getState().workspace.id;

      getState().createWorkspace('Second');

      getState().switchWorkspace(originalId);
      expect(getState().workspace.id).toBe(originalId);
      expect(getArch().plates).toHaveLength(1);
      expect(getArch().plates[0].name).toBe('Original');
    });

    it('no-ops when switching to current workspace', () => {
      getState().createWorkspace('WS1');
      const wsId = getState().workspace.id;

      getState().switchWorkspace(wsId);
      // Should be same workspace object (no state change)
      expect(getState().workspace.id).toBe(wsId);
    });

    it('no-ops when switching to unknown ID', () => {
      const wsBefore = getState().workspace;
      getState().switchWorkspace('nonexistent');
      expect(getState().workspace.id).toBe(wsBefore.id);
    });

    it('saves current workspace state into list before switching', () => {
      getState().createWorkspace('Second');
      const secondId = getState().workspace.id;
      getState().addPlate('region', 'InSecond', null);

      const firstId = getState().workspaces.find((ws) => ws.id !== secondId)?.id;
      if (firstId) {
        getState().switchWorkspace(firstId);
        // Second workspace should have the container we added
        const secondInList = getState().workspaces.find((ws) => ws.id === secondId);
        expect(
          secondInList?.architecture.nodes.filter((node) => node.kind === 'container'),
        ).toHaveLength(1);
      }
    });

    it('skips saveActiveWorkspaceId when saveWorkspaces fails', () => {
      getState().createWorkspace('Second');
      const secondId = getState().workspace.id;
      const firstId = getState().workspaces.find((ws) => ws.id !== secondId)?.id;

      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key) => {
        if (key === 'cloudblocks:workspaces') {
          throw new Error('QuotaExceededError');
        }
      });

      if (firstId) {
        getState().switchWorkspace(firstId);
        expect(getState().workspace.id).toBe(firstId);
        const activeIdCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:activeWorkspaceId');
        expect(activeIdCalls).toHaveLength(0);
      }
      spy.mockRestore();
    });

    it('clears active diff state when switching workspaces', () => {
      const initialWorkspaceId = getState().workspace.id;
      getState().createWorkspace('Second');
      activateDiffState();

      getState().switchWorkspace(initialWorkspaceId);

      const uiState = useUIStore.getState();
      expect(uiState.diffMode).toBe(false);
      expect(uiState.diffDelta).toBe(null);
      expect(uiState.diffBaseArchitecture).toBe(null);
    });
  });

  describe('deleteWorkspace', () => {
    it('deletes a non-current workspace', () => {
      const firstId = getState().workspace.id;
      getState().createWorkspace('Second');

      // Add first to workspaces list if not already
      getState().deleteWorkspace(firstId);

      const remaining = getState().workspaces.find((ws) => ws.id === firstId);
      expect(remaining).toBeUndefined();
    });

    it('switches to first remaining when deleting current', () => {
      getState().createWorkspace('Second');
      const secondId = getState().workspace.id;

      getState().deleteWorkspace(secondId);

      expect(getState().workspace.id).not.toBe(secondId);
    });

    it('creates new default when deleting last workspace', () => {
      const onlyId = getState().workspace.id;
      getState().deleteWorkspace(onlyId);

      // Should create a new default workspace
      expect(getState().workspace).toBeDefined();
      expect(getState().workspace.id).not.toBe(onlyId);
      expect(getState().workspaces).toHaveLength(1);
    });

    it('skips saveActiveWorkspaceId when saveWorkspaces fails on current deletion', () => {
      getState().createWorkspace('Second');
      const secondId = getState().workspace.id;

      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key) => {
        if (key === 'cloudblocks:workspaces') {
          throw new Error('QuotaExceededError');
        }
      });

      getState().deleteWorkspace(secondId);

      expect(getState().workspace.id).not.toBe(secondId);
      const activeIdCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:activeWorkspaceId');
      expect(activeIdCalls).toHaveLength(0);
      spy.mockRestore();
    });
  });

  describe('deleteWorkspaces', () => {
    it('deletes multiple non-current workspaces', () => {
      const firstId = getState().workspace.id;
      getState().createWorkspace('Second');
      const secondId = getState().workspace.id;
      getState().createWorkspace('Third');
      const currentId = getState().workspace.id;

      getState().deleteWorkspaces([firstId, secondId]);

      expect(getState().workspace.id).toBe(currentId);
      expect(getState().workspaces.find((ws) => ws.id === firstId)).toBeUndefined();
      expect(getState().workspaces.find((ws) => ws.id === secondId)).toBeUndefined();
    });

    it('switches to first remaining when deleting current workspace', () => {
      getState().createWorkspace('Second');
      const currentId = getState().workspace.id;
      const expectedNext = getState().workspaces.find((ws) => ws.id !== currentId)?.id;

      getState().deleteWorkspaces([currentId]);

      expect(getState().workspace.id).not.toBe(currentId);
      expect(getState().workspace.id).toBe(expectedNext);
    });

    it('creates new default when deleting all workspaces', () => {
      const onlyId = getState().workspace.id;

      getState().deleteWorkspaces([onlyId]);

      expect(getState().workspace).toBeDefined();
      expect(getState().workspace.id).not.toBe(onlyId);
      expect(getState().workspaces).toHaveLength(1);
    });

    it('deletes non-current workspaces without affecting current', () => {
      getState().createWorkspace('Second');
      const secondId = getState().workspace.id;
      getState().createWorkspace('Third');
      const currentId = getState().workspace.id;

      getState().deleteWorkspaces([secondId]);

      expect(getState().workspace.id).toBe(currentId);
      expect(getState().workspaces.find((ws) => ws.id === secondId)).toBeUndefined();
      expect(getState().workspaces.find((ws) => ws.id === currentId)).toBeDefined();
    });
  });

  describe('cloneWorkspace', () => {
    it('clones the current workspace', () => {
      getState().addPlate('region', 'VNet', null);
      const originalId = getState().workspace.id;

      getState().cloneWorkspace(originalId);

      // Should switch to clone
      expect(getState().workspace.id).not.toBe(originalId);
      expect(getState().workspace.name).toBe('My Architecture (Copy)');
      // Clone should have same plates
      expect(getArch().plates).toHaveLength(1);
      expect(getArch().plates[0].name).toBe('VNet');
    });

    it('clones a non-current workspace from the list', () => {
      getState().addPlate('region', 'OrigVNet', null);
      const firstId = getState().workspace.id;

      getState().createWorkspace('Second');

      getState().cloneWorkspace(firstId);

      // Should switch to clone of first
      expect(getState().workspace.name).toContain('(Copy)');
      expect(getArch().plates).toHaveLength(1);
    });

    it('creates a deep clone (no shared references)', () => {
      getState().addPlate('region', 'VNet', null);
      const originalId = getState().workspace.id;

      getState().cloneWorkspace(originalId);

      // Modify clone
      getState().addPlate('region', 'NewPlate', null);

      // Find original in list — it should still have 1 container
      const original = getState().workspaces.find((ws) => ws.id === originalId);
      expect(original?.architecture.nodes.filter((node) => node.kind === 'container')).toHaveLength(
        1,
      );
    });

    it('no-ops when cloning non-existent workspace', () => {
      const before = getState().workspace.id;
      getState().cloneWorkspace('nonexistent');
      expect(getState().workspace.id).toBe(before);
    });

    it('skips saveActiveWorkspaceId when saveWorkspaces fails', () => {
      const originalId = getState().workspace.id;

      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key) => {
        if (key === 'cloudblocks:workspaces') {
          throw new Error('QuotaExceededError');
        }
      });

      getState().cloneWorkspace(originalId);

      expect(getState().workspace.id).not.toBe(originalId);
      const activeIdCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:activeWorkspaceId');
      expect(activeIdCalls).toHaveLength(0);
      spy.mockRestore();
    });
  });

  describe('setBackendWorkspaceId', () => {
    it('sets backendWorkspaceId on the current workspace', () => {
      const wsId = getState().workspace.id;
      getState().setBackendWorkspaceId(wsId, 'backend-123');

      expect(getState().workspace.backendWorkspaceId).toBe('backend-123');
    });

    it('does not modify current workspace when updating a non-current workspace', () => {
      getState().createWorkspace('Second');
      const secondId = getState().workspace.id;
      const firstId = getState().workspaces.find((ws) => ws.id !== secondId)!.id;

      getState().setBackendWorkspaceId(firstId, 'backend-first');

      expect(getState().workspace.backendWorkspaceId).toBeUndefined();
      const firstInList = getState().workspaces.find((ws) => ws.id === firstId);
      expect(firstInList?.backendWorkspaceId).toBe('backend-first');
    });

    it('persists the update to storage', () => {
      const spy = vi.spyOn(localStorage, 'setItem');
      const wsId = getState().workspace.id;

      getState().setBackendWorkspaceId(wsId, 'backend-456');

      const workspaceCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:workspaces');
      expect(workspaceCalls.length).toBeGreaterThan(0);
      spy.mockRestore();
    });
  });

  describe('setGithubRepo', () => {
    it('sets githubRepo on the current workspace', () => {
      const wsId = getState().workspace.id;
      getState().setGithubRepo(wsId, 'owner/repo');

      expect(getState().workspace.githubRepo).toBe('owner/repo');
    });

    it('does not modify current workspace when updating a non-current workspace', () => {
      getState().createWorkspace('Second');
      const secondId = getState().workspace.id;
      const firstId = getState().workspaces.find((ws) => ws.id !== secondId)!.id;

      getState().setGithubRepo(firstId, 'owner/other-repo');

      expect(getState().workspace.githubRepo).toBeUndefined();
      const firstInList = getState().workspaces.find((ws) => ws.id === firstId);
      expect(firstInList?.githubRepo).toBe('owner/other-repo');
    });

    it('persists the update to storage', () => {
      const spy = vi.spyOn(localStorage, 'setItem');
      const wsId = getState().workspace.id;

      getState().setGithubRepo(wsId, 'owner/repo');

      const workspaceCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:workspaces');
      expect(workspaceCalls.length).toBeGreaterThan(0);
      spy.mockRestore();
    });

    it('clears githubRepo when set to undefined', () => {
      const wsId = getState().workspace.id;
      getState().setGithubRepo(wsId, 'owner/repo');
      expect(getState().workspace.githubRepo).toBe('owner/repo');

      getState().setGithubRepo(wsId, undefined);
      expect(getState().workspace.githubRepo).toBeUndefined();
    });
  });

  describe('importArchitecture', () => {
    it('imports a valid architecture JSON and returns null', () => {
      const arch = {
        id: 'imported-1',
        name: 'Imported Arch',
        version: '1',
        nodes: [makeRegionNode('p1'), makeResourceNode('b1', 'p1', 'compute', { name: 'VM' })],
        connections: [],
        endpoints: [],
        externalActors: [
          { id: 'ext-1', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
        ],
      };

      const result = getState().importArchitecture(JSON.stringify(arch));

      expect(result).toBeNull();
      expect(getArch().name).toBe('Imported Arch');
      expect(getArch().plates).toHaveLength(1);
      expect(getArch().blocks).toHaveLength(2); // original b1 + migrated ext-1 from externalActors
    });

    it('normalizes missing fields with defaults', () => {
      const minimal = {
        nodes: [makeRegionNode('p1')],
      };

      getState().importArchitecture(JSON.stringify(minimal));

      expect(getArch().name).toBe('Imported Architecture');
      expect(getArch().version).toBe('1');
      expect(getArch().connections ?? []).toEqual([]);
      expect(getArch().externalActors).toHaveLength(2);
      expect((getArch().externalActors ?? []).map((actor) => actor.type)).toEqual([
        'browser',
        'internet',
      ]);
    });

    it('returns error string on invalid JSON without crashing', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = getState().importArchitecture('not-valid-json');
      expect(result).toBeTypeOf('string');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('returns error string when plates/blocks are missing', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = getState().importArchitecture(JSON.stringify({ name: 'No data' }));
      expect(result).toBeTypeOf('string');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('logs error when externalActors is not an array', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [],
        externalActors: { id: 'ext-1' },
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('externalActors must be an array');
      spy.mockRestore();
    });

    it('logs error when an external actor is missing id', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [],
        externalActors: [{ name: 'Internet', type: 'internet' }],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('id must be a string');
      spy.mockRestore();
    });

    it('imports with valid externalActors', () => {
      const valid = {
        id: 'import-external-actors',
        name: 'External Actors Valid',
        version: '1',
        nodes: [makeRegionNode('p1'), makeResourceNode('b1', 'p1', 'compute', { name: 'VM' })],
        externalActors: [
          { id: 'ext-1', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
          { id: 'ext-2', name: 'Partner', type: 'internet', position: { x: -3, y: 0, z: 5 } },
        ],
      };

      getState().importArchitecture(JSON.stringify(valid));

      expect(getArch().externalActors).toHaveLength(2);
      expect((getArch().externalActors ?? []).map((actor) => actor.id)).toEqual(['ext-1', 'ext-2']);
    });

    it.each([
      {
        name: 'id',
        connection: {
          from: endpointId('b1', 'output', 'data'),
          to: endpointId('p1', 'input', 'data'),
        },
        message: 'id must be a string',
      },
      {
        name: 'sourceId',
        connection: { id: 'c1', targetId: 'p1', type: 'dataflow' },
        message: 'connection must have from/to (v4) or sourceId/targetId (v3)',
      },
      {
        name: 'targetId',
        connection: { id: 'c1', sourceId: 'b1', type: 'dataflow' },
        message: 'connection must have from/to (v4) or sourceId/targetId (v3)',
      },
      {
        name: 'type',
        connection: { id: 'c1', sourceId: 'b1' },
        message: 'connection must have from/to (v4) or sourceId/targetId (v3)',
      },
    ])('logs error when connection is missing $name', ({ connection, message }) => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [makeRegionNode('p1'), makeResourceNode('b1', 'p1', 'compute', { name: 'VM' })],
        connections: [connection],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain(message);
      spy.mockRestore();
    });

    it('logs error when connection references non-existent endpoints', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [makeRegionNode('p1'), makeResourceNode('b1', 'p1', 'compute', { name: 'VM' })],
        connections: [
          {
            id: 'c1',
            from: endpointId('missing', 'output', 'data'),
            to: endpointId('b1', 'input', 'data'),
          },
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain(
        'does not reference an existing block, container, or external actor',
      );
      spy.mockRestore();
    });

    it('imports valid connections that reference existing entities', () => {
      const valid = {
        id: 'import-connections',
        name: 'Valid Connections',
        version: '1',
        nodes: [makeRegionNode('p1'), makeResourceNode('b1', 'p1', 'compute', { name: 'VM' })],
        externalActors: [
          {
            id: 'ext-internet',
            name: 'Internet',
            type: 'internet',
            position: { x: -3, y: 0, z: 5 },
          },
        ],
        connections: [
          {
            id: 'c1',
            from: endpointId('ext-internet', 'output', 'data'),
            to: endpointId('b1', 'input', 'data'),
          },
          {
            id: 'c2',
            from: endpointId('b1', 'output', 'data'),
            to: endpointId('p1', 'input', 'data'),
          },
        ],
      };

      getState().importArchitecture(JSON.stringify(valid));

      expect(getArch().connections).toHaveLength(2);
      expect(getArch().connections.map((connection) => connection.id)).toEqual(['c1', 'c2']);
    });

    it('logs error when block references non-existent container', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [
          makeRegionNode('p1'),
          makeResourceNode('b1', 'missing-container', 'compute', { name: 'VM' }),
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain(
        'does not reference an existing container node',
      );
      spy.mockRestore();
    });

    it('logs error when block name is not a string', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [
          makeRegionNode('p1'),
          makeResourceNode('b1', 'p1', 'compute', { name: 123 as unknown as string }),
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('name must be a string');
      spy.mockRestore();
    });

    it('logs error when block category is invalid', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [
          makeRegionNode('p1'),
          makeResourceNode('b1', 'p1', 'compute', {
            category: 'invalid-category' as unknown as ResourceCategory,
          }),
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain(
        'category must be one of network, security, delivery, compute, data, messaging, identity, operations',
      );
      spy.mockRestore();
    });

    it('logs error when external actor is not an object', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [],
        externalActors: ['not-an-object'],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('external actor must be an object');
      spy.mockRestore();
    });

    it('logs error when connection is not an object', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [],
        connections: ['not-an-object'],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('connection must be an object');
      spy.mockRestore();
    });

    it('logs error when connection targetId references non-existent endpoint', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        nodes: [makeRegionNode('p1'), makeResourceNode('b1', 'p1', 'compute', { name: 'VM' })],
        connections: [
          {
            id: 'c1',
            from: endpointId('b1', 'output', 'data'),
            to: endpointId('missing-target', 'input', 'data'),
          },
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain(
        'does not reference an existing block, container, or external actor',
      );
      spy.mockRestore();
    });

    it('skips saveActiveWorkspaceId when saveWorkspaces fails', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key) => {
        if (key === 'cloudblocks:workspaces') {
          throw new Error('QuotaExceededError');
        }
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const arch = {
        nodes: [makeRegionNode('p1')],
      };

      const result = getState().importArchitecture(JSON.stringify(arch));

      expect(result).toBeNull();
      const activeIdCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:activeWorkspaceId');
      expect(activeIdCalls).toHaveLength(0);
      spy.mockRestore();
    });

    it('clears active diff state after successful import', () => {
      activateDiffState();

      const arch = {
        nodes: [makeRegionNode('p1')],
      };

      const result = getState().importArchitecture(JSON.stringify(arch));

      expect(result).toBeNull();
      const uiState = useUIStore.getState();
      expect(uiState.diffMode).toBe(false);
      expect(uiState.diffDelta).toBe(null);
      expect(uiState.diffBaseArchitecture).toBe(null);
    });
  });

  describe('exportArchitecture', () => {
    it('returns JSON string of current architecture', () => {
      getState().addPlate('region', 'VNet', null);
      const json = getState().exportArchitecture();
      const parsed = JSON.parse(json);

      const plates = parsed.nodes.filter((node: { kind: string }) => node.kind === 'container');
      expect(plates).toHaveLength(1);
      expect(plates[0].name).toBe('VNet');
    });

    it('returns pretty-printed JSON', () => {
      const json = getState().exportArchitecture();
      // Pretty-printed JSON has newlines
      expect(json).toContain('\n');
    });
  });

  describe('loadFromTemplate', () => {
    it('creates a workspace from a template', () => {
      const template: ArchitectureTemplate = {
        id: 'tmpl-1',
        name: 'Test Template',
        description: 'A test template',
        category: 'web-application',
        difficulty: 'beginner',
        tags: ['test'],
        architecture: {
          name: 'Template Arch',
          version: '1',
          nodes: [makeRegionNode('tp1')],
          connections: [],
          endpoints: [],
          externalActors: [
            { id: 'ext-1', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
          ],
        },
      };

      const oldId = getState().workspace.id;
      getState().loadFromTemplate(template);

      expect(getState().workspace.id).not.toBe(oldId);
      expect(getState().workspace.name).toBe('Test Template');
      expect(getArch().plates).toHaveLength(1);
    });

    it('resets history when loading template', () => {
      getState().addPlate('region', 'VNet', null);
      expect(getState().canUndo).toBe(true);

      const template: ArchitectureTemplate = {
        id: 'tmpl-1',
        name: 'Template',
        description: 'desc',
        category: 'general',
        difficulty: 'beginner',
        tags: [],
        architecture: {
          name: 'T',
          version: '1',
          nodes: [],
          connections: [],
          endpoints: [],
          externalActors: [],
        },
      };

      getState().loadFromTemplate(template);
      expect(getState().canUndo).toBe(false);
    });

    it('skips saveActiveWorkspaceId when saveWorkspaces fails', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key) => {
        if (key === 'cloudblocks:workspaces') {
          throw new Error('QuotaExceededError');
        }
      });

      const template: ArchitectureTemplate = {
        id: 'tmpl-fail',
        name: 'Fail Template',
        description: 'desc',
        category: 'general',
        difficulty: 'beginner',
        tags: [],
        architecture: {
          name: 'FT',
          version: '1',
          nodes: [],
          connections: [],
          endpoints: [],
          externalActors: [],
        },
      };

      getState().loadFromTemplate(template);

      expect(getState().workspace.name).toBe('Fail Template');
      const activeIdCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:activeWorkspaceId');
      expect(activeIdCalls).toHaveLength(0);
      spy.mockRestore();
    });

    it('clears active diff state when loading a template', () => {
      activateDiffState();

      const template: ArchitectureTemplate = {
        id: 'tmpl-clear-diff',
        name: 'Template Clears Diff',
        description: 'desc',
        category: 'general',
        difficulty: 'beginner',
        tags: [],
        architecture: {
          name: 'Template',
          version: '1',
          nodes: [],
          connections: [],
          endpoints: [],
          externalActors: [],
        },
      };

      getState().loadFromTemplate(template);

      const uiState = useUIStore.getState();
      expect(uiState.diffMode).toBe(false);
      expect(uiState.diffDelta).toBe(null);
      expect(uiState.diffBaseArchitecture).toBe(null);
    });
  });

  describe('replaceArchitecture', () => {
    it('replaces architecture content while preserving workspace id and createdAt', () => {
      getState().addPlate('region', 'Original Network', null);

      const initialArch = getArch();
      const snapshot: ArchitectureSnapshot = {
        name: 'Checkpoint Architecture',
        version: '1',
        nodes: [
          makeRegionNode('snap-container-1', {
            name: 'Snap Network',
            position: { x: 1, y: 0, z: 2 },
          }),
          makeResourceNode('snap-block-1', 'snap-container-1', 'compute', {
            name: 'Snap VM',
          }),
        ],
        connections: [
          {
            id: 'snap-conn-1',
            from: endpointId('snap-block-1', 'output', 'data'),
            to: endpointId('snap-container-1', 'input', 'data'),
            metadata: {},
          },
        ],
        endpoints: [],
        externalActors: [
          {
            id: 'ext-internet',
            name: 'Internet',
            type: 'internet',
            position: { x: -3, y: 0, z: 5 },
          },
        ],
      };

      vi.setSystemTime(new Date('2025-01-02T00:00:00Z'));
      getState().replaceArchitecture(snapshot);

      const replaced = getArch();
      expect(replaced.id).toBe(initialArch.id);
      expect(replaced.createdAt).toBe(initialArch.createdAt);
      expect(replaced.updatedAt).not.toBe(initialArch.updatedAt);
      expect(replaced.nodes).toEqual(snapshot.nodes);
      expect(replaced.connections).toEqual(snapshot.connections);
    });

    it('pushes history (undo restores previous architecture)', () => {
      getState().addPlate('region', 'Original Network', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Original Subnet', networkId);
      const subnetId = getArch().plates[1].id;
      getState().addBlock('compute', 'Original VM', subnetId);

      const beforeReplace = JSON.parse(JSON.stringify(getArch())) as ArchitectureModel;
      const snapshot: ArchitectureSnapshot = {
        name: 'Checkpoint',
        version: '1',
        nodes: [],
        connections: [],
        endpoints: [],
        externalActors: [
          {
            id: 'ext-internet',
            name: 'Internet',
            type: 'internet',
            position: { x: -3, y: 0, z: 5 },
          },
        ],
      };

      getState().replaceArchitecture(snapshot);
      expect(getArch().plates).toHaveLength(0);

      getState().undo();
      expect(getArch()).toEqual(beforeReplace);
    });

    it('invalidates validation result', () => {
      getState().addPlate('region', 'Original Network', null);
      const validated = getState().validate();
      expect(validated.valid).toBe(true);
      expect(getState().validationResult).not.toBeNull();

      const snapshot: ArchitectureSnapshot = {
        name: 'Checkpoint',
        version: '1',
        nodes: [],
        connections: [],
        endpoints: [],
        externalActors: [
          {
            id: 'ext-internet',
            name: 'Internet',
            type: 'internet',
            position: { x: -3, y: 0, z: 5 },
          },
        ],
      };

      getState().replaceArchitecture(snapshot);
      expect(getState().validationResult).toBeNull();
    });
  });

  describe('replaceArchitecture – validation', () => {
    it('throws when snapshot is not an object', () => {
      expect(() =>
        getState().replaceArchitecture('not-an-object' as unknown as ArchitectureSnapshot),
      ).toThrow('root must be an object');
    });

    it('throws when nodes is missing', () => {
      const invalid = { connections: [] } as unknown as ArchitectureSnapshot;
      expect(() => getState().replaceArchitecture(invalid)).toThrow(
        'expected nodes[] or legacy plates[] + blocks[]',
      );
    });

    it('throws when legacy blocks is missing', () => {
      const invalid = { plates: [], connections: [] } as unknown as ArchitectureSnapshot;
      expect(() => getState().replaceArchitecture(invalid)).toThrow(
        'expected nodes[] or legacy plates[] + blocks[]',
      );
    });

    it('throws when a node has invalid layer type', () => {
      const invalid = {
        nodes: [
          makeRegionNode('p1', { layer: 'invalid-type' as unknown as ContainerBlock['layer'] }),
        ],
        connections: [],
      } as unknown as ArchitectureSnapshot;
      expect(() => getState().replaceArchitecture(invalid)).toThrow('layer must be one of');
    });

    it('throws when a block references non-existent container', () => {
      const invalid = {
        nodes: [
          makeRegionNode('p1'),
          makeResourceNode('b1', 'missing-container', 'compute', { name: 'VM' }),
        ],
        connections: [],
      } as unknown as ArchitectureSnapshot;
      expect(() => getState().replaceArchitecture(invalid)).toThrow(
        'does not reference an existing container node',
      );
    });

    it('does not modify state when validation fails', () => {
      getState().addPlate('region', 'Original', null);
      const archBefore = JSON.parse(JSON.stringify(getArch())) as ArchitectureModel;

      const invalid = { connections: [] } as unknown as ArchitectureSnapshot;
      expect(() => getState().replaceArchitecture(invalid)).toThrow();

      expect(getArch()).toEqual(archBefore);
    });
  });

  // ── Auto-validation subscriber ──

  describe('auto-validation', () => {
    it('clears validationResult on mutation', () => {
      getState().validate();
      expect(getState().validationResult).not.toBeNull();

      getState().addPlate('region', 'VNet', null);
      expect(getState().validationResult).toBeNull();
    });

    it('runs validation after 300ms delay', () => {
      getState().addPlate('region', 'VNet', null);
      expect(getState().validationResult).toBeNull();

      vi.advanceTimersByTime(300);

      expect(getState().validationResult).not.toBeNull();
      expect(getState().validationResult?.valid).toBe(true);
    });

    it('debounces rapid mutations', () => {
      getState().addPlate('region', 'A', null);
      vi.advanceTimersByTime(100);
      getState().addPlate('region', 'B', null);
      vi.advanceTimersByTime(100);
      getState().addPlate('region', 'C', null);

      // Still null — timer was reset each time
      expect(getState().validationResult).toBeNull();

      vi.advanceTimersByTime(300);
      expect(getState().validationResult).not.toBeNull();
    });
  });
});
