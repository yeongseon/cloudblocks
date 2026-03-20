import { create } from 'zustand';

export type WorkerState = 'idle' | 'moving' | 'building';

export const IDLE_POSITION: [number, number, number] = [-3, 0, -6];

export const BUILD_DURATION_MS = 1500;

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
  resetWorker: () => void;
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
  workerPosition: IDLE_POSITION,
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
      workerPosition: targetPosition,
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
        workerPosition: IDLE_POSITION,
      });
      return;
    }

    const [nextTask, ...remainingQueue] = buildQueue;

    set({
      activeBuild: nextTask,
      buildQueue: remainingQueue,
      workerState: 'moving',
      workerPosition: nextTask.targetPosition,
    });
  },

  cancelBuild: () => {
    set({
      buildQueue: [],
      activeBuild: null,
      workerState: 'idle',
    });
  },

  setWorkerPosition: (pos) => {
    set({ workerPosition: pos });
  },

  resetWorker: () => {
    set({
      workerState: 'idle',
      workerPosition: IDLE_POSITION,
      buildQueue: [],
      activeBuild: null,
    });
  },
}));
