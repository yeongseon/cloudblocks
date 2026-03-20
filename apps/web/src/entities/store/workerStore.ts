import { create } from 'zustand';

export type WorkerState = 'idle' | 'moving' | 'building';

export interface BuildTask {
  blockId: string;
  targetPosition: [number, number, number];
  progress: number;
  startedAt: number;
}

interface WorkerStoreState {
  workerId: string;
  workerState: WorkerState;
  workerPosition: [number, number, number];
  buildQueue: BuildTask[];
  activeBuild: BuildTask | null;
  startBuild: (blockId: string, targetPosition: [number, number, number]) => void;
  tickBuildProgress: (deltaProgress: number) => void;
  completeBuild: () => void;
  cancelBuild: () => void;
  setWorkerPosition: (pos: [number, number, number]) => void;
  setWorkerState: (state: WorkerState) => void;
  clearQueue: () => void;
}

const createBuildTask = (
  blockId: string,
  targetPosition: [number, number, number]
): BuildTask => ({
  blockId,
  targetPosition,
  progress: 0,
  startedAt: Date.now(),
});

export const useWorkerStore = create<WorkerStoreState>((set, get) => ({
  workerId: 'worker-default',
  workerState: 'idle',
  workerPosition: [-3, 0, -6],
  buildQueue: [],
  activeBuild: null,

  startBuild: (blockId, targetPosition) => {
    const nextTask = createBuildTask(blockId, targetPosition);
    const { activeBuild } = get();

    if (activeBuild) {
      set((state) => ({ buildQueue: [...state.buildQueue, nextTask] }));
      return;
    }

    set({
      activeBuild: nextTask,
      workerState: 'moving',
    });
  },

  tickBuildProgress: (deltaProgress) => {
    const { workerState, activeBuild } = get();

    if (workerState !== 'building' || !activeBuild) {
      return;
    }

    const nextProgress = Math.min(1, Math.max(0, activeBuild.progress + deltaProgress));

    if (nextProgress >= 1) {
      get().completeBuild();
      return;
    }

    set({
      activeBuild: {
        ...activeBuild,
        progress: nextProgress,
      },
    });
  },

  completeBuild: () => {
    const { buildQueue } = get();

    if (buildQueue.length === 0) {
      set({
        activeBuild: null,
        workerState: 'idle',
      });
      return;
    }

    const [nextTask, ...remainingQueue] = buildQueue;

    set({
      activeBuild: nextTask,
      buildQueue: remainingQueue,
      workerState: 'moving',
    });
  },

  cancelBuild: () => {
    set({
      activeBuild: null,
      workerState: 'idle',
    });
  },

  setWorkerPosition: (pos) => {
    set({ workerPosition: pos });
  },

  setWorkerState: (state) => {
    set({ workerState: state });
  },

  clearQueue: () => {
    set({
      buildQueue: [],
      activeBuild: null,
      workerState: 'idle',
    });
  },
}));
