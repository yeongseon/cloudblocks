import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArchitectureModel } from '@cloudblocks/schema';

const { uuidState } = vi.hoisted(() => ({
  uuidState: { counter: 0 },
}));
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    const n = ++uuidState.counter;
    return n.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
  }),
}));

import { useArchitectureStore } from '../architectureStore';
import { useUIStore } from '../uiStore';

function getState() {
  return useArchitectureStore.getState();
}

function buildFreshWorkspace() {
  const now = new Date().toISOString();
  return {
    id: 'ws-test',
    name: 'My Architecture',
    architecture: {
      id: 'arch-test',
      name: 'My Architecture',
      version: '2',
      nodes: [] as ArchitectureModel['nodes'],
      connections: [] as ArchitectureModel['connections'],
      endpoints: [],
      externalActors: [
        {
          id: 'ext-internet',
          name: 'Internet',
          type: 'internet' as const,
          position: { x: -3, y: 0, z: 5 },
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe('workspaceSlice – setLastPrResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'));
    localStorage.clear();
    uuidState.counter = 0;
    useArchitectureStore.setState({
      workspace: buildFreshWorkspace(),
      workspaces: [],
      validationResult: null,
      canUndo: false,
      canRedo: false,
    });
    useUIStore.getState().clearDiffState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets lastPrResult on the current workspace when workspaceId matches', () => {
    const wsId = getState().workspace.id;
    const prResult = {
      url: 'https://github.com/owner/repo/pull/42',
      number: 42,
      branch: 'feat/add-networking',
      createdAt: '2026-01-15T00:00:00.000Z',
    };

    getState().setLastPrResult(wsId, prResult);

    expect(getState().workspace.lastPrResult).toEqual(prResult);
  });

  it('does not modify current workspace when workspaceId does not match', () => {
    getState().createWorkspace('Second');
    const secondId = getState().workspace.id;
    const firstId = getState().workspaces.find((ws) => ws.id !== secondId)!.id;

    const prResult = {
      url: 'https://github.com/owner/repo/pull/99',
      number: 99,
      branch: 'fix/bug',
      createdAt: '2026-01-15T00:00:00.000Z',
    };

    getState().setLastPrResult(firstId, prResult);

    expect(getState().workspace.lastPrResult).toBeUndefined();
    expect(getState().workspace.id).toBe(secondId);

    const firstInList = getState().workspaces.find((ws) => ws.id === firstId);
    expect(firstInList?.lastPrResult).toEqual(prResult);
  });

  it('persists the update to storage via saveWorkspaces', () => {
    const spy = vi.spyOn(localStorage, 'setItem');
    const wsId = getState().workspace.id;
    const prResult = {
      url: 'https://github.com/owner/repo/pull/7',
      number: 7,
      branch: 'chore/release',
      createdAt: '2026-01-15T00:00:00.000Z',
    };

    getState().setLastPrResult(wsId, prResult);

    const workspaceCalls = spy.mock.calls.filter(([k]) => k === 'cloudblocks:workspaces');
    expect(workspaceCalls.length).toBeGreaterThan(0);
    spy.mockRestore();
  });

  it('does not update any workspace when id matches none', () => {
    const prResult = {
      url: 'https://github.com/owner/repo/pull/55',
      number: 55,
      branch: 'no-match',
      createdAt: '2026-01-15T00:00:00.000Z',
    };

    getState().setLastPrResult('non-existent-id', prResult);

    expect(getState().workspace.lastPrResult).toBeUndefined();
  });
});
