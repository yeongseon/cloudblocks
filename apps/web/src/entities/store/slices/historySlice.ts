import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  createHistory,
  redo as historyRedo,
  undo as historyUndo,
} from '../../../shared/utils/history';
import type { ArchitectureSlice, ArchitectureState } from './types';

type HistorySlice = Pick<ArchitectureState, 'history' | 'canUndo' | 'canRedo' | 'undo' | 'redo'>;

export const createHistorySlice: ArchitectureSlice<HistorySlice> = (set, get) => ({
  history: createHistory(),
  canUndo: false,
  canRedo: false,

  undo: () => {
    const state = get();
    const result = historyUndo(state.history, state.workspace.architecture);

    if (!result) {
      return;
    }

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

    if (!result) {
      return;
    }

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
});
