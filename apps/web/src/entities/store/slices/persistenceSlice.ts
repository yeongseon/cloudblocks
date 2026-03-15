import type { ArchitectureModel, Workspace } from '../../../shared/types/index';
import { saveWorkspaces, loadWorkspaces } from '../../../shared/utils/storage';
import { generateId } from '../../../shared/utils/id';
import type { ArchitectureSlice, ArchitectureState } from './types';
import {
  createDefaultWorkspace,
  resetTransientState,
  touchModel,
  upsertCurrentWorkspace,
} from './helpers';

type PersistenceSlice = Pick<
  ArchitectureState,
  | 'saveToStorage'
  | 'loadFromStorage'
  | 'resetWorkspace'
  | 'renameWorkspace'
  | 'importArchitecture'
  | 'exportArchitecture'
  | 'loadFromTemplate'
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
      const imported = JSON.parse(json) as Partial<ArchitectureModel>;

      if (!imported.plates || !imported.blocks) {
        throw new Error(
          'Invalid architecture format: plates and blocks are required'
        );
      }

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
});
