import type { Workspace } from '../../../shared/types/index';
import type { ArchitectureModel, BlockCategory, PlateType } from '@cloudblocks/schema';
import type { ArchitectureSnapshot } from '../../../shared/types/learning';
import { saveWorkspaces, loadWorkspaces } from '../../../shared/utils/storage';
import { generateId } from '../../../shared/utils/id';
import type { ArchitectureSlice, ArchitectureState } from './types';
import {
  createDefaultWorkspace,
  resetTransientState,
  touchModel,
  upsertCurrentWorkspace,
  withHistory,
} from './helpers';

const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_EXTERNAL_ACTOR_POSITION = { x: -3, y: 0, z: 5 };
const VALID_PLATE_TYPES: PlateType[] = ['global', 'edge', 'region', 'zone', 'subnet'];
const VALID_BLOCK_CATEGORIES: BlockCategory[] = [
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'analytics',
  'identity',
  'observability',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidPlateType = (value: unknown): value is PlateType =>
  typeof value === 'string' &&
  VALID_PLATE_TYPES.includes(value as PlateType);

const isValidBlockCategory = (value: unknown): value is BlockCategory =>
  typeof value === 'string' &&
  VALID_BLOCK_CATEGORIES.includes(value as BlockCategory);

const validatePosition = (value: unknown, context: string): void => {
  if (!isRecord(value)) {
    throw new Error(`${context}.position must be an object with x, y, z numbers`);
  }

  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.z)
  ) {
    throw new Error(`${context}.position must contain numeric x, y, z values`);
  }
};

const validateSize = (value: unknown, context: string): void => {
  if (!isRecord(value)) {
    throw new Error(
      `${context}.size must be an object with width, height, depth numbers`
    );
  }

  if (
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    !isFiniteNumber(value.depth)
  ) {
    throw new Error(
      `${context}.size must contain numeric width, height, depth values`
    );
  }
};

const validateImportData = (
  imported: unknown,
  jsonLength: number
): { valid: true } => {
  if (jsonLength > MAX_IMPORT_SIZE_BYTES) {
    throw new Error('Import exceeds 5MB limit');
  }

  if (!isRecord(imported)) {
    throw new Error('Invalid architecture format: root must be an object');
  }

  if (!Array.isArray(imported.plates)) {
    throw new Error('Invalid architecture format: plates must be an array');
  }

  if (!Array.isArray(imported.blocks)) {
    throw new Error('Invalid architecture format: blocks must be an array');
  }

  if (
    imported.connections !== undefined &&
    !Array.isArray(imported.connections)
  ) {
    throw new Error('Invalid architecture format: connections must be an array');
  }

  const plateIds = new Set<string>();
  imported.plates.forEach((plate, index) => {
    const context = `Invalid plate at index ${index}`;
    if (!isRecord(plate)) {
      throw new Error(`${context}: plate must be an object`);
    }

    if (typeof plate.id !== 'string') {
      throw new Error(`${context}: id must be a string`);
    }
    if (typeof plate.name !== 'string') {
      throw new Error(`${context}: name must be a string`);
    }
    if (!isValidPlateType(plate.type)) {
      throw new Error(`${context}: type must be one of global, edge, region, zone, or subnet`);
    }
    validatePosition(plate.position, context);
    validateSize(plate.size, context);
    if (!Array.isArray(plate.children)) {
      throw new Error(`${context}: children must be an array`);
    }

    plateIds.add(plate.id);
  });

  const blockIds = new Set<string>();
  imported.blocks.forEach((block, index) => {
    const context = `Invalid block at index ${index}`;
    if (!isRecord(block)) {
      throw new Error(`${context}: block must be an object`);
    }

    if (typeof block.id !== 'string') {
      throw new Error(`${context}: id must be a string`);
    }
    if (typeof block.name !== 'string') {
      throw new Error(`${context}: name must be a string`);
    }
    if (!isValidBlockCategory(block.category)) {
      throw new Error(
        `${context}: category must be one of compute, database, storage, gateway, function, queue, event, analytics, identity, observability`
      );
    }
    if (typeof block.placementId !== 'string') {
      throw new Error(`${context}: placementId must be a string`);
    }
    validatePosition(block.position, context);

    if (!plateIds.has(block.placementId)) {
      throw new Error(
        `${context}: placementId "${block.placementId}" does not reference an existing plate`
      );
    }

    blockIds.add(block.id);
  });

  const externalActorIds = new Set<string>();
  if (imported.externalActors === undefined) {
    externalActorIds.add('ext-internet');
  } else {
    if (!Array.isArray(imported.externalActors)) {
      throw new Error('Invalid architecture format: externalActors must be an array');
    }

    imported.externalActors.forEach((actor, index) => {
      const context = `Invalid external actor at index ${index}`;
      if (!isRecord(actor)) {
        throw new Error(`${context}: external actor must be an object`);
      }

      if (typeof actor.id !== 'string') {
        throw new Error(`${context}: id must be a string`);
      }

      if (actor.position !== undefined) {
        validatePosition(actor.position, context);
      }

      externalActorIds.add(actor.id);
    });
  }

  const validConnectionEndpointIds = new Set<string>([
    ...plateIds,
    ...blockIds,
    ...externalActorIds,
  ]);

  const connections = imported.connections ?? [];
  connections.forEach((connection, index) => {
    const context = `Invalid connection at index ${index}`;
    if (!isRecord(connection)) {
      throw new Error(`${context}: connection must be an object`);
    }

    if (typeof connection.id !== 'string') {
      throw new Error(`${context}: id must be a string`);
    }
    if (typeof connection.sourceId !== 'string') {
      throw new Error(`${context}: sourceId must be a string`);
    }
    if (typeof connection.targetId !== 'string') {
      throw new Error(`${context}: targetId must be a string`);
    }
    if (typeof connection.type !== 'string') {
      throw new Error(`${context}: type must be a string`);
    }

    if (!validConnectionEndpointIds.has(connection.sourceId)) {
      throw new Error(
        `${context}: sourceId "${connection.sourceId}" does not reference an existing block, plate, or external actor`
      );
    }

    if (!validConnectionEndpointIds.has(connection.targetId)) {
      throw new Error(
        `${context}: targetId "${connection.targetId}" does not reference an existing block, plate, or external actor`
      );
    }
  });

  return { valid: true };
};

