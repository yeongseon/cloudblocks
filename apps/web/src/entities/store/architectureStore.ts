import { create } from 'zustand';
import type {
  ArchitectureModel,
  Block,
  BlockCategory,
  Connection,
  Plate,
  PlateType,
  Position,
  SubnetAccess,
  ValidationResult,
  Workspace,
} from '../../shared/types/index';
import { DEFAULT_PLATE_SIZE } from '../../shared/types/index';
import { createBlankArchitecture } from '../../shared/types/schema';
import { generateId } from '../../shared/utils/id';
import { validateArchitecture } from '../validation/engine';
import { saveWorkspaces, loadWorkspaces } from '../../shared/utils/storage';
import { GRID_CELL } from '../../shared/utils/position';
import {
  createHistory,
  pushHistory,
  undo as historyUndo,
  redo as historyRedo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
  resetHistory,
} from '../../shared/utils/history';
import type { ArchitectureTemplate } from '../../shared/types/template';

/**
 * Architecture state store.
 *
 * v0.2: Undo/redo history at the model level.
 * v0.4: Multi-workspace support (create/switch/delete/clone).
 */
interface ArchitectureState {
  // ── Data ──
  workspace: Workspace;
  workspaces: Workspace[];
  validationResult: ValidationResult | null;

  // ── History (v0.2) ──
  history: { past: ArchitectureModel[]; future: ArchitectureModel[] };
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // ── Plate actions ──
  addPlate: (
    type: PlateType,
    name: string,
    parentId: string | null,
    subnetAccess?: SubnetAccess
  ) => void;
  removePlate: (id: string) => void;

  // ── Block actions ──
  addBlock: (category: BlockCategory, name: string, placementId: string) => void;
  removeBlock: (id: string) => void;
  moveBlock: (blockId: string, newPlacementId: string) => void;

  // ── Connection actions ──
  addConnection: (sourceId: string, targetId: string) => void;
  removeConnection: (id: string) => void;

  // ── Validation ──
  validate: () => ValidationResult;

  // ── Workspace persistence ──
  saveToStorage: () => void;
  loadFromStorage: () => void;
  resetWorkspace: () => void;
  renameWorkspace: (name: string) => void;

  // ── Multi-workspace (v0.4) ──
  createWorkspace: (name: string) => void;
  switchWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  cloneWorkspace: (id: string) => void;
  importArchitecture: (json: string) => void;
  exportArchitecture: () => string;
  loadFromTemplate: (template: ArchitectureTemplate) => void;
}

const DEFAULT_WORKSPACE_NAME = 'My Architecture';

function createDefaultWorkspace(): Workspace {
  const now = new Date().toISOString();
  return {
    id: generateId('ws'),
    name: DEFAULT_WORKSPACE_NAME,
    architecture: createBlankArchitecture(generateId('arch'), DEFAULT_WORKSPACE_NAME),
    createdAt: now,
    updatedAt: now,
  };
}

function touchModel(model: ArchitectureModel): ArchitectureModel {
  return { ...model, updatedAt: new Date().toISOString() };
}

function snapToGrid(val: number): number {
  return Math.round(val / GRID_CELL) * GRID_CELL;
}

function nextGridPosition(
  existingBlocks: Block[],
  plateSize: { width: number; depth: number }
): Position {
  const maxCols = Math.max(1, Math.floor((plateSize.width - 1) / GRID_CELL));
  const index = existingBlocks.length;
  const col = index % maxCols;
  const row = Math.floor(index / maxCols);

  return {
    x: snapToGrid(-plateSize.width / 2 + GRID_CELL / 2 + 0.5 + col * GRID_CELL),
    y: 0.5,
    z: snapToGrid(-plateSize.depth / 2 + GRID_CELL / 2 + 0.5 + row * GRID_CELL),
  };
}

/**
 * Helper: wraps a mutation with undo history tracking.
 * Pushes current architecture to history before applying the mutation.
 */
function withHistory(
  state: ArchitectureState,
  newArch: ArchitectureModel
): Partial<ArchitectureState> {
  const newHistory = pushHistory(state.history, state.workspace.architecture);
  return {
    workspace: {
      ...state.workspace,
      architecture: touchModel(newArch),
      updatedAt: new Date().toISOString(),
    },
    history: newHistory,
    canUndo: historyCanUndo(newHistory),
    canRedo: historyCanRedo(newHistory),
    validationResult: null,
  };
}

