import type { Workspace } from '../../../shared/types/index';
import { createBlankArchitecture } from '../../../shared/types/schema';
import { generateId } from '../../../shared/utils/id';
import { saveWorkspaces, saveActiveWorkspaceId } from '../../../shared/utils/storage';
import { useWorkerStore } from '../workerStore';
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
  | 'setBackendWorkspaceId'
>;

function saveWorkspacesWithError(workspaces: Workspace[], action: string): boolean {
  const saved = saveWorkspaces(workspaces);
  if (!saved) {
    console.error(`Failed to save workspaces during ${action}.`);
  }
  return saved;
}

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

    if (saveWorkspacesWithError(updatedList, 'createWorkspace')) {
      saveActiveWorkspaceId(newWorkspace.id);
    }
    useWorkerStore.getState().clearQueue();

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

    const updatedList = upsertCurrentWorkspace(state.workspaces, state.workspace);

    if (saveWorkspacesWithError(updatedList, 'switchWorkspace')) {
      saveActiveWorkspaceId(target.id);
    }
    useWorkerStore.getState().clearQueue();

    set({
      workspace: target,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  deleteWorkspace: (id) => {
    const state = get();
    const withCurrent = upsertCurrentWorkspace(state.workspaces, state.workspace);
    const filtered = withCurrent.filter((workspace) => workspace.id !== id);

    if (state.workspace.id === id) {
      const next = filtered.length > 0 ? filtered[0] : createDefaultWorkspace();

      if (filtered.length === 0) {
        filtered.push(next);
      }

      if (saveWorkspacesWithError(filtered, 'deleteWorkspace')) {
        saveActiveWorkspaceId(next.id);
      }
      useWorkerStore.getState().clearQueue();

      set({
        workspace: next,
        workspaces: filtered,
        ...resetTransientState(),
      });

      return;
    }

    saveWorkspacesWithError(filtered, 'deleteWorkspace');
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

    if (saveWorkspacesWithError(updatedList, 'cloneWorkspace')) {
      saveActiveWorkspaceId(cloned.id);
    }
    useWorkerStore.getState().clearQueue();

    set({
      workspace: cloned,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  setBackendWorkspaceId: (workspaceId, backendId) => {
    const state = get();
    const updatedWorkspace =
      state.workspace.id === workspaceId
        ? { ...state.workspace, backendWorkspaceId: backendId }
        : state.workspace;

    const updatedList = state.workspaces.map((ws) =>
      ws.id === workspaceId ? { ...ws, backendWorkspaceId: backendId } : ws
    );

    saveWorkspacesWithError(
      upsertCurrentWorkspace(updatedList, updatedWorkspace),
      'setBackendWorkspaceId'
    );

    set({
      workspace: updatedWorkspace,
      workspaces: updatedList,
    });
  },
});
