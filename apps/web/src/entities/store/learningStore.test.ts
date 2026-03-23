import { describe, it, expect, beforeEach } from 'vitest';
import type { Scenario } from '../../shared/types/learning';
import { useLearningStore } from './learningStore';

function createTestScenario(): Scenario {
  return {
    id: 'scenario-1',
    name: 'Three-Tier Foundations',
    description: 'Build and validate a simple three-tier architecture.',
    difficulty: 'beginner',
    category: 'web-application',
    tags: ['network', 'compute', 'data'],
    estimatedMinutes: 20,
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'Create network',
        instruction: 'Create a network plate.',
        hints: ['Use the plate tool.', 'Choose network as plate type.'],
        validationRules: [{ type: 'plate-exists', plateType: 'region' }],
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Add compute',
        instruction: 'Place a compute block in a subnet.',
        hints: ['Subnets can be public or private.', 'Use compute category.'],
        validationRules: [
          {
            type: 'block-exists',
            category: 'compute',
          },
        ],
      },
      {
        id: 'step-3',
        order: 3,
        title: 'Validate architecture',
        instruction: 'Run validation and ensure architecture is valid.',
        hints: ['Open validation panel.', 'Fix all errors before continuing.'],
        validationRules: [{ type: 'architecture-valid' }],
      },
    ],
    initialArchitecture: {
      name: 'Learning Workspace',
      version: '1',
      nodes: [],
      connections: [],
      endpoints: [],
      externalActors: [
        { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
      ],
    },
  };
}

