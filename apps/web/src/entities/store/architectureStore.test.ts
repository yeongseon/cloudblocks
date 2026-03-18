import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArchitectureModel } from '../../shared/types/index';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import type { ArchitectureTemplate } from '../../shared/types/template';

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

function getState() {
  return useArchitectureStore.getState();
}

function getArch(): ArchitectureModel {
  return getState().workspace.architecture;
}

describe('architectureStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    uuidState.counter = 0;
    getState().resetWorkspace();
    // resetWorkspace doesn't clear the workspaces array, so clear it manually
    useArchitectureStore.setState({ workspaces: [] });
    localStorage.clear();
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
      expect(state.workspace.architecture.plates).toEqual([]);
      expect(state.workspace.architecture.blocks).toEqual([]);
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

  // ── Plate actions ──

  describe('addPlate', () => {
    it('adds a network plate at origin', () => {
      getState().addPlate('network', 'VNet', null);
      const plates = getArch().plates;
      expect(plates).toHaveLength(1);
      expect(plates[0].name).toBe('VNet');
      expect(plates[0].type).toBe('network');
      expect(plates[0].position).toEqual({ x: 0, y: 0, z: 0 });
      expect(plates[0].parentId).toBeNull();
      expect(plates[0].children).toEqual([]);
    });

    it('adds a plate with explicit profileId', () => {
      getState().addPlate('network', 'Hub', null, undefined, 'network-hub');
      const plates = getArch().plates;
      expect(plates).toHaveLength(1);
      expect(plates[0].profileId).toBe('network-hub');
      expect(plates[0].size.width).toBe(20);
      expect(plates[0].size.depth).toBe(24);
      expect(plates[0].size.height).toBe(0.7);
    });

    it('adds a subnet plate with explicit profileId', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Scale', netId, 'public', 'subnet-scale');
      const subnet = getArch().plates[1];
      expect(subnet.profileId).toBe('subnet-scale');
      expect(subnet.size.width).toBe(10);
      expect(subnet.size.depth).toBe(12);
      expect(subnet.size.height).toBe(0.5);
    });

    it('adds a subnet plate as child of network', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', netId, 'public');

      const plates = getArch().plates;
      expect(plates).toHaveLength(2);

      const subnet = plates[1];
      expect(subnet.name).toBe('Public');
      expect(subnet.type).toBe('subnet');
      expect(subnet.subnetAccess).toBe('public');
      expect(subnet.parentId).toBe(netId);
      expect(subnet.position.y).toBe(0.7);

      // Network plate should have subnet as child
      const network = plates.find((p) => p.id === netId);
      expect(network?.children).toContain(subnet.id);
    });

    it('positions sibling subnets based on count', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;

      getState().addPlate('subnet', 'Sub1', netId, 'public');
      getState().addPlate('subnet', 'Sub2', netId, 'private');

      const plates = getArch().plates;
      const sub1 = plates[1];
      const sub2 = plates[2];

      expect(sub1.position.x).toBe(-3.5);
      expect(sub2.position.x).toBe(3.5);
    });

    it('pushes to undo history', () => {
      getState().addPlate('network', 'VNet', null);
      expect(getState().canUndo).toBe(true);
    });

    it('adds subnet even when parentId does not exist', () => {
      getState().addPlate('subnet', 'Orphan Subnet', 'missing-parent', 'public');
      const subnet = getArch().plates[0];

      expect(subnet.parentId).toBe('missing-parent');
      expect(subnet.position.x).toBe(-3.5);
      expect(subnet.position.y).toBe(0.3);
      expect(subnet.position.z).toBe(0);
    });
  });

  describe('removePlate', () => {
    it('removes a plate', () => {
      getState().addPlate('network', 'VNet', null);
      const plateId = getArch().plates[0].id;
      getState().removePlate(plateId);
      expect(getArch().plates).toHaveLength(0);
    });

    it('removes child plates recursively', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');

      expect(getArch().plates).toHaveLength(2);
      getState().removePlate(netId);
      expect(getArch().plates).toHaveLength(0);
    });

    it('removes blocks on removed plates and their connections', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      getState().addConnection(blockId, 'some-target');

      expect(getArch().blocks).toHaveLength(1);
      expect(getArch().connections).toHaveLength(1);

      getState().removePlate(subId);

      expect(getArch().blocks).toHaveLength(0);
      expect(getArch().connections).toHaveLength(0);
    });

    it('removes plate from parent children', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().removePlate(subId);

      const network = getArch().plates[0];
      expect(network.children).not.toContain(subId);
    });

    it('no-ops on non-existent plate ID', () => {
      getState().addPlate('network', 'VNet', null);
      const before = getArch();
      getState().removePlate('nonexistent-id');
      // Architecture should be unchanged (same reference since withHistory wasn't called)
      expect(getArch().plates).toHaveLength(1);
      expect(getArch().plates[0].name).toBe(before.plates[0].name);
    });

    it('removes deep nested child plates and their blocks recursively', () => {
      getState().addPlate('network', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Outer', networkId, 'public');
      const outerId = getArch().plates[1].id;
      getState().addPlate('subnet', 'Inner', outerId, 'private');
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
    it('adds a block to a plate', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'WebApp', subId);

      const blocks = getArch().blocks;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].name).toBe('WebApp');
      expect(blocks[0].category).toBe('compute');
      expect(blocks[0].placementId).toBe(subId);
    });

    it('adds block to plate children', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'WebApp', subId);
      const blockId = getArch().blocks[0].id;

      const plate = getArch().plates.find((p) => p.id === subId);
      expect(plate?.children).toContain(blockId);
    });

    it('stores provider when provided during block creation', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'WebApp', subId, 'aws');

      const blocks = getArch().blocks;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].provider).toBe('aws');
    });

    it('no-ops on non-existent plate', () => {
      const blocksBefore = getArch().blocks.length;
      getState().addBlock('compute', 'VM', 'nonexistent');
      expect(getArch().blocks).toHaveLength(blocksBefore);
    });

    it('positions blocks using grid layout', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'A', subId);
      getState().addBlock('compute', 'B', subId);

      const blocks = getArch().blocks;
      // They should have different positions
      expect(blocks[0].position).not.toEqual(blocks[1].position);
    });
  });

  describe('duplicateBlock', () => {
    it('duplicates a block with a new id, copy suffix, and +1/+1 position offset', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
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
      expect(duplicate.position).toEqual({
        x: source.position.x + 1,
        y: source.position.y,
        z: source.position.z + 1,
      });
    });

    it('no-ops on non-existent block id', () => {
      getState().addPlate('network', 'VNet', null);
      const before = getState().workspace.architecture;

      getState().duplicateBlock('missing-block');

      expect(getState().workspace.architecture).toBe(before);
    });
  });

  describe('renameBlock', () => {
    it('renames a block', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;
      getState().addBlock('compute', 'Old Name', subId);
      const blockId = getArch().blocks[0].id;

      getState().renameBlock(blockId, 'New Name');

      expect(getArch().blocks[0].name).toBe('New Name');
    });
  });

  describe('renamePlate', () => {
    it('renames a plate', () => {
      getState().addPlate('network', 'Old Plate', null);
      const plateId = getArch().plates[0].id;

      getState().renamePlate(plateId, 'New Plate');

      expect(getArch().plates[0].name).toBe('New Plate');
    });
  });

  describe('removeBlock', () => {
    it('removes a block and its connections', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;
      getState().addConnection('ext-src', blockId);

      getState().removeBlock(blockId);

      expect(getArch().blocks).toHaveLength(0);
      expect(getArch().connections).toHaveLength(0);
    });

    it('removes block from plate children', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      getState().removeBlock(blockId);

      const plate = getArch().plates.find((p) => p.id === subId);
      expect(plate?.children).not.toContain(blockId);
    });

    it('no-ops on non-existent block', () => {
      getState().addPlate('network', 'VNet', null);
      const before = getArch().blocks.length;
      getState().removeBlock('nonexistent');
      expect(getArch().blocks).toHaveLength(before);
    });
  });

  describe('moveBlock', () => {
    it('moves a block between plates', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub1', netId, 'public');
      const sub1Id = getArch().plates[1].id;
      getState().addPlate('subnet', 'Sub2', netId, 'private');
      const sub2Id = getArch().plates[2].id;

      getState().addBlock('compute', 'VM', sub1Id);
      const blockId = getArch().blocks[0].id;

      getState().moveBlock(blockId, sub2Id);

      const block = getArch().blocks[0];
      expect(block.placementId).toBe(sub2Id);

      // Old plate should not have block
      const oldPlate = getArch().plates.find((p) => p.id === sub1Id);
      expect(oldPlate?.children).not.toContain(blockId);

      // New plate should have block
      const newPlate = getArch().plates.find((p) => p.id === sub2Id);
      expect(newPlate?.children).toContain(blockId);
    });

    it('no-ops when moving to same plate', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub1', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;
      // Reset history so we can detect if moveBlock pushes

      // Reset history so we can detect if moveBlock pushes
      getState().moveBlock(blockId, subId);

      // Still on same plate
      expect(getArch().blocks[0].placementId).toBe(subId);
    });

    it('keeps architecture reference when moving to same plate', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub1', netId, 'public');
      const subId = getArch().plates[1].id;
      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      const before = getState().workspace.architecture;
      getState().moveBlock(blockId, subId);
      expect(getState().workspace.architecture).toBe(before);
    });

    it('no-ops on non-existent block', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().moveBlock('nonexistent', subId);
      // No crash
    });

    it('no-ops on non-existent target plate', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;

      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      getState().moveBlock(blockId, 'nonexistent');
      expect(getArch().blocks[0].placementId).toBe(subId);
    });

    it('keeps architecture reference when target plate does not exist', () => {
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Sub', netId, 'public');
      const subId = getArch().plates[1].id;
      getState().addBlock('compute', 'VM', subId);
      const blockId = getArch().blocks[0].id;

      const before = getState().workspace.architecture;
      getState().moveBlock(blockId, 'missing-target');
      expect(getState().workspace.architecture).toBe(before);
    });
  });

  describe('setPlateProfile', () => {
    it('resizes child plate and clamps position within parent bounds', () => {
      getState().addPlate('network', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', networkId, 'public');
      const subnetId = getArch().plates[1].id;

      getState().movePlatePosition(subnetId, 100, 100);
      const before = getArch().plates.find((plate) => plate.id === subnetId);
      expect(before?.position.x).toBe(5);

      getState().setPlateProfile(subnetId, 'subnet-scale');
      const resized = getArch().plates.find((plate) => plate.id === subnetId);
      expect(resized?.profileId).toBe('subnet-scale');
      expect(resized?.size.width).toBe(10);
      expect(resized?.position.x).toBe(3);
    });

    it('resizes plate even when parentId points to missing parent', () => {
      const orphan = {
        id: 'orphan-subnet',
        name: 'Orphan',
        type: 'subnet' as const,
        subnetAccess: 'public' as const,
        parentId: 'missing-parent',
        children: [],
        position: { x: 4, y: 0.3, z: 4 },
        size: { width: 6, height: 0.3, depth: 8 },
        metadata: {},
      };
      useArchitectureStore.setState({
        workspace: {
          ...getState().workspace,
          architecture: { ...getState().workspace.architecture, plates: [orphan] },
        },
      });

      getState().setPlateProfile('orphan-subnet', 'subnet-scale');
      const resized = getArch().plates.find((plate) => plate.id === 'orphan-subnet');
      expect(resized?.profileId).toBe('subnet-scale');
      expect(resized?.position).toEqual({ x: 4, y: 0.3, z: 4 });
    });
  });

  describe('movePlatePosition', () => {
    it('moves a root plate by the provided delta', () => {
      getState().addPlate('network', 'VNet', null);
      const rootPlate = getArch().plates[0];

      getState().movePlatePosition(rootPlate.id, 2, -3);

      const moved = getArch().plates.find((plate) => plate.id === rootPlate.id);
      expect(moved?.position).toEqual({ x: 2, y: 0, z: -3 });
    });

    it('clamps child plate movement within parent bounds', () => {
      getState().addPlate('network', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', networkId, 'public');
      const subnet = getArch().plates[1];

      getState().movePlatePosition(subnet.id, 100, 100);

      const movedSubnet = getArch().plates.find((plate) => plate.id === subnet.id);
      expect(movedSubnet?.position.x).toBe(5);
      expect(movedSubnet?.position.z).toBe(6);
    });

    it('moves direct child plates by the same applied delta', () => {
      getState().addPlate('network', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Outer', networkId, 'public');
      const outerSubnetId = getArch().plates[1].id;
      getState().addPlate('subnet', 'Inner', outerSubnetId, 'private');
      const outerBefore = getArch().plates.find((plate) => plate.id === outerSubnetId);
      const innerBefore = getArch().plates.find((plate) => plate.id !== outerSubnetId && plate.parentId === outerSubnetId);

      getState().movePlatePosition(outerSubnetId, 1.25, -1.5);

      const outerAfter = getArch().plates.find((plate) => plate.id === outerSubnetId);
      const innerAfter = getArch().plates.find((plate) => plate.parentId === outerSubnetId);

      expect(outerAfter?.position.x).toBe((outerBefore?.position.x ?? 0) + 1.25);
      expect(outerAfter?.position.z).toBe((outerBefore?.position.z ?? 0) - 1.5);
      expect(innerAfter?.position.x).toBe((innerBefore?.position.x ?? 0) + 1.25);
      expect(innerAfter?.position.z).toBe((innerBefore?.position.z ?? 0) - 1.5);
    });

    it('no-ops when moving a non-existent plate', () => {
      getState().addPlate('network', 'VNet', null);
      const before = getState().workspace.architecture;

      getState().movePlatePosition('missing-plate', 1, 1);

      expect(getState().workspace.architecture).toBe(before);
    });
  });

  describe('moveBlockPosition', () => {
    it('moves a block and clamps it within parent plate bounds', () => {
      getState().addPlate('network', 'VNet', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Public', networkId, 'public');
      const subnetId = getArch().plates[1].id;
      getState().addBlock('compute', 'VM', subnetId);
      const blockId = getArch().blocks[0].id;

      getState().moveBlockPosition(blockId, 100, -100);

      const moved = getArch().blocks.find((block) => block.id === blockId);
      expect(moved?.position.x).toBe(1.8);
      expect(moved?.position.z).toBe(-2.8);
    });

    it('no-ops when moving a block whose parent plate is missing', () => {
      const before = getState().workspace.architecture;
      const orphaned: ArchitectureModel = {
        ...before,
        blocks: [
          {
            id: 'orphan-block',
            name: 'Orphan',
            category: 'compute',
            placementId: 'missing-plate',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
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
      getState().addPlate('network', 'VNet', null);
      const before = getState().workspace.architecture;

      getState().moveBlockPosition('missing-block', 1, 1);

      expect(getState().workspace.architecture).toBe(before);
    });
  });

  // ── Connection actions ──

  describe('addConnection', () => {
    it('creates a dataflow connection', () => {
      getState().addConnection('source-1', 'target-1');
      const conns = getArch().connections;
      expect(conns).toHaveLength(1);
      expect(conns[0].sourceId).toBe('source-1');
      expect(conns[0].targetId).toBe('target-1');
      expect(conns[0].type).toBe('dataflow');
    });

    it('prevents duplicate connections', () => {
      getState().addConnection('source-1', 'target-1');
      getState().addConnection('source-1', 'target-1');
      expect(getArch().connections).toHaveLength(1);
    });
  });

  describe('removeConnection', () => {
    it('removes a connection by ID', () => {
      getState().addConnection('source-1', 'target-1');
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
      // Add a database block on a public subnet (invalid placement)
      getState().addPlate('network', 'VNet', null);
      const netId = getArch().plates[0].id;
      getState().addPlate('subnet', 'PubSub', netId, 'public');
      const subId = getArch().plates[1].id;
      getState().addBlock('database', 'DB', subId);

      const result = getState().validate();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── History (v0.2) ──

  describe('undo/redo', () => {
    it('undoes the last action', () => {
      getState().addPlate('network', 'VNet', null);
      expect(getArch().plates).toHaveLength(1);
      expect(getState().canUndo).toBe(true);

      getState().undo();
      expect(getArch().plates).toHaveLength(0);
      expect(getState().canRedo).toBe(true);
    });

    it('redoes an undone action', () => {
      getState().addPlate('network', 'VNet', null);
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
      getState().addPlate('network', 'VNet', null);
      const archBefore = getArch();
      getState().redo();
      expect(getArch().plates).toHaveLength(archBefore.plates.length);
    });

    it('clears validationResult on undo', () => {
      getState().addPlate('network', 'VNet', null);
      getState().validate();
      expect(getState().validationResult).not.toBeNull();

      getState().undo();
      expect(getState().validationResult).toBeNull();
    });

    it('tracks multiple undo steps', () => {
      getState().addPlate('network', 'A', null);
      getState().addPlate('network', 'B', null);
      getState().addPlate('network', 'C', null);

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
      getState().addPlate('network', 'VNet', null);
      getState().saveToStorage();

      expect(setItemSpy).toHaveBeenCalled();
      setItemSpy.mockRestore();

      // Reset and reload
      getState().resetWorkspace();
      expect(getArch().plates).toHaveLength(0);

      getState().loadFromStorage();
      expect(getArch().plates).toHaveLength(1);
    });

    it('loadFromStorage is no-op when localStorage is empty', () => {
      const archBefore = getArch();
      getState().loadFromStorage();
      // No crash, workspace still has content
      expect(getArch().name).toBe(archBefore.name);
    });

    it('loadFromStorage resets history', () => {
      getState().addPlate('network', 'VNet', null);
      getState().saveToStorage();
      expect(getState().canUndo).toBe(true);

      getState().loadFromStorage();
      expect(getState().canUndo).toBe(false);
      expect(getState().canRedo).toBe(false);
    });
  });

  describe('resetWorkspace', () => {
    it('resets to default empty workspace', () => {
      getState().addPlate('network', 'VNet', null);
      getState().addBlock('compute', 'VM', getArch().plates[0].id);

      getState().resetWorkspace();

      expect(getArch().plates).toHaveLength(0);
      expect(getArch().blocks).toHaveLength(0);
      expect(getState().validationResult).toBeNull();
      expect(getState().canUndo).toBe(false);
      expect(getState().canRedo).toBe(false);
    });
  });

  describe('renameWorkspace', () => {
    it('updates workspace and architecture name', () => {
      getState().renameWorkspace('New Name');
      expect(getState().workspace.name).toBe('New Name');
      expect(getArch().name).toBe('New Name');
    });

    it('updates updatedAt timestamp', () => {
      const before = getState().workspace.updatedAt;
      vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
      getState().renameWorkspace('Renamed');
      expect(getState().workspace.updatedAt).not.toBe(before);
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
      getState().addPlate('network', 'VNet', null);
      const oldId = getState().workspace.id;

      getState().createWorkspace('New Project');

      const saved = getState().workspaces.find((ws) => ws.id === oldId);
      expect(saved).toBeDefined();
      expect(saved?.architecture.plates).toHaveLength(1);
    });

    it('resets history for the new workspace', () => {
      getState().addPlate('network', 'VNet', null);
      expect(getState().canUndo).toBe(true);

      getState().createWorkspace('New Project');
      expect(getState().canUndo).toBe(false);
    });
  });

  describe('switchWorkspace', () => {
    it('switches to a different workspace', () => {
      getState().addPlate('network', 'Original', null);
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
      getState().addPlate('network', 'InSecond', null);

      const firstId = getState().workspaces.find((ws) => ws.id !== secondId)?.id;
      if (firstId) {
        getState().switchWorkspace(firstId);
        // Second workspace should have the plate we added
        const secondInList = getState().workspaces.find((ws) => ws.id === secondId);
        expect(secondInList?.architecture.plates).toHaveLength(1);
      }
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
  });

  describe('cloneWorkspace', () => {
    it('clones the current workspace', () => {
      getState().addPlate('network', 'VNet', null);
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
      getState().addPlate('network', 'OrigVNet', null);
      const firstId = getState().workspace.id;

      getState().createWorkspace('Second');

      getState().cloneWorkspace(firstId);

      // Should switch to clone of first
      expect(getState().workspace.name).toContain('(Copy)');
      expect(getArch().plates).toHaveLength(1);
    });

    it('creates a deep clone (no shared references)', () => {
      getState().addPlate('network', 'VNet', null);
      const originalId = getState().workspace.id;

      getState().cloneWorkspace(originalId);

      // Modify clone
      getState().addPlate('network', 'NewPlate', null);

      // Find original in list — it should still have 1 plate
      const original = getState().workspaces.find((ws) => ws.id === originalId);
      expect(original?.architecture.plates).toHaveLength(1);
    });

    it('no-ops when cloning non-existent workspace', () => {
      const before = getState().workspace.id;
      getState().cloneWorkspace('nonexistent');
      expect(getState().workspace.id).toBe(before);
    });
  });

  describe('importArchitecture', () => {
    it('imports a valid architecture JSON', () => {
      const arch = {
        id: 'imported-1',
        name: 'Imported Arch',
        version: '1',
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'VM',
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
        connections: [],
        externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' }],
      };

      getState().importArchitecture(JSON.stringify(arch));

      expect(getArch().name).toBe('Imported Arch');
      expect(getArch().plates).toHaveLength(1);
      expect(getArch().blocks).toHaveLength(1);
    });

    it('normalizes missing fields with defaults', () => {
      const minimal = {
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [],
      };

      getState().importArchitecture(JSON.stringify(minimal));

      expect(getArch().name).toBe('Imported Architecture');
      expect(getArch().version).toBe('1');
      expect(getArch().connections).toEqual([]);
      expect(getArch().externalActors).toHaveLength(1);
      expect(getArch().externalActors[0].type).toBe('internet');
    });

    it('logs error on invalid JSON without crashing', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      getState().importArchitecture('not-valid-json');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('logs error when plates/blocks are missing', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      getState().importArchitecture(JSON.stringify({ name: 'No data' }));
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('logs error when externalActors is not an array', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        plates: [],
        blocks: [],
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
        plates: [],
        blocks: [],
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
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'VM',
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
        externalActors: [
          { id: 'ext-1', name: 'Internet', type: 'internet' },
          { id: 'ext-2', name: 'Partner', type: 'internet' },
        ],
      };

      getState().importArchitecture(JSON.stringify(valid));

      expect(getArch().externalActors).toHaveLength(2);
      expect(getArch().externalActors.map((actor) => actor.id)).toEqual(['ext-1', 'ext-2']);
    });

    it.each([
      {
        name: 'id',
        connection: { sourceId: 'b1', targetId: 'p1', type: 'dataflow' },
        message: 'id must be a string',
      },
      {
        name: 'sourceId',
        connection: { id: 'c1', targetId: 'p1', type: 'dataflow' },
        message: 'sourceId must be a string',
      },
      {
        name: 'targetId',
        connection: { id: 'c1', sourceId: 'b1', type: 'dataflow' },
        message: 'targetId must be a string',
      },
      {
        name: 'type',
        connection: { id: 'c1', sourceId: 'b1', targetId: 'p1' },
        message: 'type must be a string',
      },
    ])('logs error when connection is missing $name', ({ connection, message }) => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'VM',
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
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
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'VM',
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
        connections: [
          { id: 'c1', sourceId: 'missing', targetId: 'b1', type: 'dataflow' },
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('does not reference an existing block, plate, or external actor');
      spy.mockRestore();
    });

    it('imports valid connections that reference existing entities', () => {
      const valid = {
        id: 'import-connections',
        name: 'Valid Connections',
        version: '1',
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'VM',
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
        externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
        connections: [
          { id: 'c1', sourceId: 'ext-internet', targetId: 'b1', type: 'dataflow' },
          { id: 'c2', sourceId: 'b1', targetId: 'p1', type: 'dataflow' },
        ],
      };

      getState().importArchitecture(JSON.stringify(valid));

      expect(getArch().connections).toHaveLength(2);
      expect(getArch().connections.map((connection) => connection.id)).toEqual(['c1', 'c2']);
    });

    it('logs error when block references non-existent plate', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'VM',
            category: 'compute',
            placementId: 'missing-plate',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('does not reference an existing plate');
      spy.mockRestore();
    });

    it('logs error when block name is not a string', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 123,
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('name must be a string');
      spy.mockRestore();
    });

    it('logs error when block category is invalid', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'VM',
            category: 'invalid-category',
            placementId: 'p1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('category must be one of compute, database, storage, gateway, function, queue, event, timer');
      spy.mockRestore();
    });

    it('logs error when external actor is not an object', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalid = {
        plates: [],
        blocks: [],
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
        plates: [],
        blocks: [],
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
        plates: [
          {
            id: 'p1',
            name: 'Net',
            type: 'network',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'b1',
            name: 'VM',
            category: 'compute',
            placementId: 'p1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
        connections: [
          { id: 'c1', sourceId: 'b1', targetId: 'missing-target', type: 'dataflow' },
        ],
      };

      getState().importArchitecture(JSON.stringify(invalid));

      expect(spy).toHaveBeenCalled();
      expect(String(spy.mock.calls.at(-1)?.[1])).toContain('does not reference an existing block, plate, or external actor');
      spy.mockRestore();
    });
  });

  describe('exportArchitecture', () => {
    it('returns JSON string of current architecture', () => {
      getState().addPlate('network', 'VNet', null);
      const json = getState().exportArchitecture();
      const parsed = JSON.parse(json);

      expect(parsed.plates).toHaveLength(1);
      expect(parsed.plates[0].name).toBe('VNet');
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
          plates: [
            {
              id: 'tp1',
              name: 'Net',
              type: 'network',
              parentId: null,
              children: [],
              position: { x: 0, y: 0, z: 0 },
              size: { width: 12, height: 0.3, depth: 10 },
              metadata: {},
            },
          ],
          blocks: [],
          connections: [],
          externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' }],
        },
      };

      const oldId = getState().workspace.id;
      getState().loadFromTemplate(template);

      expect(getState().workspace.id).not.toBe(oldId);
      expect(getState().workspace.name).toBe('Test Template');
      expect(getArch().plates).toHaveLength(1);
    });

    it('resets history when loading template', () => {
      getState().addPlate('network', 'VNet', null);
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
          plates: [],
          blocks: [],
          connections: [],
          externalActors: [],
        },
      };

      getState().loadFromTemplate(template);
      expect(getState().canUndo).toBe(false);
    });
  });

  describe('replaceArchitecture', () => {
    it('replaces architecture content while preserving workspace id and createdAt', () => {
      getState().addPlate('network', 'Original Network', null);

      const initialArch = getArch();
      const snapshot: ArchitectureSnapshot = {
        name: 'Checkpoint Architecture',
        version: '1',
        plates: [
          {
            id: 'snap-plate-1',
            name: 'Snap Network',
            type: 'network',
            parentId: null,
            children: ['snap-block-1'],
            position: { x: 1, y: 0, z: 2 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
        blocks: [
          {
            id: 'snap-block-1',
            name: 'Snap VM',
            category: 'compute',
            placementId: 'snap-plate-1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ],
        connections: [
          {
            id: 'snap-conn-1',
            sourceId: 'snap-block-1',
            targetId: 'snap-plate-1',
            type: 'dataflow',
            metadata: {},
          },
        ],
        externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
      };

      vi.setSystemTime(new Date('2025-01-02T00:00:00Z'));
      getState().replaceArchitecture(snapshot);

      const replaced = getArch();
      expect(replaced.id).toBe(initialArch.id);
      expect(replaced.createdAt).toBe(initialArch.createdAt);
      expect(replaced.updatedAt).not.toBe(initialArch.updatedAt);
      expect(replaced.plates).toEqual(snapshot.plates);
      expect(replaced.blocks).toEqual(snapshot.blocks);
      expect(replaced.connections).toEqual(snapshot.connections);
    });

    it('pushes history (undo restores previous architecture)', () => {
      getState().addPlate('network', 'Original Network', null);
      const networkId = getArch().plates[0].id;
      getState().addPlate('subnet', 'Original Subnet', networkId, 'public');
      const subnetId = getArch().plates[1].id;
      getState().addBlock('compute', 'Original VM', subnetId);

      const beforeReplace = JSON.parse(JSON.stringify(getArch())) as ArchitectureModel;
      const snapshot: ArchitectureSnapshot = {
        name: 'Checkpoint',
        version: '1',
        plates: [],
        blocks: [],
        connections: [],
        externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
      };

      getState().replaceArchitecture(snapshot);
      expect(getArch().plates).toHaveLength(0);

      getState().undo();
      expect(getArch()).toEqual(beforeReplace);
    });

    it('invalidates validation result', () => {
      getState().addPlate('network', 'Original Network', null);
      const validated = getState().validate();
      expect(validated.valid).toBe(true);
      expect(getState().validationResult).not.toBeNull();

      const snapshot: ArchitectureSnapshot = {
        name: 'Checkpoint',
        version: '1',
        plates: [],
        blocks: [],
        connections: [],
        externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
      };

      getState().replaceArchitecture(snapshot);
      expect(getState().validationResult).toBeNull();
    });
  });

  // ── Auto-validation subscriber ──

  describe('auto-validation', () => {
    it('clears validationResult on mutation', () => {
      getState().validate();
      expect(getState().validationResult).not.toBeNull();

      getState().addPlate('network', 'VNet', null);
      expect(getState().validationResult).toBeNull();
    });

    it('runs validation after 300ms delay', () => {
      getState().addPlate('network', 'VNet', null);
      expect(getState().validationResult).toBeNull();

      vi.advanceTimersByTime(300);

      expect(getState().validationResult).not.toBeNull();
      expect(getState().validationResult?.valid).toBe(true);
    });

    it('debounces rapid mutations', () => {
      getState().addPlate('network', 'A', null);
      vi.advanceTimersByTime(100);
      getState().addPlate('network', 'B', null);
      vi.advanceTimersByTime(100);
      getState().addPlate('network', 'C', null);

      // Still null — timer was reset each time
      expect(getState().validationResult).toBeNull();

      vi.advanceTimersByTime(300);
      expect(getState().validationResult).not.toBeNull();
    });
  });
});
