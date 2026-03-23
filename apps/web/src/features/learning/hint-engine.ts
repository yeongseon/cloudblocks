import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useLearningStore } from '../../entities/store/learningStore';

const DEFAULT_IDLE_MS = 30000;

let hintTimerId: ReturnType<typeof setTimeout> | null = null;
let hintIdleMs = DEFAULT_IDLE_MS;
let architectureUnsubscribe: (() => void) | null = null;
let learningUnsubscribe: (() => void) | null = null;

function getCurrentStepHintCount(): number {
  const { activeScenario, progress } = useLearningStore.getState();

  if (!activeScenario || !progress) {
    return 0;
  }

  const currentStep = activeScenario.steps[progress.currentStepIndex];
  return currentStep?.hints.length ?? 0;
}

function hasHintsRemaining(): boolean {
  const { currentHintIndex } = useLearningStore.getState();
  const hintCount = getCurrentStepHintCount();
  return currentHintIndex < hintCount - 1;
}

function scheduleHintTimer(): void {
  hintTimerId = setTimeout(() => {
    const state = useLearningStore.getState();

    if (state.isCurrentStepComplete || !hasHintsRemaining()) {
      stopHintTimer();
      return;
    }

    state.showNextHint();

    const nextState = useLearningStore.getState();
    if (nextState.isCurrentStepComplete || !hasHintsRemaining()) {
      stopHintTimer();
      return;
    }

    scheduleHintTimer();
  }, hintIdleMs);
}

export function startHintTimer(idleMs: number = DEFAULT_IDLE_MS): void {
  hintIdleMs = idleMs;
  stopHintTimer();

  const state = useLearningStore.getState();
  if (state.isCurrentStepComplete || !hasHintsRemaining()) {
    return;
  }

  scheduleHintTimer();
}

export function resetHintTimer(): void {
  startHintTimer(hintIdleMs);
}

export function stopHintTimer(): void {
  if (hintTimerId) {
    clearTimeout(hintTimerId);
    hintTimerId = null;
  }
}

export function startHintSubscription(): void {
  if (!architectureUnsubscribe) {
    architectureUnsubscribe = useArchitectureStore.subscribe((state, prevState) => {
      const archChanged = state.workspace.architecture !== prevState.workspace.architecture;

      if (archChanged) {
        resetHintTimer();
      }
    });
  }

  if (!learningUnsubscribe) {
    learningUnsubscribe = useLearningStore.subscribe((state, prevState) => {
      if (!prevState.isCurrentStepComplete && state.isCurrentStepComplete) {
        stopHintTimer();
      }
    });
  }
}

export function stopHintSubscription(): void {
  if (architectureUnsubscribe) {
    architectureUnsubscribe();
    architectureUnsubscribe = null;
  }

  if (learningUnsubscribe) {
    learningUnsubscribe();
    learningUnsubscribe = null;
  }

  stopHintTimer();
}

export function isHintTimerRunning(): boolean {
  return hintTimerId !== null;
}