describe('useLearningStore', () => {
  beforeEach(() => {
    useLearningStore.setState({
      activeScenario: null,
      progress: null,
      currentHintIndex: -1,
      isCurrentStepComplete: false,
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useLearningStore.getState();
      expect(state.activeScenario).toBe(null);
      expect(state.progress).toBe(null);
      expect(state.currentHintIndex).toBe(-1);
      expect(state.isCurrentStepComplete).toBe(false);
    });
  });

  describe('startScenario', () => {
    it('sets activeScenario to the provided scenario', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      expect(useLearningStore.getState().activeScenario).toEqual(scenario);
    });

    it('creates progress with scenarioId and startedAt', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      const progress = useLearningStore.getState().progress;
      expect(progress?.scenarioId).toBe('scenario-1');
      expect(progress?.startedAt).toBeDefined();
      expect(Number.isNaN(Date.parse(progress?.startedAt ?? ''))).toBe(false);
    });

    it('initializes currentStepIndex to 0', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      expect(useLearningStore.getState().progress?.currentStepIndex).toBe(0);
    });

    it('creates step statuses with first active and remaining locked', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      const steps = useLearningStore.getState().progress?.steps ?? [];
      expect(steps).toHaveLength(3);
      expect(steps[0]).toMatchObject({ stepId: 'step-1', status: 'active', hintsUsed: 0 });
      expect(steps[1]).toMatchObject({ stepId: 'step-2', status: 'locked', hintsUsed: 0 });
      expect(steps[2]).toMatchObject({ stepId: 'step-3', status: 'locked', hintsUsed: 0 });
    });

    it('resets hint index and step complete flag', () => {
      const scenario = createTestScenario();
      useLearningStore.setState({ currentHintIndex: 1, isCurrentStepComplete: true });
      useLearningStore.getState().startScenario(scenario);

      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
      expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);
    });
  });

  describe('advanceStep', () => {
    it('no-ops when there is no active scenario', () => {
      useLearningStore.getState().advanceStep();
      expect(useLearningStore.getState().progress).toBe(null);
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
    });

    it('marks the current step as completed', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      useLearningStore.getState().advanceStep();

      const steps = useLearningStore.getState().progress?.steps ?? [];
      expect(steps[0].status).toBe('completed');
      expect(steps[0].completedAt).toBeDefined();
    });

    it('moves to the next step and marks it active', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      useLearningStore.getState().advanceStep();

      const progress = useLearningStore.getState().progress;
      expect(progress?.currentStepIndex).toBe(1);
      expect(progress?.steps[1].status).toBe('active');
    });

    it('resets hint index and step complete flag after advancing', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      useLearningStore.setState({ currentHintIndex: 1, isCurrentStepComplete: true });

      useLearningStore.getState().advanceStep();

      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
      expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);
    });

    it('keeps currentStepIndex on last step and sets completedAt', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      useLearningStore.getState().advanceStep();
      useLearningStore.getState().advanceStep();

      useLearningStore.getState().advanceStep();

      const progress = useLearningStore.getState().progress;
      expect(progress?.currentStepIndex).toBe(2);
      expect(progress?.completedAt).toBeDefined();
    });

    it('marks final active step as completed when advancing from last step', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      useLearningStore.getState().advanceStep();
      useLearningStore.getState().advanceStep();

      useLearningStore.getState().advanceStep();

      const steps = useLearningStore.getState().progress?.steps ?? [];
      expect(steps[2].status).toBe('completed');
      expect(steps[2].completedAt).toBeDefined();
    });
  });

  describe('completeScenario', () => {
    it('no-ops when progress is null', () => {
      useLearningStore.getState().completeScenario();
      expect(useLearningStore.getState().progress).toBe(null);
    });

    it('marks active step as completed', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      useLearningStore.getState().completeScenario();

      const steps = useLearningStore.getState().progress?.steps ?? [];
      expect(steps[0].status).toBe('completed');
      expect(steps[0].completedAt).toBeDefined();
    });

    it('does not change locked steps to completed', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      useLearningStore.getState().completeScenario();

      const steps = useLearningStore.getState().progress?.steps ?? [];
      expect(steps[1].status).toBe('locked');
      expect(steps[2].status).toBe('locked');
    });

    it('sets completedAt and resets hint index and step complete flag', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      useLearningStore.setState({ currentHintIndex: 1, isCurrentStepComplete: true });

      useLearningStore.getState().completeScenario();

      const progress = useLearningStore.getState().progress;
      expect(progress?.completedAt).toBeDefined();
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
      expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);
    });
  });

  describe('showNextHint', () => {
    it('no-ops when there is no active scenario', () => {
      useLearningStore.setState({ currentHintIndex: 0 });
      useLearningStore.getState().showNextHint();
      expect(useLearningStore.getState().currentHintIndex).toBe(0);
      expect(useLearningStore.getState().progress).toBe(null);
    });

    it('increments currentHintIndex from -1 to 0', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      useLearningStore.getState().showNextHint();

      expect(useLearningStore.getState().currentHintIndex).toBe(0);
    });

    it('increments currentHintIndex to the next hint', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      useLearningStore.getState().showNextHint();

      useLearningStore.getState().showNextHint();

      expect(useLearningStore.getState().currentHintIndex).toBe(1);
    });

    it('updates hintsUsed for the current step', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      useLearningStore.getState().showNextHint();
      useLearningStore.getState().showNextHint();

      const progress = useLearningStore.getState().progress;
      expect(progress?.steps[0].hintsUsed).toBe(2);
    });

    it('does not decrease hintsUsed when currentHintIndex is manually lowered', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      useLearningStore.getState().showNextHint();
      useLearningStore.getState().showNextHint();
      useLearningStore.setState({ currentHintIndex: 0 });

      useLearningStore.getState().showNextHint();

      expect(useLearningStore.getState().progress?.steps[0].hintsUsed).toBe(2);
    });

    it('caps at max hint index for the current step', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      useLearningStore.getState().showNextHint();
      useLearningStore.getState().showNextHint();
      useLearningStore.getState().showNextHint();

      expect(useLearningStore.getState().currentHintIndex).toBe(1);
      expect(useLearningStore.getState().progress?.steps[0].hintsUsed).toBe(2);
    });

    it('uses hints from the current step after advancing', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      useLearningStore.getState().advanceStep();

      useLearningStore.getState().showNextHint();

      const progress = useLearningStore.getState().progress;
      expect(progress?.currentStepIndex).toBe(1);
      expect(progress?.steps[0].hintsUsed).toBe(0);
      expect(progress?.steps[1].hintsUsed).toBe(1);
    });
  });

  describe('resetHints', () => {
    it('sets currentHintIndex back to -1', () => {
      useLearningStore.setState({ currentHintIndex: 1 });
      useLearningStore.getState().resetHints();
      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
    });

    it('does not modify progress when resetting hints', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      const beforeProgress = useLearningStore.getState().progress;

      useLearningStore.getState().resetHints();

      expect(useLearningStore.getState().progress).toEqual(beforeProgress);
    });
  });

  describe('setStepComplete', () => {
    it('sets isCurrentStepComplete to true', () => {
      useLearningStore.getState().setStepComplete(true);
      expect(useLearningStore.getState().isCurrentStepComplete).toBe(true);
    });

    it('sets isCurrentStepComplete to false', () => {
      useLearningStore.setState({ isCurrentStepComplete: true });
      useLearningStore.getState().setStepComplete(false);
      expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);
    });
  });

  describe('abandonScenario', () => {
    it('clears activeScenario and progress', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);

      useLearningStore.getState().abandonScenario();

      expect(useLearningStore.getState().activeScenario).toBe(null);
      expect(useLearningStore.getState().progress).toBe(null);
    });

    it('resets currentHintIndex and isCurrentStepComplete', () => {
      useLearningStore.setState({ currentHintIndex: 1, isCurrentStepComplete: true });

      useLearningStore.getState().abandonScenario();

      expect(useLearningStore.getState().currentHintIndex).toBe(-1);
      expect(useLearningStore.getState().isCurrentStepComplete).toBe(false);
    });

    it('returns state to initial defaults after running scenario', () => {
      const scenario = createTestScenario();
      useLearningStore.getState().startScenario(scenario);
      useLearningStore.getState().showNextHint();
      useLearningStore.getState().setStepComplete(true);

      useLearningStore.getState().abandonScenario();

      const state = useLearningStore.getState();
      expect(state.activeScenario).toBe(null);
      expect(state.progress).toBe(null);
      expect(state.currentHintIndex).toBe(-1);
      expect(state.isCurrentStepComplete).toBe(false);
    });
  });
});
