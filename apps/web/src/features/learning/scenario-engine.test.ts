import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useLearningStore } from '../../entities/store/learningStore';
import { useUIStore } from '../../entities/store/uiStore';
import {
  startLearningScenario,
  advanceToNextStep,
  resetCurrentStep,
  abandonLearning,
  startValidationSubscription,
  stopValidationSubscription,
  getCurrentStepRules,
  getValidationDetails,
} from './scenario-engine';
import * as hintEngine from './hint-engine';
import { registerBuiltinScenarios } from './scenarios/builtin';
import { clearScenarioRegistry, getScenario } from './scenarios/registry';
import type { ArchitectureSnapshot } from '../../shared/types/learning';

const EMPTY_ARCHITECTURE: ArchitectureSnapshot = {
  name: 'Empty Test Architecture',
  version: '1',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
};

function resetLearningStore(): void {
  useLearningStore.setState({
    activeScenario: null,
    progress: null,
    currentHintIndex: -1,
    isCurrentStepComplete: false,
  });
}

function resetUIStore(): void {
  useUIStore.setState({
    selectedId: null,
    toolMode: 'select',
    connectionSource: null,
    draggedBlockCategory: null,
    draggedResourceName: null,
    showBlockPalette: true,
    showProperties: true,
    showValidation: false,
    showCodePreview: false,
    showWorkspaceManager: false,
    showTemplateGallery: false,
    showGitHubLogin: false,
    showGitHubRepos: false,
    showGitHubSync: false,
    showGitHubPR: false,
    editorMode: 'build',
    showLearningPanel: false,
    showScenarioGallery: false,
  });
}

function resetArchitectureStore(): void {
  const state = useArchitectureStore.getState();
  state.resetWorkspace();
  useArchitectureStore.setState({ workspaces: [] });
  state.replaceArchitecture(EMPTY_ARCHITECTURE);
}

function resetStores(): void {
  stopValidationSubscription();
  resetLearningStore();
  resetUIStore();
  resetArchitectureStore();
}

function architectureSnapshot(): ArchitectureSnapshot {
  const architecture = useArchitectureStore.getState().workspace.architecture;
  return {
    name: architecture.name,
    version: architecture.version,
    plates: architecture.plates,
    blocks: architecture.blocks,
    connections: architecture.connections,
    externalActors: architecture.externalActors,
  };
}

function completeCurrentStepAndAdvance(): void {
  useLearningStore.getState().setStepComplete(true);
  advanceToNextStep();
}

