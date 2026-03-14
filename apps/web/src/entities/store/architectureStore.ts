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
import { validateArchitecture } from '../../features/validate/engine';
import { saveWorkspaces, loadWorkspaces } from '../../shared/utils/storage';
import { GRID_CELL } from '../../shared/utils/position';

/**
 * Architecture state store.
 * MVP: Single workspace. Multi-workspace support (add/switch/delete) planned for v1.0.
 * Storage format already supports Workspace[] for forward compatibility.
 */
interface ArchitectureState {
  // ── Data ──
  workspace: Workspace;
  validationResult: ValidationResult | null;

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

export const useArchitectureStore = create<ArchitectureState>((set, get) => ({
  workspace: createDefaultWorkspace(),
  validationResult: null,

  // ── Plate actions ──

  addPlate: (type, name, parentId, subnetAccess) => {
    set((state) => {
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
      const existingPlates = state.workspace.architecture.plates;
      if (type === 'network') {
        plate.position = { x: 0, y: 0, z: 0 };
      } else if (parentId) {
        const siblingsInParent = existingPlates.filter(
          (p) => p.parentId === parentId
        );
        plate.position = {
          x: -3 + siblingsInParent.length * 6,
          y: 0.3,
          z: 0,
        };
      }

      const updatedPlates = [...existingPlates, plate];

      // Add to parent's children
      let plates = updatedPlates;
      if (parentId) {
        plates = plates.map((p) =>
          p.id === parentId
            ? { ...p, children: [...p.children, plate.id] }
            : p
        );
      }

      return {
        workspace: {
          ...state.workspace,
          architecture: touchModel({
            ...state.workspace.architecture,
            plates,
          }),
          updatedAt: new Date().toISOString(),
        },
        validationResult: null,
      };
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

      return {
        workspace: {
          ...state.workspace,
          architecture: touchModel({
            ...arch,
            plates: newPlates,
            blocks: newBlocks,
            connections: newConnections,
          }),
          updatedAt: new Date().toISOString(),
        },
        validationResult: null,
      };
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

      return {
        workspace: {
          ...state.workspace,
          architecture: touchModel({
            ...arch,
            blocks: [...arch.blocks, block],
            plates: arch.plates.map((p) =>
              p.id === placementId
                ? { ...p, children: [...p.children, block.id] }
                : p
            ),
          }),
          updatedAt: new Date().toISOString(),
        },
        validationResult: null,
      };
    });
  },

  removeBlock: (id) => {
    set((state) => {
      const arch = state.workspace.architecture;
      const block = arch.blocks.find((b) => b.id === id);
      if (!block) return state;

      return {
        workspace: {
          ...state.workspace,
          architecture: touchModel({
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
          }),
          updatedAt: new Date().toISOString(),
        },
        validationResult: null,
      };
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

      return {
        workspace: {
          ...state.workspace,
          architecture: touchModel({
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
          }),
          updatedAt: new Date().toISOString(),
        },
        validationResult: null,
      };
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

      return {
        workspace: {
          ...state.workspace,
          architecture: touchModel({
            ...arch,
            connections: [...arch.connections, connection],
          }),
          updatedAt: new Date().toISOString(),
        },
        validationResult: null,
      };
    });
  },

  removeConnection: (id) => {
    set((state) => {
      return {
        workspace: {
          ...state.workspace,
          architecture: touchModel({
            ...state.workspace.architecture,
            connections: state.workspace.architecture.connections.filter(
              (c) => c.id !== id
            ),
          }),
          updatedAt: new Date().toISOString(),
        },
        validationResult: null,
      };
    });
  },

  // ── Validation ──

  validate: () => {
    const state = get();
    const result = validateArchitecture(state.workspace.architecture);
    set({ validationResult: result });
    return result;
  },

  // ── Workspace persistence (MVP: single workspace) ──

  saveToStorage: () => {
    const state = get();
    saveWorkspaces([state.workspace]);
  },

  loadFromStorage: () => {
    const workspaces = loadWorkspaces();
    if (workspaces.length > 0) {
      set({
        workspace: workspaces[0],
        validationResult: null,
      });
    }
  },

  resetWorkspace: () => {
    set({
      workspace: createDefaultWorkspace(),
      validationResult: null,
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
}));

// ── Auto-validation ──
// Debounced validation runs automatically after any architecture mutation.
// Mutations set validationResult to null; this subscriber detects that
// and schedules a validation pass after a short delay.

let autoValidateTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_VALIDATE_DELAY_MS = 300;

useArchitectureStore.subscribe((state, prevState) => {
  // Only trigger when validationResult was just cleared (mutation occurred)
  if (state.validationResult === null && prevState.validationResult !== null) {
    if (autoValidateTimer) clearTimeout(autoValidateTimer);
    autoValidateTimer = setTimeout(() => {
      useArchitectureStore.getState().validate();
    }, AUTO_VALIDATE_DELAY_MS);
  }
});
