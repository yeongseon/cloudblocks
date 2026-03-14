import type { ArchitectureModel } from '../types/index';

/**
 * Undo/Redo History Manager (v0.2)
 *
 * Operates at the model level — every architecture mutation is tracked.
 * Uses a linear history stack with a cursor. New mutations after an undo
 * discard the forward history (standard undo/redo behavior).
 *
 * Deep-clones model snapshots to prevent mutation leaks.
 */

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  /** Past snapshots (oldest first). Does NOT include current state. */
  past: ArchitectureModel[];
  /** Future snapshots (for redo). Oldest redo-able first. */
  future: ArchitectureModel[];
}

function cloneModel(model: ArchitectureModel): ArchitectureModel {
  return JSON.parse(JSON.stringify(model));
}

export function createHistory(): HistoryState {
  return { past: [], future: [] };
}

/**
 * Push the current model state before a mutation.
 * Call this BEFORE applying the mutation to the model.
 * Clears the redo stack (forward history is discarded on new mutations).
 */
export function pushHistory(
  history: HistoryState,
  currentModel: ArchitectureModel
): HistoryState {
  const past = [...history.past, cloneModel(currentModel)];
  // Trim oldest entries if past exceeds max size
  if (past.length > MAX_HISTORY_SIZE) {
    past.splice(0, past.length - MAX_HISTORY_SIZE);
  }
  return { past, future: [] };
}

/**
 * Undo: restore the previous model state.
 * Returns null if there's nothing to undo.
 */
export function undo(
  history: HistoryState,
  currentModel: ArchitectureModel
): { history: HistoryState; model: ArchitectureModel } | null {
  if (history.past.length === 0) return null;

  const past = [...history.past];
  const previous = past.pop()!;
  const future = [cloneModel(currentModel), ...history.future];

  return {
    history: { past, future },
    model: previous,
  };
}

/**
 * Redo: restore the next model state.
 * Returns null if there's nothing to redo.
 */
export function redo(
  history: HistoryState,
  currentModel: ArchitectureModel
): { history: HistoryState; model: ArchitectureModel } | null {
  if (history.future.length === 0) return null;

  const future = [...history.future];
  const next = future.shift()!;
  const past = [...history.past, cloneModel(currentModel)];

  return {
    history: { past, future },
    model: next,
  };
}

/**
 * Check if undo is available.
 */
export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0;
}

/**
 * Check if redo is available.
 */
export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0;
}

/**
 * Reset history (e.g., on workspace reset/load).
 */
export function resetHistory(): HistoryState {
  return createHistory();
}
