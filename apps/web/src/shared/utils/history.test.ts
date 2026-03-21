import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArchitectureModel, ContainerNode } from '../types';
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redo,
  resetHistory,
  undo,
} from './history';

function createModel(id: string): ArchitectureModel {
  const container: ContainerNode = {
    id: `plate-${id}`,
    name: `Plate ${id}`,
    kind: 'container',
    layer: 'region',
    resourceType: 'virtual_network',
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    size: { width: 10, height: 0.3, depth: 10 },
    metadata: { nested: { value: id } },
  };

  return {
    id,
    name: `Architecture ${id}`,
    version: '1',
    nodes: [container],
    connections: [],
    externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('history utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createHistory returns empty past/future stacks', () => {
    const history = createHistory();

    expect(history).toEqual({ past: [], future: [] });
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('pushHistory adds current model to past and clears future', () => {
    const modelA = createModel('a');
    const modelB = createModel('b');

    const initial = pushHistory(createHistory(), modelA);
    const undoResult = undo(initial, modelB);

    expect(undoResult).not.toBeNull();
    const withFuture = undoResult!.history;
    expect(withFuture.future).toHaveLength(1);

    const pushedAfterUndo = pushHistory(withFuture, modelB);

    expect(pushedAfterUndo.past).toHaveLength(1);
    expect(pushedAfterUndo.past[0].id).toBe('b');
    expect(pushedAfterUndo.future).toEqual([]);
  });

  it('pushHistory enforces MAX_HISTORY_SIZE of 50', () => {
    let history = createHistory();

    for (let i = 0; i < 51; i += 1) {
      history = pushHistory(history, createModel(`m${i}`));
    }

    expect(history.past).toHaveLength(50);
    expect(history.past[0].id).toBe('m1');
    expect(history.past.at(-1)?.id).toBe('m50');
  });

  it('undo returns null when there is no history', () => {
    const result = undo(createHistory(), createModel('current'));

    expect(result).toBeNull();
  });

  it('undo pops from past, returns previous model, and pushes current to future', () => {
    const modelA = createModel('a');
    const modelB = createModel('b');
    const history = pushHistory(createHistory(), modelA);

    const result = undo(history, modelB);

    expect(result).not.toBeNull();
    expect(result!.model.id).toBe('a');
    expect(result!.history.past).toEqual([]);
    expect(result!.history.future).toHaveLength(1);
    expect(result!.history.future[0].id).toBe('b');
    expect(canUndo(result!.history)).toBe(false);
    expect(canRedo(result!.history)).toBe(true);
  });

  it('redo returns null when there is no future history', () => {
    const result = redo(createHistory(), createModel('current'));

    expect(result).toBeNull();
  });

  it('redo shifts from future, restores next model, and pushes current to past', () => {
    const modelA = createModel('a');
    const modelB = createModel('b');
    const history = pushHistory(createHistory(), modelA);
    const undoResult = undo(history, modelB);

    expect(undoResult).not.toBeNull();

    const redoResult = redo(undoResult!.history, undoResult!.model);

    expect(redoResult).not.toBeNull();
    expect(redoResult!.model.id).toBe('b');
    expect(redoResult!.history.past).toHaveLength(1);
    expect(redoResult!.history.past[0].id).toBe('a');
    expect(redoResult!.history.future).toEqual([]);
    expect(canUndo(redoResult!.history)).toBe(true);
    expect(canRedo(redoResult!.history)).toBe(false);
  });

  it('stores deep-cloned snapshots so later mutations do not leak into history', () => {
    const original = createModel('orig');
    const pushed = pushHistory(createHistory(), original);

    original.name = 'mutated';
    const originalContainer = original.nodes.find((node): node is ContainerNode => node.kind === 'container');
    if (!originalContainer) {
      throw new Error('Expected container node in test model');
    }
    originalContainer.metadata = { nested: { value: 'changed' } };

    const undoResult = undo(pushed, createModel('current'));

    expect(undoResult).not.toBeNull();
    const undoContainer = undoResult!.model.nodes.find((node): node is ContainerNode => node.kind === 'container');
    if (!undoContainer) {
      throw new Error('Expected container node after undo');
    }
    expect(undoResult!.model.name).toBe('Architecture orig');
    expect(undoContainer.metadata).toEqual({ nested: { value: 'orig' } });

    const current = createModel('current-2');
    const withFuture = undo(pushHistory(createHistory(), createModel('prev')), current);

    expect(withFuture).not.toBeNull();

    current.name = 'current mutated after undo';
    const currentContainer = current.nodes.find((node): node is ContainerNode => node.kind === 'container');
    if (!currentContainer) {
      throw new Error('Expected container node in current model');
    }
    currentContainer.metadata = { nested: { value: 'mutated current' } };

    const redoResult = redo(withFuture!.history, withFuture!.model);

    expect(redoResult).not.toBeNull();
    const redoContainer = redoResult!.model.nodes.find((node): node is ContainerNode => node.kind === 'container');
    if (!redoContainer) {
      throw new Error('Expected container node after redo');
    }
    expect(redoResult!.model.name).toBe('Architecture current-2');
    expect(redoContainer.metadata).toEqual({ nested: { value: 'current-2' } });
  });

  it('resetHistory clears all stacks', () => {
    const model = createModel('x');
    const populated = pushHistory(createHistory(), model);

    const reset = resetHistory();

    expect(populated.past).toHaveLength(1);
    expect(reset).toEqual({ past: [], future: [] });
  });
});
