import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useLearningStore } from '../../entities/store/learningStore';
import type { ArchitectureSnapshot, Scenario } from '../../shared/types/learning';
import {
  isHintTimerRunning,
  resetHintTimer,
  startHintSubscription,
  startHintTimer,
  stopHintSubscription,
  stopHintTimer,
} from './hint-engine';

const ARCHITECTURE_SNAPSHOT: ArchitectureSnapshot = {
  name: 'Hint Test',
  version: '1',
  nodes: [],
  connections: [],
  externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
};

function createScenarioWithHints(hints: string[] = ['Hint 1', 'Hint 2', 'Hint 3']): Scenario {
  return {
    id: 'hint-test',
    name: 'Hint Test',
    description: 'Test scenario for hints',
    difficulty: 'beginner',
    category: 'web-application',
    tags: [],
    estimatedMinutes: 5,
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Step 1',
        instruction: 'Do something',
        hints,
        validationRules: [{ type: 'plate-exists', plateType: 'region' }],
      },
    ],
    initialArchitecture: ARCHITECTURE_SNAPSHOT,
  };
}

function resetStores(): void {
  useLearningStore.setState({
    activeScenario: null,
    progress: null,
    currentHintIndex: -1,
    isCurrentStepComplete: false,
  });

  useArchitectureStore.getState().replaceArchitecture(ARCHITECTURE_SNAPSHOT);
}

function startScenario(hints: string[] = ['Hint 1', 'Hint 2', 'Hint 3']): void {
  useLearningStore.getState().startScenario(createScenarioWithHints(hints));
}

describe('hint-engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopHintSubscription();
    stopHintTimer();
    resetStores();
  });

  afterEach(() => {
    stopHintSubscription();
    stopHintTimer();
    resetStores();
    vi.useRealTimers();
  });

  describe('startHintTimer', () => {
    it('sets timer as running', () => {
      startScenario();

      startHintTimer();

      expect(isHintTimerRunning()).toBe(true);
    });

    it('shows first hint after default idle period', () => {
      startScenario();

      startHintTimer();
      vi.advanceTimersByTime(29999);
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);

      vi.advanceTimersByTime(1);
      expect(useLearningStore.getState().currentHintIndex).toBe(0);
    });

    it('chains hints across idle windows and stops after final hint', () => {
      startScenario(['Hint 1', 'Hint 2', 'Hint 3']);

      startHintTimer();

      vi.advanceTimersByTime(30000);
      expect(useLearningStore.getState().currentHintIndex).toBe(0);
      expect(isHintTimerRunning()).toBe(true);

      vi.advanceTimersByTime(30000);
      expect(useLearningStore.getState().currentHintIndex).toBe(1);
      expect(isHintTimerRunning()).toBe(true);

      vi.advanceTimersByTime(30000);
      expect(useLearningStore.getState().currentHintIndex).toBe(2);
      expect(isHintTimerRunning()).toBe(false);
    });

    it('does not start timer when step is already complete', () => {
      startScenario();
      useLearningStore.getState().setStepComplete(true);

      startHintTimer();

      expect(isHintTimerRunning()).toBe(false);
    });

    it('does not start timer when no hints remain', () => {
      startScenario(['Only hint']);
      useLearningStore.getState().showNextHint();

      startHintTimer();

      expect(isHintTimerRunning()).toBe(false);
    });

    it('respects custom idle interval', () => {
      startScenario();

      startHintTimer(1200);

      vi.advanceTimersByTime(1199);
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);

      vi.advanceTimersByTime(1);
      expect(useLearningStore.getState().currentHintIndex).toBe(0);
    });
  });

  describe('resetHintTimer', () => {
    it('restarts the timer countdown', () => {
      startScenario();

      startHintTimer();
      vi.advanceTimersByTime(25000);
      resetHintTimer();

      vi.advanceTimersByTime(5000);
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);

      vi.advanceTimersByTime(25000);
      expect(useLearningStore.getState().currentHintIndex).toBe(0);
    });

    it('cancels previous timer schedule', () => {
      startScenario();

      startHintTimer(1000);
      vi.advanceTimersByTime(900);
      resetHintTimer();

      vi.advanceTimersByTime(100);
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);

      vi.advanceTimersByTime(900);
      expect(useLearningStore.getState().currentHintIndex).toBe(0);
    });
  });

  describe('stopHintTimer', () => {
    it('clears the timer', () => {
      startScenario();

      startHintTimer();
      stopHintTimer();

      expect(isHintTimerRunning()).toBe(false);
    });

    it('prevents hints from showing after stop', () => {
      startScenario();

      startHintTimer();
      stopHintTimer();
      vi.advanceTimersByTime(30000);

      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
    });
  });

  describe('startHintSubscription', () => {
    it('resets timer on architecture change', () => {
      startScenario();
      startHintSubscription();
      startHintTimer(1000);

      vi.advanceTimersByTime(900);
      useArchitectureStore.getState().replaceArchitecture({
        ...ARCHITECTURE_SNAPSHOT,
        name: 'Hint Test Updated',
      });

      vi.advanceTimersByTime(100);
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);

      vi.advanceTimersByTime(900);
      expect(useLearningStore.getState().currentHintIndex).toBe(0);
    });

    it('stops timer when step becomes complete', () => {
      startScenario();
      startHintSubscription();
      startHintTimer();

      useLearningStore.getState().setStepComplete(true);

      expect(isHintTimerRunning()).toBe(false);
    });

    it('does not duplicate subscriptions across repeated start calls', () => {
      startScenario();
      startHintSubscription();
      startHintSubscription();
      stopHintSubscription();

      useArchitectureStore.getState().replaceArchitecture({
        ...ARCHITECTURE_SNAPSHOT,
        version: '2',
      });

      expect(isHintTimerRunning()).toBe(false);
    });
  });

  describe('stopHintSubscription', () => {
    it('cleans up architecture subscription', () => {
      startScenario();
      startHintSubscription();
      stopHintSubscription();

      useArchitectureStore.getState().replaceArchitecture({
        ...ARCHITECTURE_SNAPSHOT,
        name: 'No reset after unsubscribe',
      });

      expect(isHintTimerRunning()).toBe(false);
    });

    it('cleans up learning subscription', () => {
      startScenario();
      startHintSubscription();
      stopHintSubscription();

      startHintTimer();

      useLearningStore.getState().setStepComplete(true);

      expect(isHintTimerRunning()).toBe(true);
    });

    it('stops the running hint timer', () => {
      startScenario();
      startHintSubscription();
      startHintTimer();

      stopHintSubscription();

      expect(isHintTimerRunning()).toBe(false);
    });
  });

  describe('isHintTimerRunning', () => {
    it('returns false initially', () => {
      expect(isHintTimerRunning()).toBe(false);
    });

    it('returns true after startHintTimer', () => {
      startScenario();

      startHintTimer();

      expect(isHintTimerRunning()).toBe(true);
    });

    it('returns false after stopHintTimer', () => {
      startScenario();

      startHintTimer();
      stopHintTimer();

      expect(isHintTimerRunning()).toBe(false);
    });
  });
});
