import { describe, expect, it, vi } from 'vitest';
import type { ArchitectureModel } from '@cloudblocks/schema';

import { createHistorySlice } from './historySlice';
import { createHistory } from '../../../shared/utils/history';

function makeArchitecture(): ArchitectureModel {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'arch-test',
    name: 'Architecture',
    version: '1',
    nodes: [],
    connections: [],
    endpoints: [],
    externalActors: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe('createHistorySlice', () => {
  it('returns early from undo when history has no past snapshots', () => {
    const set = vi.fn();
    const state = {
      history: createHistory(),
      workspace: {
        architecture: makeArchitecture(),
      },
    };
    const get = vi.fn(() => state);

    const slice = createHistorySlice(
      set as unknown as Parameters<typeof createHistorySlice>[0],
      get as unknown as Parameters<typeof createHistorySlice>[1],
      undefined as unknown as Parameters<typeof createHistorySlice>[2],
    );

    slice.undo();

    expect(get).toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });
});