type PersistenceSlice = Pick<
  ArchitectureState,
  | 'saveToStorage'
  | 'loadFromStorage'
  | 'resetWorkspace'
  | 'renameWorkspace'
  | 'importArchitecture'
  | 'exportArchitecture'
  | 'loadFromTemplate'
  | 'replaceArchitecture'
>;

export const createPersistenceSlice: ArchitectureSlice<PersistenceSlice> = (
  set,
  get
) => ({
  saveToStorage: () => {
    const state = get();
    const updated = upsertCurrentWorkspace(state.workspaces, state.workspace);

    saveWorkspaces(updated);
    set({ workspaces: updated });
  },

  loadFromStorage: () => {
    const workspaces = loadWorkspaces();

    if (workspaces.length === 0) {
      return;
    }

    set({
      workspace: workspaces[0],
      workspaces,
      ...resetTransientState(),
    });
  },

  resetWorkspace: () => {
    set({
      workspace: createDefaultWorkspace(),
      ...resetTransientState(),
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

  importArchitecture: (json) => {
    try {
      const importedRaw = JSON.parse(json) as unknown;
      validateImportData(importedRaw, json.length);
      const imported = importedRaw as Partial<ArchitectureModel> &
        Pick<ArchitectureModel, 'plates' | 'blocks'>;

      const now = new Date().toISOString();
      const normalized: ArchitectureModel = {
        id: imported.id || generateId('arch'),
        name: imported.name || 'Imported Architecture',
        version: imported.version || '1',
        plates: imported.plates,
        blocks: imported.blocks,
        connections: imported.connections ?? [],
        externalActors:
          imported.externalActors?.map((actor) => ({
            ...actor,
            position: actor.position ?? { ...DEFAULT_EXTERNAL_ACTOR_POSITION },
          })) ?? [
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { ...DEFAULT_EXTERNAL_ACTOR_POSITION },
            },
          ],
        createdAt: imported.createdAt || now,
        updatedAt: now,
      };

      const newWorkspace: Workspace = {
        id: generateId('ws'),
        name: normalized.name,
        architecture: normalized,
        createdAt: now,
        updatedAt: now,
      };

      const state = get();
      const updatedList = upsertCurrentWorkspace(state.workspaces, state.workspace);
      updatedList.push(newWorkspace);

      set({
        workspace: newWorkspace,
        workspaces: updatedList,
        ...resetTransientState(),
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
    const newWorkspace: Workspace = {
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
    const updatedList = upsertCurrentWorkspace(state.workspaces, state.workspace);
    updatedList.push(newWorkspace);

    set({
      workspace: newWorkspace,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  replaceArchitecture: (snapshot: ArchitectureSnapshot) => {
    const state = get();
    const now = new Date().toISOString();
    const newArch: ArchitectureModel = {
      ...JSON.parse(JSON.stringify(snapshot)),
      id: state.workspace.architecture.id,
      createdAt: state.workspace.architecture.createdAt,
      updatedAt: now,
    };

    set({
      ...withHistory(state, newArch),
    });
  },
});
