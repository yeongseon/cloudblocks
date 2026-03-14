import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArchitectureModel } from '../../shared/types/index';
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
      expect(subnet.position.y).toBe(0.3);

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

      // First subnet: x = -3 + 0*6 = -3
      expect(sub1.position.x).toBe(-3);
      // Second subnet: x = -3 + 1*6 = 3
      expect(sub2.position.x).toBe(3);
    });

    it('pushes to undo history', () => {
      getState().addPlate('network', 'VNet', null);
      expect(getState().canUndo).toBe(true);
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
