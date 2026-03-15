import type { ArchitectureModel, Block, Position, Workspace } from '../../../shared/types/index';
import { DEFAULT_PLATE_SIZE } from '../../../shared/types/index';
import { createBlankArchitecture } from '../../../shared/types/schema';
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  pushHistory,
  resetHistory,
} from '../../../shared/utils/history';
import { generateId } from '../../../shared/utils/id';
import { GRID_CELL } from '../../../shared/utils/position';
import type { ArchitectureState } from './types';

const DEFAULT_WORKSPACE_NAME = 'My Architecture';

export function createDefaultWorkspace(): Workspace {
  const now = new Date().toISOString();

  return {
    id: generateId('ws'),
    name: DEFAULT_WORKSPACE_NAME,
    architecture: createBlankArchitecture(generateId('arch'), DEFAULT_WORKSPACE_NAME),
    createdAt: now,
    updatedAt: now,
  };
}

export function touchModel(model: ArchitectureModel): ArchitectureModel {
  return { ...model, updatedAt: new Date().toISOString() };
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_CELL) * GRID_CELL;
}

export function nextGridPosition(
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
    z: snapToGrid(plateSize.depth / 2 - GRID_CELL / 2 - 0.5 - row * GRID_CELL),
  };
}

export function withHistory(
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

export function upsertCurrentWorkspace(
  workspaces: Workspace[],
  workspace: Workspace
): Workspace[] {
  const updated = workspaces.map((candidate) =>
    candidate.id === workspace.id ? workspace : candidate
  );

  if (!updated.find((candidate) => candidate.id === workspace.id)) {
    updated.push(workspace);
  }

  return updated;
}

export function resetTransientState(): Pick<
  ArchitectureState,
  'validationResult' | 'history' | 'canUndo' | 'canRedo'
> {
  return {
    validationResult: null,
    history: resetHistory(),
    canUndo: false,
    canRedo: false,
  };
}

export { DEFAULT_PLATE_SIZE };
