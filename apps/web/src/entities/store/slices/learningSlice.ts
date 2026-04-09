import type { Scenario, StepProgress } from '../../../shared/types/learning';
import type { ArchitectureSlice, ArchitectureState } from './types';

type LearningSlice = Pick<
  ArchitectureState,
  | 'activeScenario'
  | 'progress'
  | 'currentHintIndex'
  | 'isCurrentStepComplete'
  | 'startScenario'
  | 'advanceStep'
  | 'completeScenario'
  | 'showNextHint'
  | 'resetHints'
  | 'setStepComplete'
  | 'abandonScenario'
>;

export const createLearningSlice: ArchitectureSlice<LearningSlice> = (set, get) => ({
  activeScenario: null,
  progress: null,
  currentHintIndex: -1,
  isCurrentStepComplete: false,

  startScenario: (scenario: Scenario) => {
    const now = new Date().toISOString();
    const steps: StepProgress[] = scenario.steps.map((step, index) => ({
      stepId: step.id,
      status: index === 0 ? 'active' : 'locked',
      hintsUsed: 0,
    }));

    set({
      activeScenario: scenario,
      progress: {
        scenarioId: scenario.id,
        currentStepIndex: 0,
        steps,
        startedAt: now,
      },
      currentHintIndex: -1,
      isCurrentStepComplete: false,
    });
  },

  advanceStep: () => {
    const { activeScenario, progress } = get();
    if (!activeScenario || !progress) return;

    const nextIndex = progress.currentStepIndex + 1;
    const now = new Date().toISOString();

    const updatedSteps = progress.steps.map((step, index) => {
      if (index === progress.currentStepIndex) {
        return { ...step, status: 'completed' as const, completedAt: now };
      }
      if (index === nextIndex) {
        return { ...step, status: 'active' as const };
      }
      return step;
    });

    if (nextIndex >= activeScenario.steps.length) {
      set({
        progress: {
          ...progress,
          currentStepIndex: progress.currentStepIndex,
          steps: updatedSteps,
          completedAt: now,
        },
        currentHintIndex: -1,
        isCurrentStepComplete: false,
      });
      return;
    }

    set({
      progress: {
        ...progress,
        currentStepIndex: nextIndex,
        steps: updatedSteps,
      },
      currentHintIndex: -1,
      isCurrentStepComplete: false,
    });
  },

  completeScenario: () => {
    const { progress } = get();
    if (!progress) return;

    const now = new Date().toISOString();
    const updatedSteps = progress.steps.map((step) =>
      step.status === 'active' ? { ...step, status: 'completed' as const, completedAt: now } : step,
    );

    set({
      progress: {
        ...progress,
        steps: updatedSteps,
        completedAt: now,
      },
      isCurrentStepComplete: false,
      currentHintIndex: -1,
    });
  },

  showNextHint: () => {
    const { activeScenario, progress, currentHintIndex } = get();
    if (!activeScenario || !progress) return;

    const currentStep = activeScenario.steps[progress.currentStepIndex];
    if (!currentStep) return;

    const maxHintIndex = currentStep.hints.length - 1;
    if (currentHintIndex >= maxHintIndex) return;

    const nextIndex = currentHintIndex + 1;

    const updatedSteps = progress.steps.map((step, index) =>
      index === progress.currentStepIndex
        ? { ...step, hintsUsed: Math.max(step.hintsUsed, nextIndex + 1) }
        : step,
    );

    set({
      currentHintIndex: nextIndex,
      progress: {
        ...progress,
        steps: updatedSteps,
      },
    });
  },

  resetHints: () => {
    set({ currentHintIndex: -1 });
  },

  setStepComplete: (complete) => {
    set({ isCurrentStepComplete: complete });
  },

  abandonScenario: () => {
    set({
      activeScenario: null,
      progress: null,
      currentHintIndex: -1,
      isCurrentStepComplete: false,
    });
  },
});
