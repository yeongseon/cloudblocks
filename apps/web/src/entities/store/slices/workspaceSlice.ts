import type { Workspace } from '../../../shared/types/index';
import { createBlankArchitecture } from '../../../shared/types/schema';
import { generateId } from '../../../shared/utils/id';
import type { ArchitectureSlice, ArchitectureState } from './types';
import {
  createDefaultWorkspace,
  resetTransientState,
  upsertCurrentWorkspace,
} from './helpers';

type WorkspaceSlice = Pick<
  ArchitectureState,
  | 'workspace'
  | 'workspaces'
  | 'createWorkspace'
  | 'switchWorkspace'
  | 'deleteWorkspace'
  | 'cloneWorkspace'
>;

export const createWorkspaceSlice: ArchitectureSlice<WorkspaceSlice> = (
  set,
  get
) => ({
  workspace: createDefaultWorkspace(),
  workspaces: [],

  createWorkspace: (name) => {
    const state = get();
    const now = new Date().toISOString();
    const newWorkspace: Workspace = {
      id: generateId('ws'),
      name,
      architecture: createBlankArchitecture(generateId('arch'), name),
      createdAt: now,
      updatedAt: now,
    };

    const updatedList = upsertCurrentWorkspace(state.workspaces, state.workspace);
    updatedList.push(newWorkspace);

    set({
      workspace: newWorkspace,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  switchWorkspace: (id) => {
    const state = get();
    const target = state.workspaces.find((workspace) => workspace.id === id);

    if (!target || target.id === state.workspace.id) {
      return;
    }

    const updatedList = state.workspaces.map((workspace) =>
      workspace.id === state.workspace.id ? state.workspace : workspace
    );

    set({
      workspace: target,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  deleteWorkspace: (id) => {
    const state = get();
    const filtered = state.workspaces.filter((workspace) => workspace.id !== id);

    if (state.workspace.id === id) {
      const next = filtered.length > 0 ? filtered[0] : createDefaultWorkspace();

      if (filtered.length === 0) {
        filtered.push(next);
      }

      set({
        workspace: next,
        workspaces: filtered,
        ...resetTransientState(),
      });

      return;
    }

    set({ workspaces: filtered });
  },

  cloneWorkspace: (id) => {
    const state = get();
    const source =
      id === state.workspace.id
        ? state.workspace
        : state.workspaces.find((workspace) => workspace.id === id);

    if (!source) {
      return;
    }

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

    const updatedList = upsertCurrentWorkspace(state.workspaces, state.workspace);
    updatedList.push(cloned);

    set({
      workspace: cloned,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },
});