export const useArchitectureStore = create<ArchitectureState>((set, get) => ({
  workspace: createDefaultWorkspace(),
  workspaces: [],
  validationResult: null,

  // ── History (v0.2) ──
  history: createHistory(),
  canUndo: false,
  canRedo: false,

  undo: () => {
    const state = get();
    const result = historyUndo(state.history, state.workspace.architecture);
    if (!result) return;
    set({
      workspace: {
        ...state.workspace,
        architecture: result.model,
        updatedAt: new Date().toISOString(),
      },
      history: result.history,
      canUndo: historyCanUndo(result.history),
      canRedo: historyCanRedo(result.history),
      validationResult: null,
    });
  },

  redo: () => {
    const state = get();
    const result = historyRedo(state.history, state.workspace.architecture);
    if (!result) return;
    set({
      workspace: {
        ...state.workspace,
        architecture: result.model,
        updatedAt: new Date().toISOString(),
      },
      history: result.history,
      canUndo: historyCanUndo(result.history),
      canRedo: historyCanRedo(result.history),
      validationResult: null,
    });
  },

  // ── Plate actions ──

  addPlate: (type, name, parentId, subnetAccess) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate: Plate = {
        id: generateId('plate'),
        name,
        type,
        subnetAccess: type === 'subnet' ? subnetAccess : undefined,
        parentId,
        children: [],
        position: { x: 0, y: 0, z: 0 },
        size: { ...DEFAULT_PLATE_SIZE[type] },
        metadata: {},
      };

      // Position plates relative to existing ones
      if (type === 'network') {
        plate.position = { x: 0, y: 0, z: 0 };
      } else if (parentId) {
        const siblingsInParent = arch.plates.filter(
          (p) => p.parentId === parentId
        );
        plate.position = {
          x: -3 + siblingsInParent.length * 6,
          y: 0.3,
          z: 0,
        };
      }

      let plates = [...arch.plates, plate];

      // Add to parent's children
      if (parentId) {
        plates = plates.map((p) =>
          p.id === parentId
            ? { ...p, children: [...p.children, plate.id] }
            : p
        );
      }

      return withHistory(state, { ...arch, plates });
    });
  },

  removePlate: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate = arch.plates.find((p) => p.id === id);
      if (!plate) return state;

      // Collect all child IDs recursively
      const idsToRemove = new Set<string>();
      const collectChildren = (plateId: string) => {
        idsToRemove.add(plateId);
        const p = arch.plates.find((pl) => pl.id === plateId);
        if (p) {
          p.children.forEach((cid) => {
            if (arch.plates.find((pl) => pl.id === cid)) {
              collectChildren(cid);
            }
          });
        }
      };
      collectChildren(id);

      const newPlates = arch.plates
        .filter((p) => !idsToRemove.has(p.id))
        .map((p) =>
          p.id === plate.parentId
            ? { ...p, children: p.children.filter((c) => c !== id) }
            : p
        );

      // Remove blocks on removed plates
      const newBlocks = arch.blocks.filter(
        (b) => !idsToRemove.has(b.placementId)
      );
      const removedBlockIds = new Set(
        arch.blocks
          .filter((b) => idsToRemove.has(b.placementId))
          .map((b) => b.id)
      );

      // Remove connections referencing removed blocks
      const newConnections = arch.connections.filter(
        (c) =>
          !removedBlockIds.has(c.sourceId) && !removedBlockIds.has(c.targetId)
      );

      return withHistory(state, {
        ...arch,
        plates: newPlates,
        blocks: newBlocks,
        connections: newConnections,
      });
    });
  },

  // ── Block actions ──

  addBlock: (category, name, placementId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const plate = arch.plates.find((p) => p.id === placementId);
      if (!plate) return state;

      // Position block relative to plate, offset by existing blocks count
      const existingBlocksOnPlate = arch.blocks.filter(
        (b) => b.placementId === placementId
      );

      const block: Block = {
        id: generateId('block'),
        name,
        category,
        placementId,
        position: nextGridPosition(existingBlocksOnPlate, plate.size),
        metadata: {},
      };

      return withHistory(state, {
        ...arch,
        blocks: [...arch.blocks, block],
        plates: arch.plates.map((p) =>
          p.id === placementId
            ? { ...p, children: [...p.children, block.id] }
            : p
        ),
      });
    });
  },

  removeBlock: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.blocks.find((b) => b.id === id);
      if (!block) return state;

      return withHistory(state, {
        ...arch,
        blocks: arch.blocks.filter((b) => b.id !== id),
        plates: arch.plates.map((p) =>
          p.id === block.placementId
            ? { ...p, children: p.children.filter((c) => c !== id) }
            : p
        ),
        connections: arch.connections.filter(
          (c) => c.sourceId !== id && c.targetId !== id
        ),
      });
    });
  },

  moveBlock: (blockId, newPlacementId) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.blocks.find((b) => b.id === blockId);
      if (!block) return state;

      const oldPlacementId = block.placementId;
      if (oldPlacementId === newPlacementId) return state;

      const targetPlate = arch.plates.find((p) => p.id === newPlacementId);
      if (!targetPlate) return state;

      // Recalculate position for the target plate layout
      const blocksOnTarget = arch.blocks.filter(
        (b) => b.placementId === newPlacementId
      );
      const newPosition = nextGridPosition(blocksOnTarget, targetPlate.size);

      return withHistory(state, {
        ...arch,
        blocks: arch.blocks.map((b) =>
          b.id === blockId
            ? { ...b, placementId: newPlacementId, position: newPosition }
            : b
        ),
        plates: arch.plates.map((p) => {
          if (p.id === oldPlacementId) {
            return {
              ...p,
              children: p.children.filter((c) => c !== blockId),
            };
          }
          if (p.id === newPlacementId) {
            return { ...p, children: [...p.children, blockId] };
          }
          return p;
        }),
      });
    });
  },

  // ── Connection actions ──

  addConnection: (sourceId, targetId) => {
    set((state) => {
      const arch = state.workspace.architecture;

      // Check for duplicate
      const exists = arch.connections.some(
        (c) => c.sourceId === sourceId && c.targetId === targetId
      );
      if (exists) return state;

      const connection: Connection = {
        id: generateId('conn'),
        sourceId,
        targetId,
        type: 'dataflow', // MVP only supports dataflow
        metadata: {},
      };

      return withHistory(state, {
        ...arch,
        connections: [...arch.connections, connection],
      });
    });
  },

  removeConnection: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      return withHistory(state, {
        ...arch,
        connections: arch.connections.filter((c) => c.id !== id),
      });
    });
  },

  // ── Validation ──

  validate: () => {
    const state = get();
    const result = validateArchitecture(state.workspace.architecture);
    set({ validationResult: result });
    return result;
  },

  // ── Workspace persistence ──

  saveToStorage: () => {
    const state = get();
    // Save all workspaces, ensuring current workspace is updated
    const updated = state.workspaces.map((ws) =>
      ws.id === state.workspace.id ? state.workspace : ws
    );
    // If current workspace isn't in the list yet, add it
    if (!updated.find((ws) => ws.id === state.workspace.id)) {
      updated.push(state.workspace);
    }
    saveWorkspaces(updated);
    set({ workspaces: updated });
  },

  loadFromStorage: () => {
    const workspaces = loadWorkspaces();
    if (workspaces.length > 0) {
      set({
        workspace: workspaces[0],
        workspaces,
        validationResult: null,
        history: resetHistory(),
        canUndo: false,
        canRedo: false,
      });
    }
  },

  resetWorkspace: () => {
    set({
      workspace: createDefaultWorkspace(),
      validationResult: null,
      history: resetHistory(),
      canUndo: false,
      canRedo: false,
    });
  },

  renameWorkspace: (name) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        name,
        architecture: touchModel({
          ...state.workspace.architecture,
          name,
        }),
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  // ── Multi-workspace (v0.4) ──

  createWorkspace: (name) => {
    const state = get();
    const now = new Date().toISOString();
    const newWs: Workspace = {
      id: generateId('ws'),
      name,
      architecture: createBlankArchitecture(generateId('arch'), name),
      createdAt: now,
      updatedAt: now,
    };

    // Save current workspace to the list before switching
    const updatedList = state.workspaces.map((ws) =>
      ws.id === state.workspace.id ? state.workspace : ws
    );
    if (!updatedList.find((ws) => ws.id === state.workspace.id)) {
      updatedList.push(state.workspace);
    }
    updatedList.push(newWs);

    set({
      workspace: newWs,
      workspaces: updatedList,
      validationResult: null,
      history: resetHistory(),
      canUndo: false,
      canRedo: false,
    });
  },

  switchWorkspace: (id) => {
    const state = get();
    const target = state.workspaces.find((ws) => ws.id === id);
    if (!target || target.id === state.workspace.id) return;

    // Save current workspace state into list
    const updatedList = state.workspaces.map((ws) =>
      ws.id === state.workspace.id ? state.workspace : ws
    );

    set({
      workspace: target,
      workspaces: updatedList,
      validationResult: null,
      history: resetHistory(),
      canUndo: false,
      canRedo: false,
    });
  },

  deleteWorkspace: (id) => {
    const state = get();
    const filtered = state.workspaces.filter((ws) => ws.id !== id);

    if (state.workspace.id === id) {
      // Switched to first remaining or create new
      const next = filtered.length > 0 ? filtered[0] : createDefaultWorkspace();
      if (filtered.length === 0) filtered.push(next);
      set({
        workspace: next,
        workspaces: filtered,
        validationResult: null,
        history: resetHistory(),
        canUndo: false,
        canRedo: false,
      });
    } else {
      set({ workspaces: filtered });
    }
  },

  cloneWorkspace: (id) => {
    const state = get();
    const source = id === state.workspace.id
      ? state.workspace
      : state.workspaces.find((ws) => ws.id === id);
    if (!source) return;

    const now = new Date().toISOString();
    const cloned: Workspace = {
      id: generateId('ws'),
      name: `${source.name} (Copy)`,
      architecture: {
        ...JSON.parse(JSON.stringify(source.architecture)),
        id: generateId('arch'),
        createdAt: now,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Save current workspace to list, then add clone
    const updatedList = state.workspaces.map((ws) =>
      ws.id === state.workspace.id ? state.workspace : ws
    );
    if (!updatedList.find((ws) => ws.id === state.workspace.id)) {
      updatedList.push(state.workspace);
    }
    updatedList.push(cloned);

    set({
      workspace: cloned,
      workspaces: updatedList,
      validationResult: null,
      history: resetHistory(),
      canUndo: false,
      canRedo: false,
    });
  },

  importArchitecture: (json) => {
    try {
      const imported = JSON.parse(json) as Partial<ArchitectureModel>;
      if (!imported.plates || !imported.blocks) {
        throw new Error('Invalid architecture format: plates and blocks are required');
      }

      // Normalize missing fields with sensible defaults
      const now = new Date().toISOString();
      const normalized: ArchitectureModel = {
        id: imported.id || generateId('arch'),
        name: imported.name || 'Imported Architecture',
        version: imported.version || '1',
        plates: imported.plates,
        blocks: imported.blocks,
        connections: imported.connections ?? [],
        externalActors: imported.externalActors ?? [
          { id: 'ext-internet', name: 'Internet', type: 'internet' },
        ],
        createdAt: imported.createdAt || now,
        updatedAt: now,
      };

      const newWs: Workspace = {
        id: generateId('ws'),
        name: normalized.name,
        architecture: normalized,
        createdAt: now,
        updatedAt: now,
      };

      const state = get();
      const updatedList = state.workspaces.map((ws) =>
        ws.id === state.workspace.id ? state.workspace : ws
      );
      if (!updatedList.find((ws) => ws.id === state.workspace.id)) {
        updatedList.push(state.workspace);
      }
      updatedList.push(newWs);

      set({
        workspace: newWs,
        workspaces: updatedList,
        validationResult: null,
        history: resetHistory(),
        canUndo: false,
        canRedo: false,
      });
    } catch (error) {
      console.error('Failed to import architecture:', error);
    }
  },

  exportArchitecture: () => {
    const state = get();
    return JSON.stringify(state.workspace.architecture, null, 2);
  },

  loadFromTemplate: (template) => {
    const now = new Date().toISOString();
    const newWs: Workspace = {
      id: generateId('ws'),
      name: template.name,
      architecture: {
        ...JSON.parse(JSON.stringify(template.architecture)),
        id: generateId('arch'),
        createdAt: now,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    const state = get();
    const updatedList = state.workspaces.map((ws) =>
      ws.id === state.workspace.id ? state.workspace : ws
    );
    if (!updatedList.find((ws) => ws.id === state.workspace.id)) {
      updatedList.push(state.workspace);
    }
    updatedList.push(newWs);

    set({
      workspace: newWs,
      workspaces: updatedList,
      validationResult: null,
      history: resetHistory(),
      canUndo: false,
      canRedo: false,
    });
  },
}));

// ── Auto-validation ──
// Debounced validation runs automatically after any architecture mutation.
// Mutations set validationResult to null; this subscriber detects that
// and schedules a validation pass after a short delay.

let autoValidateTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_VALIDATE_DELAY_MS = 300;

useArchitectureStore.subscribe((state, prevState) => {
  // Trigger when architecture object changed (mutation occurred) and
  // validationResult was cleared. This handles both the initial null state
  // and subsequent mutations correctly.
  const archChanged =
    state.workspace.architecture !== prevState.workspace.architecture;
  if (archChanged && state.validationResult === null) {
    if (autoValidateTimer) clearTimeout(autoValidateTimer);
    autoValidateTimer = setTimeout(() => {
      useArchitectureStore.getState().validate();
    }, AUTO_VALIDATE_DELAY_MS);
  }
});