describe('scenario-engine', () => {
  beforeEach(() => {
    registerBuiltinScenarios();
    resetStores();
  });

  afterEach(() => {
    stopValidationSubscription();
    clearScenarioRegistry();
    resetStores();
  });

  describe('startLearningScenario', () => {
    it('throws error for unknown scenario ID', () => {
      expect(() => startLearningScenario('missing-scenario')).toThrow(
        'Scenario not found: missing-scenario'
      );
    });

    it('sets architecture from scenario initialArchitecture via replaceArchitecture', () => {
      const scenario = getScenario('scenario-three-tier');
      expect(scenario).toBeDefined();

      startLearningScenario('scenario-three-tier');

      expect(architectureSnapshot()).toEqual(scenario?.initialArchitecture);
    });

    it('sets editor mode to learn', () => {
      startLearningScenario('scenario-three-tier');

      expect(useUIStore.getState().editorMode).toBe('learn');
    });

    it('calls startScenario on learning store', () => {
      const startScenarioSpy = vi.spyOn(useLearningStore.getState(), 'startScenario');

      startLearningScenario('scenario-three-tier');

      expect(startScenarioSpy).toHaveBeenCalledOnce();
      expect(useLearningStore.getState().activeScenario?.id).toBe('scenario-three-tier');
      startScenarioSpy.mockRestore();
    });

    it('opens learning panel when it is closed', () => {
      expect(useUIStore.getState().showLearningPanel).toBe(false);

      startLearningScenario('scenario-three-tier');

      expect(useUIStore.getState().showLearningPanel).toBe(true);
    });

    it('starts validation subscription', () => {
      startLearningScenario('scenario-three-tier');

      useArchitectureStore.getState().replaceArchitecture({
        ...EMPTY_ARCHITECTURE,
        name: 'With Network',
        plates: [
          {
            id: 'test-network',
            name: 'VNet',
            type: 'region',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
      });

      expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    });

    it('evaluates initial step completion immediately', () => {
      useArchitectureStore.getState().replaceArchitecture({
        ...EMPTY_ARCHITECTURE,
        name: 'Prepopulated',
        plates: [
          {
            id: 'existing-network',
            name: 'Old Network',
            type: 'region',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
      });

      startLearningScenario('scenario-three-tier');

      expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);
    });
  });

  describe('advanceToNextStep', () => {
    it('no-ops when no active scenario', () => {
      const before = useLearningStore.getState();

      advanceToNextStep();

      expect(useLearningStore.getState().activeScenario).toBe(before.activeScenario);
      expect(useLearningStore.getState().progress).toBe(before.progress);
    });

    it('no-ops when current step is not complete', () => {
      startLearningScenario('scenario-three-tier');

      const before = useLearningStore.getState().progress?.currentStepIndex;

      advanceToNextStep();

      expect(useLearningStore.getState().progress?.currentStepIndex).toBe(before);
    });

    it('no-ops when progress points to a missing current step', () => {
      startLearningScenario('scenario-three-tier');
      const progress = useLearningStore.getState().progress;
      if (!progress) {
        throw new Error('Expected progress');
      }

      useLearningStore.setState({
        isCurrentStepComplete: true,
        progress: {
          ...progress,
          currentStepIndex: 999,
        },
      });

      advanceToNextStep();

      expect(useLearningStore.getState().progress?.currentStepIndex).toBe(999);
      expect(useLearningStore.getState().progress?.completedAt).toBeUndefined();
    });

    it('advances to next step when current step is complete', () => {
      startLearningScenario('scenario-three-tier');

      completeCurrentStepAndAdvance();

      expect(useLearningStore.getState().progress?.currentStepIndex).toBe(1);
    });

    it('completes scenario on last step', () => {
      startLearningScenario('scenario-three-tier');

      const scenario = useLearningStore.getState().activeScenario;
      expect(scenario).not.toBeNull();

      for (let i = 0; i < (scenario?.steps.length ?? 1) - 1; i += 1) {
        completeCurrentStepAndAdvance();
      }

      completeCurrentStepAndAdvance();

      const progress = useLearningStore.getState().progress;
      expect(progress?.completedAt).toBeDefined();
      expect(progress?.currentStepIndex).toBe((scenario?.steps.length ?? 1) - 1);
    });

    it('resets hints on advance', () => {
      startLearningScenario('scenario-three-tier');
      useLearningStore.getState().showNextHint();
      expect(useLearningStore.getState().currentHintIndex).toBe(0);

      completeCurrentStepAndAdvance();

      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
    });
  });

  describe('resetCurrentStep', () => {
    it('no-ops when no active scenario', () => {
      useArchitectureStore.getState().replaceArchitecture({
        ...EMPTY_ARCHITECTURE,
        name: 'No Scenario Architecture',
      });
      const before = architectureSnapshot();

      resetCurrentStep();

      expect(architectureSnapshot()).toEqual(before);
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
    });

    it('restores checkpoint architecture when step has checkpoint', () => {
      startLearningScenario('scenario-three-tier');

      completeCurrentStepAndAdvance();
      const checkpoint = useLearningStore.getState().activeScenario?.steps[1].checkpoint;
      expect(checkpoint).toBeDefined();

      useArchitectureStore.getState().replaceArchitecture({
        ...EMPTY_ARCHITECTURE,
        name: 'Mutated Architecture',
      });

      resetCurrentStep();

      expect(architectureSnapshot()).toEqual(checkpoint);
    });

    it('restores auto-captured snapshot when step has no explicit checkpoint', () => {
      startLearningScenario('scenario-three-tier');
      const initial = architectureSnapshot();

      // Mutate architecture after starting
      useArchitectureStore.getState().replaceArchitecture({
        ...initial,
        name: 'User Mutation',
      });

      resetCurrentStep();

      expect(architectureSnapshot()).toEqual(initial);
    });

    it('resets hints', () => {
      startLearningScenario('scenario-three-tier');
      useLearningStore.getState().showNextHint();
      expect(useLearningStore.getState().currentHintIndex).toBe(0);

      resetCurrentStep();

      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
    });

    it('no-ops when progress points to a missing current step', () => {
      startLearningScenario('scenario-three-tier');
      const progress = useLearningStore.getState().progress;
      if (!progress) {
        throw new Error('Expected progress');
      }

      useLearningStore.setState({
        currentHintIndex: 1,
        progress: {
          ...progress,
          currentStepIndex: 999,
        },
      });

      resetCurrentStep();

      expect(useLearningStore.getState().currentHintIndex).toBe(1);
      expect(useLearningStore.getState().progress?.currentStepIndex).toBe(999);
    });
  });

  describe('abandonLearning', () => {
    it('clears learning store via abandonScenario', () => {
      startLearningScenario('scenario-three-tier');
      const abandonSpy = vi.spyOn(useLearningStore.getState(), 'abandonScenario');

      abandonLearning();

      expect(abandonSpy).toHaveBeenCalledOnce();
      const state = useLearningStore.getState();
      expect(state.activeScenario).toBeNull();
      expect(state.progress).toBeNull();
      expect(state.currentHintIndex).toBe(-1);
      expect(state.isCurrentStepComplete).toBe(false);
      abandonSpy.mockRestore();
    });

    it('sets editor mode to build', () => {
      startLearningScenario('scenario-three-tier');

      abandonLearning();

      expect(useUIStore.getState().editorMode).toBe('build');
    });

    it('hides learning panel', () => {
      startLearningScenario('scenario-three-tier');
      expect(useUIStore.getState().showLearningPanel).toBe(true);

      abandonLearning();

      expect(useUIStore.getState().showLearningPanel).toBe(false);
    });

    it('stops validation subscription', () => {
      startLearningScenario('scenario-three-tier');
      useLearningStore.getState().setStepComplete(true);

      abandonLearning();

      useArchitectureStore.getState().replaceArchitecture({
        ...EMPTY_ARCHITECTURE,
        name: 'After abandon',
      });

      expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);
    });
  });

  describe('getCurrentStepRules', () => {
    it('returns empty array when no active scenario', () => {
      expect(getCurrentStepRules()).toEqual([]);
    });

    it('returns rules for current step', () => {
      startLearningScenario('scenario-three-tier');

      const currentRules = getCurrentStepRules();
      const expected = useLearningStore.getState().activeScenario?.steps[0].validationRules ?? [];

      expect(currentRules).toEqual(expected);
    });
  });

  describe('getValidationDetails', () => {
    it('returns { passed: false, results: [] } when no active scenario', () => {
      expect(getValidationDetails()).toEqual({ passed: false, results: [] });
    });

    it('returns evaluation results for current step rules against architecture', () => {
      startLearningScenario('scenario-three-tier');

      const result = getValidationDetails();

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.rule.type).toBe('plate-exists');
      expect(result.passed).toBe(false);
    });

    it('returns empty failing result when current step is missing', () => {
      startLearningScenario('scenario-three-tier');
      const progress = useLearningStore.getState().progress;
      if (!progress) {
        throw new Error('Expected progress');
      }

      useLearningStore.setState({
        progress: {
          ...progress,
          currentStepIndex: 999,
        },
      });

      expect(getValidationDetails()).toEqual({ passed: false, results: [] });
    });
  });

  describe('startValidationSubscription', () => {
    it("multiple calls to start don't duplicate subscriptions", () => {
      startLearningScenario('scenario-three-tier');
      const setStepCompleteSpy = vi.spyOn(useLearningStore.getState(), 'setStepComplete');

      startValidationSubscription();
      startValidationSubscription();

      useArchitectureStore.getState().replaceArchitecture({
        ...EMPTY_ARCHITECTURE,
        name: 'After duplicate start',
      });

      expect(setStepCompleteSpy).toHaveBeenCalledTimes(1);
      setStepCompleteSpy.mockRestore();
    });

    it('sets step completion false when architecture changes without active scenario', () => {
      startLearningScenario('scenario-three-tier');
      useLearningStore.setState({ isCurrentStepComplete: true });
      useLearningStore.setState({ activeScenario: null, progress: null });

      useArchitectureStore.getState().replaceArchitecture({
        ...EMPTY_ARCHITECTURE,
        name: 'No active scenario architecture',
      });

      expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);
    });
  });

  describe('stopValidationSubscription', () => {
    it('stop clears the subscription', () => {
      startLearningScenario('scenario-three-tier');

      stopValidationSubscription();
      stopValidationSubscription();
      startValidationSubscription();

      useArchitectureStore.getState().replaceArchitecture({
        ...EMPTY_ARCHITECTURE,
        name: 'After stop',
        plates: [
          {
            id: 'restart-network',
            name: 'VNet',
            type: 'region',
            parentId: null,
            children: [],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
        ],
      });

      expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    });
  });

  describe('hint engine wiring', () => {
    let startHintSubSpy: ReturnType<typeof vi.spyOn>;
    let stopHintSubSpy: ReturnType<typeof vi.spyOn>;
    let startHintTimerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      startHintSubSpy = vi.spyOn(hintEngine, 'startHintSubscription');
      stopHintSubSpy = vi.spyOn(hintEngine, 'stopHintSubscription');
      startHintTimerSpy = vi.spyOn(hintEngine, 'startHintTimer');
    });

    afterEach(() => {
      startHintSubSpy.mockRestore();
      stopHintSubSpy.mockRestore();
      startHintTimerSpy.mockRestore();
    });

    it('startLearningScenario calls startHintSubscription and startHintTimer', () => {
      startLearningScenario('scenario-three-tier');

      expect(startHintSubSpy).toHaveBeenCalledOnce();
      expect(startHintTimerSpy).toHaveBeenCalledOnce();
    });

    it('advanceToNextStep calls startHintTimer on non-last step', () => {
      startLearningScenario('scenario-three-tier');
      startHintTimerSpy.mockClear();

      completeCurrentStepAndAdvance();

      expect(startHintTimerSpy).toHaveBeenCalledOnce();
    });

    it('advanceToNextStep calls stopHintSubscription on last step', () => {
      startLearningScenario('scenario-three-tier');
      stopHintSubSpy.mockClear();

      const scenario = useLearningStore.getState().activeScenario;
      for (let i = 0; i < (scenario?.steps.length ?? 1) - 1; i += 1) {
        completeCurrentStepAndAdvance();
      }
      stopHintSubSpy.mockClear();

      completeCurrentStepAndAdvance();

      expect(stopHintSubSpy).toHaveBeenCalledOnce();
    });

    it('resetCurrentStep calls startHintTimer', () => {
      startLearningScenario('scenario-three-tier');
      startHintTimerSpy.mockClear();

      resetCurrentStep();

      expect(startHintTimerSpy).toHaveBeenCalledOnce();
    });

    it('abandonLearning calls stopHintSubscription', () => {
      startLearningScenario('scenario-three-tier');
      stopHintSubSpy.mockClear();

      abandonLearning();

      expect(stopHintSubSpy).toHaveBeenCalledOnce();
    });
  });
});
