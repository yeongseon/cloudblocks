import type { Workspace } from '../../../shared/types/index';
import { createBlankArchitecture } from '../../../shared/types/schema';
import type { ProviderType } from '@cloudblocks/schema';
import { generateId } from '../../../shared/utils/id';
import { saveWorkspaces, saveActiveWorkspaceId } from '../../../shared/utils/storage';
import type { ArchitectureSlice, ArchitectureState } from './types';
import {
  createDefaultWorkspace,
  deduplicateWorkspaceName,
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
  | 'deleteWorkspaces'
  | 'cloneWorkspace'
  | 'setBackendWorkspaceId'
  | 'setGithubRepo'
  | 'setLastPrResult'
>;

function applyWorkspaceDeletion(
  state: Pick<ArchitectureState, 'workspace' | 'workspaces'>,
  idsToDelete: Set<string>,
):
  | {
      mode: 'active_deleted';
      nextWorkspace: Workspace;
      filtered: Workspace[];
    }
  | {
      mode: 'active_kept';
      filtered: Workspace[];
    } {
  const withCurrent = upsertCurrentWorkspace(state.workspaces, state.workspace);
  const filtered = withCurrent.filter((workspace) => !idsToDelete.has(workspace.id));

  if (idsToDelete.has(state.workspace.id)) {
    const nextWorkspace = filtered.length > 0 ? filtered[0] : createDefaultWorkspace();
    if (filtered.length === 0) {
      filtered.push(nextWorkspace);
    }

    return { mode: 'active_deleted', nextWorkspace, filtered };
  }

  return { mode: 'active_kept', filtered };
}

export const createWorkspaceSlice: ArchitectureSlice<WorkspaceSlice> = (set, get) => ({
  workspace: createDefaultWorkspace(),
  workspaces: [],

  createWorkspace: (name, provider: ProviderType) => {
    const state = get();
    const allWorkspaces = upsertCurrentWorkspace(state.workspaces, state.workspace);
    const uniqueName = deduplicateWorkspaceName(name, allWorkspaces);
    const now = new Date().toISOString();
    const newWorkspace: Workspace = {
      id: generateId('ws'),
      name: uniqueName,
      provider,
      architecture: createBlankArchitecture(generateId('arch'), uniqueName),
      createdAt: now,
      updatedAt: now,
    };

    allWorkspaces.push(newWorkspace);

    if (saveWorkspaces(allWorkspaces)) {
      saveActiveWorkspaceId(newWorkspace.id);
    }

    set({
      workspace: newWorkspace,
      workspaces: allWorkspaces,
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

    if (saveWorkspaces(updatedList)) {
      saveActiveWorkspaceId(target.id);
    }

    set({
      workspace: target,
      workspaces: updatedList,
      ...resetTransientState(),
    });
  },

  deleteWorkspace: (id) => {
    const state = get();
    const result = applyWorkspaceDeletion(state, new Set([id]));

    if (result.mode === 'active_deleted') {
      if (saveWorkspaces(result.filtered)) {
        saveActiveWorkspaceId(result.nextWorkspace.id);
      }

      set({
        workspace: result.nextWorkspace,
        workspaces: result.filtered,
        ...resetTransientState(),
      });

      return;
    }

    saveWorkspaces(result.filtered);
    set({ workspaces: result.filtered });
  },

  deleteWorkspaces: (ids) => {
    const state = get();
    const result = applyWorkspaceDeletion(state, new Set(ids));

    if (result.mode === 'active_deleted') {
      if (saveWorkspaces(result.filtered)) {
        saveActiveWorkspaceId(result.nextWorkspace.id);
      }

      set({
        workspace: result.nextWorkspace,
        workspaces: result.filtered,
        ...resetTransientState(),
      });

      return;
    }

    saveWorkspaces(result.filtered);
    set({ workspaces: result.filtered });
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
    const updatedList = upsertCurrentWorkspace(state.workspaces, state.workspace);
    const cloneName = deduplicateWorkspaceName(`${source.name} (Copy)`, updatedList);
    const cloned: Workspace = {
      id: generateId('ws'),
      name: cloneName,
      provider: source.provider ?? 'azure',
      architecture: {
        ...JSON.parse(JSON.stringify(source.architecture)),
        id: generateId('arch'),
        createdAt: now,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    updatedList.push(cloned);

    if (saveWorkspaces(updatedList)) {
      saveActiveWorkspaceId(cloned.id);
    }

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
      ws.id === workspaceId ? { ...ws, backendWorkspaceId: backendId } : ws,
    );

    saveWorkspaces(upsertCurrentWorkspace(updatedList, updatedWorkspace));

    set({
      workspace: updatedWorkspace,
      workspaces: updatedList,
    });
  },

  setGithubRepo: (workspaceId, repo) => {
    const state = get();
    const updatedWorkspace =
      state.workspace.id === workspaceId
        ? { ...state.workspace, githubRepo: repo }
        : state.workspace;

    const updatedList = state.workspaces.map((ws) =>
      ws.id === workspaceId ? { ...ws, githubRepo: repo } : ws,
    );

    saveWorkspaces(upsertCurrentWorkspace(updatedList, updatedWorkspace));

    set({
      workspace: updatedWorkspace,
      workspaces: updatedList,
    });
  },

  setLastPrResult: (workspaceId, result) => {
    const state = get();
    const updatedWorkspace =
      state.workspace.id === workspaceId
        ? { ...state.workspace, lastPrResult: result }
        : state.workspace;

    const updatedList = state.workspaces.map((ws) =>
      ws.id === workspaceId ? { ...ws, lastPrResult: result } : ws,
    );

    saveWorkspaces(upsertCurrentWorkspace(updatedList, updatedWorkspace));

    set({
      workspace: updatedWorkspace,
      workspaces: updatedList,
    });
  },
});
