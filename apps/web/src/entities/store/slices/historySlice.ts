import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  createHistory,
  pushHistory,
  redo as historyRedo,
  undo as historyUndo,
} from '../../../shared/utils/history';
import type { ArchitectureModel } from '@cloudblocks/schema';
import type { ArchitectureSlice, ArchitectureState } from './types';

type HistorySlice = Pick<
  ArchitectureState,
  | 'history'
  | 'canUndo'
  | 'canRedo'
  | 'undo'
  | 'redo'
  | 'gestureOrigin'
  | 'beginGesture'
  | 'commitGesture'
  | 'cancelGesture'
>;

/**
 * Whether a gesture moved anything.
 *
 * A gesture is a positional transaction: the move actions rebuild the node
 * array on every pointer event, so the architecture object always differs by
 * reference even when the pointer returned to where it started. Compare what a
 * gesture can actually change instead.
 */
function isSameLayout(a: ArchitectureModel, b: ArchitectureModel): boolean {
  if (a === b) {
    return true;
  }

  if (a.nodes.length !== b.nodes.length || a.connections !== b.connections) {
    return false;
  }

  return a.nodes.every((node, index) => {
    const other = b.nodes[index];
    if (node === other) {
      return true;
    }

    return (
      node.id === other.id &&
      node.parentId === other.parentId &&
      node.position.x === other.position.x &&
      node.position.y === other.position.y &&
      node.position.z === other.position.z &&
      (node.kind !== 'container' ||
        other.kind !== 'container' ||
        (node.frame.width === other.frame.width &&
          node.frame.height === other.frame.height &&
          node.frame.depth === other.frame.depth))
    );
  });
}

export const createHistorySlice: ArchitectureSlice<HistorySlice> = (set, get) => ({
  history: createHistory(),
  canUndo: false,
  canRedo: false,
  gestureOrigin: null,

  beginGesture: () => {
    if (get().gestureOrigin !== null) {
      return;
    }
    set({ gestureOrigin: get().workspace.architecture });
  },

  commitGesture: () => {
    const state = get();
    const origin = state.gestureOrigin;

    if (origin === null) {
      return;
    }

    // A gesture that ended where it started is not an edit, so it must not
    // consume a history slot or clear the redo stack.
    if (isSameLayout(origin, state.workspace.architecture)) {
      set({ gestureOrigin: null });
      return;
    }

    const history = pushHistory(state.history, origin);
    set({
      gestureOrigin: null,
      history,
      canUndo: historyCanUndo(history),
      canRedo: historyCanRedo(history),
    });
  },

  cancelGesture: () => {
    const state = get();
    const origin = state.gestureOrigin;

    if (origin === null) {
      return;
    }

    set({
      gestureOrigin: null,
      workspace: { ...state.workspace, architecture: origin },
      validationResult: null,
    });
  },

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
