import type { ArchitectureModel, Block, Position, Workspace } from '../../../shared/types/index';
import { DEFAULT_BLOCK_SIZE, DEFAULT_PLATE_SIZE } from '../../../shared/types/index';
import { createBlankArchitecture } from '../../../shared/types/schema';
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  pushHistory,
  resetHistory,
} from '../../../shared/utils/history';
import { generateId } from '../../../shared/utils/id';
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

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function nextGridPosition(
  existingBlocks: Block[],
  plateSize: { width: number; depth: number }
): Position {
  const blockWidth = DEFAULT_BLOCK_SIZE.width;
  const blockDepth = DEFAULT_BLOCK_SIZE.depth;
  const spacing = 0.2;
  const stepX = blockWidth + spacing;
  const stepZ = blockDepth + spacing;

  const maxCols = Math.max(
    1,
    Math.floor((plateSize.width - blockWidth) / stepX) + 1
  );
  const index = existingBlocks.length;
  const col = index % maxCols;
  const row = Math.floor(index / maxCols);
  const startX = -((maxCols - 1) * stepX) / 2;
  const startZ = 0;
  const anchorOffsetX = 3.4;
  const anchorOffsetZ = 0.8;

  return {
    x: roundToTenth(startX + col * stepX + anchorOffsetX),
    y: 0.5,
    z: roundToTenth(startZ - row * stepZ + anchorOffsetZ),
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
