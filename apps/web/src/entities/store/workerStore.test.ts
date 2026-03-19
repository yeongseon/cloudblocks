import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkerStore } from './workerStore';

const resetStore = () => {
  useWorkerStore.setState({
    workerId: 'worker-default',
    workerState: 'idle',
    workerPosition: [0, 0, 0],
    buildQueue: [],
    activeBuild: null,
  });
};

describe('workerStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('has expected initial state', () => {
    const state = useWorkerStore.getState();

    expect(state.workerId).toBe('worker-default');
    expect(state.workerState).toBe('idle');
    expect(state.workerPosition).toEqual([0, 0, 0]);
    expect(state.buildQueue).toEqual([]);
    expect(state.activeBuild).toBeNull();
  });

  it('startBuild sets active build and moving state when no active build exists', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    useWorkerStore.getState().startBuild('block-1', [1, 2, 3]);
    const state = useWorkerStore.getState();

    expect(state.workerState).toBe('moving');
    expect(state.activeBuild).toEqual({
      blockId: 'block-1',
      targetPosition: [1, 2, 3],
      progress: 0,
      startedAt: 1700000000000,
    });
    expect(state.buildQueue).toEqual([]);

    nowSpy.mockRestore();
  });

  it('startBuild enqueues task when active build exists', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const store = useWorkerStore.getState();
    store.startBuild('block-1', [1, 2, 3]);
    store.startBuild('block-2', [4, 5, 6]);
    const state = useWorkerStore.getState();

    expect(state.activeBuild?.blockId).toBe('block-1');
    expect(state.buildQueue).toHaveLength(1);
    expect(state.buildQueue[0]).toEqual({
      blockId: 'block-2',
      targetPosition: [4, 5, 6],
      progress: 0,
      startedAt: 1700000000000,
    });

    nowSpy.mockRestore();
  });

  it('tickBuildProgress increments active build progress', () => {
    const store = useWorkerStore.getState();

    store.startBuild('block-1', [1, 1, 1]);
    store.setWorkerState('building');
    store.tickBuildProgress(0.25);

    expect(useWorkerStore.getState().activeBuild?.progress).toBe(0.25);
  });

  it('tickBuildProgress auto-completes when progress reaches one or more', () => {
    const store = useWorkerStore.getState();

    store.startBuild('block-1', [1, 1, 1]);
    store.setWorkerState('building');
    store.tickBuildProgress(1);

    const state = useWorkerStore.getState();
    expect(state.activeBuild).toBeNull();
    expect(state.workerState).toBe('idle');
  });

  it('tickBuildProgress is a no-op when worker is not building', () => {
    const store = useWorkerStore.getState();

    store.startBuild('block-1', [1, 1, 1]);
    store.tickBuildProgress(0.5);

    expect(useWorkerStore.getState().activeBuild?.progress).toBe(0);
  });

  it('completeBuild dequeues next task and sets moving state', () => {
    const store = useWorkerStore.getState();

    store.startBuild('block-1', [1, 1, 1]);
    store.startBuild('block-2', [2, 2, 2]);
    store.completeBuild();

    const state = useWorkerStore.getState();
    expect(state.activeBuild?.blockId).toBe('block-2');
    expect(state.buildQueue).toEqual([]);
    expect(state.workerState).toBe('moving');
  });

  it('completeBuild sets idle when queue is empty', () => {
    const store = useWorkerStore.getState();

    store.startBuild('block-1', [1, 1, 1]);
    store.completeBuild();

    const state = useWorkerStore.getState();
    expect(state.activeBuild).toBeNull();
    expect(state.workerState).toBe('idle');
  });

  it('cancelBuild clears active build and does not dequeue next task', () => {
    const store = useWorkerStore.getState();

    store.startBuild('block-1', [1, 1, 1]);
    store.startBuild('block-2', [2, 2, 2]);
    store.cancelBuild();

    const state = useWorkerStore.getState();
    expect(state.activeBuild).toBeNull();
    expect(state.workerState).toBe('idle');
    expect(state.buildQueue).toHaveLength(1);
    expect(state.buildQueue[0].blockId).toBe('block-2');
  });

  it('clearQueue resets queue and worker state', () => {
    const store = useWorkerStore.getState();

    store.startBuild('block-1', [1, 1, 1]);
    store.startBuild('block-2', [2, 2, 2]);
    store.setWorkerState('building');
    store.clearQueue();

    const state = useWorkerStore.getState();
    expect(state.activeBuild).toBeNull();
    expect(state.buildQueue).toEqual([]);
    expect(state.workerState).toBe('idle');
  });

  it('setWorkerPosition updates worker position', () => {
    const store = useWorkerStore.getState();

    store.setWorkerPosition([9, 8, 7]);

    expect(useWorkerStore.getState().workerPosition).toEqual([9, 8, 7]);
  });

  it('setWorkerState updates worker state', () => {
    const store = useWorkerStore.getState();

    store.setWorkerState('moving');

    expect(useWorkerStore.getState().workerState).toBe('moving');
  });
});
