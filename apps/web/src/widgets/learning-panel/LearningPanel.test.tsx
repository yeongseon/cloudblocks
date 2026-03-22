import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LearningPanel, StepProgress, HintPopup, CompletionScreen } from './LearningPanel';
import { useUIStore } from '../../entities/store/uiStore';
import { useLearningStore } from '../../entities/store/learningStore';
import { registerBuiltinScenarios } from '../../features/learning/scenarios/builtin';
import { clearScenarioRegistry, listScenarios } from '../../features/learning/scenarios/registry';
import {
  advanceToNextStep,
  resetCurrentStep,
  abandonLearning,
  getValidationDetails,
} from '../../features/learning/scenario-engine';
import type { StepValidationRule } from '../../shared/types/learning';

vi.mock('../../features/learning/scenario-engine', () => ({
  advanceToNextStep: vi.fn(),
  resetCurrentStep: vi.fn(),
  abandonLearning: vi.fn(),
  getValidationDetails: vi.fn(),
}));

function seedActiveScenario(): void {
  registerBuiltinScenarios();
  const scenario = listScenarios()[0];
  if (!scenario) {
    throw new Error('Expected builtin scenarios to be registered');
  }

  useLearningStore.getState().startScenario(scenario);
}

describe('LearningPanel widgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showLearningPanel: true, showScenarioGallery: false });
    seedActiveScenario();

    vi.mocked(getValidationDetails).mockReturnValue({
      passed: false,
      results: [],
    });
  });

  afterEach(() => {
    useLearningStore.getState().abandonScenario();
    useUIStore.setState({ showLearningPanel: false, showScenarioGallery: false, editorMode: 'build' });
    clearScenarioRegistry();
    vi.clearAllMocks();
  });

  it('returns null when showLearningPanel is false', () => {
    useUIStore.setState({ showLearningPanel: false });
    const { container } = render(<LearningPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when no activeScenario', () => {
    useLearningStore.setState({ activeScenario: null });
    const { container } = render(<LearningPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when no progress', () => {
    useLearningStore.setState({ progress: null });
    const { container } = render(<LearningPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when currentStep index is out of range', () => {
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

    const { container } = render(<LearningPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('shows CompletionScreen when progress.completedAt is set', () => {
    const progress = useLearningStore.getState().progress;
    if (!progress) {
      throw new Error('Expected progress to exist');
    }

    useLearningStore.setState({
      progress: { ...progress, startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:01:30.000Z' },
    });

    render(<LearningPanel />);
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next Step' })).not.toBeInTheDocument();
  });

  it('displays scenario name in header', () => {
    const scenarioName = useLearningStore.getState().activeScenario?.name;
    render(<LearningPanel />);
    if (!scenarioName) {
      throw new Error('Expected active scenario name');
    }
    expect(screen.getByRole('heading', { name: scenarioName })).toBeInTheDocument();
  });

  it('shows current step title and instruction', () => {
    const step = useLearningStore.getState().activeScenario?.steps[0];
    if (!step) {
      throw new Error('Expected first step');
    }

    render(<LearningPanel />);
    expect(screen.getByRole('heading', { name: step.title })).toBeInTheDocument();
    expect(screen.getByText(step.instruction)).toBeInTheDocument();
  });

  it('shows validation rules with pass/fail icons', () => {
    const progress = useLearningStore.getState().progress;
    if (!progress) {
      throw new Error('Expected progress');
    }

    useLearningStore.setState({
      progress: {
        ...progress,
        currentStepIndex: 2,
      },
    });

    const currentStep = useLearningStore.getState().activeScenario?.steps[2];
    if (!currentStep) {
      throw new Error('Expected third step');
    }

    vi.mocked(getValidationDetails).mockReturnValue({
      passed: false,
      results: currentStep.validationRules.map((rule, index) => ({ rule, passed: index === 0 })),
    });

    render(<LearningPanel />);
    const validationList = document.querySelector('.validation-list');
    if (!(validationList instanceof HTMLElement)) {
      throw new Error('Expected validation list');
    }

    const scoped = within(validationList);
    expect(scoped.getByText('✓')).toBeInTheDocument();
    expect(scoped.getAllByText('✗').length).toBeGreaterThanOrEqual(1);
  });

  it('renders descriptive text for each rule type', () => {
    const activeScenario = useLearningStore.getState().activeScenario;
    const progress = useLearningStore.getState().progress;
    if (!activeScenario || !progress) {
      throw new Error('Expected active scenario and progress');
    }

    const ruleSet: StepValidationRule[] = [
      { type: 'plate-exists', plateType: 'region' },
      { type: 'plate-exists', plateType: 'subnet' },
      { type: 'block-exists', category: 'compute' },
      { type: 'connection-exists', sourceCategory: 'edge', targetCategory: 'compute' },
      { type: 'entity-on-plate', entityCategory: 'data', plateType: 'subnet' },
      { type: 'architecture-valid' },
      { type: 'min-block-count', category: 'data', count: 2 },
      { type: 'min-plate-count', plateType: 'subnet', count: 3 },
      { type: 'unknown-rule' } as unknown as StepValidationRule,
    ];

    useLearningStore.setState({
      activeScenario: {
        ...activeScenario,
        steps: [
          {
            ...activeScenario.steps[0],
            validationRules: ruleSet,
          },
        ],
      },
      progress: {
        ...progress,
        currentStepIndex: 0,
      },
    });

    vi.mocked(getValidationDetails).mockReturnValue({
      passed: false,
      results: ruleSet.map((rule, index) => ({ rule, passed: index % 2 === 0 })),
    });

    render(<LearningPanel />);

    expect(screen.getByText('Add a region plate')).toBeInTheDocument();
    expect(screen.getByText('Add a subnet plate')).toBeInTheDocument();
    expect(screen.getByText('Add a compute block')).toBeInTheDocument();
    expect(screen.getByText('Connect edge to compute')).toBeInTheDocument();
    expect(screen.getByText('Place data on subnet')).toBeInTheDocument();
    expect(screen.getByText('Fix validation issues')).toBeInTheDocument();
    expect(screen.getByText('Add at least 2 data block(s)')).toBeInTheDocument();
    expect(screen.getByText('Add at least 3 subnet plate(s)')).toBeInTheDocument();
    expect(screen.getByText('Complete requirement')).toBeInTheDocument();
  });

  it('matches validation outcomes to rules by rule identity, not result index', () => {
    const activeScenario = useLearningStore.getState().activeScenario;
    const progress = useLearningStore.getState().progress;
    if (!activeScenario || !progress) {
      throw new Error('Expected active scenario and progress');
    }

    const rules: StepValidationRule[] = [
      { type: 'plate-exists', plateType: 'region' },
      { type: 'architecture-valid' },
    ];

    useLearningStore.setState({
      activeScenario: {
        ...activeScenario,
        steps: [
          {
            ...activeScenario.steps[0],
            validationRules: rules,
          },
        ],
      },
      progress: {
        ...progress,
        currentStepIndex: 0,
      },
    });

    vi.mocked(getValidationDetails).mockReturnValue({
      passed: false,
      results: [
        { rule: rules[1], passed: true },
        { rule: rules[0], passed: false },
      ],
    });

    render(<LearningPanel />);

    const regionRuleItem = screen.getByText('Add a region plate').closest('li');
    const validRuleItem = screen.getByText('Fix validation issues').closest('li');

    if (!(regionRuleItem instanceof HTMLElement) || !(validRuleItem instanceof HTMLElement)) {
      throw new Error('Expected validation list items');
    }

    expect(regionRuleItem).toHaveTextContent('✗');
    expect(validRuleItem).toHaveTextContent('✓');
  });

  it('disables Next Step button when current step is incomplete', () => {
    useLearningStore.setState({ isCurrentStepComplete: false });
    render(<LearningPanel />);
    expect(screen.getByRole('button', { name: 'Next Step' })).toBeDisabled();
  });

  it('enables Next Step button and calls advanceToNextStep when current step is complete', async () => {
    const user = userEvent.setup();
    useLearningStore.setState({ isCurrentStepComplete: true });

    render(<LearningPanel />);
    const nextButton = screen.getByRole('button', { name: 'Next Step' });
    expect(nextButton).toBeEnabled();

    await user.click(nextButton);
    expect(advanceToNextStep).toHaveBeenCalledOnce();
  });

  it('Show Hint button reveals hints and disables when all hints are shown', async () => {
    const user = userEvent.setup();
    const showNextHintSpy = vi.spyOn(useLearningStore.getState(), 'showNextHint');

    const { rerender } = render(<LearningPanel />);
    const hintButton = screen.getByRole('button', { name: 'Show Hint' });
    expect(hintButton).toBeEnabled();

    await user.click(hintButton);
    expect(showNextHintSpy).toHaveBeenCalledOnce();

    const currentStep = useLearningStore.getState().activeScenario?.steps[0];
    if (!currentStep) {
      throw new Error('Expected first step');
    }
    useLearningStore.setState({ currentHintIndex: currentStep.hints.length - 1 });
    rerender(<LearningPanel />);

    expect(screen.getByRole('button', { name: 'Show Hint' })).toBeDisabled();
  });

  it('disables Show Hint when current step has no hints', () => {
    const activeScenario = useLearningStore.getState().activeScenario;
    if (!activeScenario) {
      throw new Error('Expected active scenario');
    }

    useLearningStore.setState({
      activeScenario: {
        ...activeScenario,
        steps: [
          {
            ...activeScenario.steps[0],
            hints: [],
          },
        ],
      },
    });

    render(<LearningPanel />);
    expect(screen.getByRole('button', { name: 'Show Hint' })).toBeDisabled();
  });

  it('Reset Step button calls resetCurrentStep', async () => {
    const user = userEvent.setup();
    render(<LearningPanel />);

    await user.click(screen.getByRole('button', { name: 'Reset Step' }));
    expect(resetCurrentStep).toHaveBeenCalledOnce();
  });

  it('close button calls abandonLearning', () => {
    render(<LearningPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Close learning panel' }));
    expect(abandonLearning).toHaveBeenCalledOnce();
  });

  it('StepProgress renders correct number of step indicators', () => {
    render(<LearningPanel />);
    const stepCount = useLearningStore.getState().activeScenario?.steps.length ?? 0;
    const indicators = document.querySelectorAll('.step-progress-node');
    expect(indicators).toHaveLength(stepCount);
  });

  it('StepProgress shows completed checkmark and active class', () => {
    const progress = useLearningStore.getState().progress;
    if (!progress) {
      throw new Error('Expected progress');
    }

    const updatedSteps = progress.steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: 'completed' as const };
      }
      if (index === 1) {
        return { ...step, status: 'active' as const };
      }
      return step;
    });

    useLearningStore.setState({
      progress: {
        ...progress,
        currentStepIndex: 1,
        steps: updatedSteps,
      },
    });

    render(<StepProgress />);

    expect(screen.getByText('✓')).toBeInTheDocument();
    const activeNode = document.querySelector('.step-progress-node.active');
    if (!(activeNode instanceof HTMLElement)) {
      throw new Error('Expected active step node');
    }
    expect(activeNode).toHaveTextContent('2');
  });

  it('StepProgress maps step status by stepId even when progress order differs', () => {
    const progress = useLearningStore.getState().progress;
    const activeScenario = useLearningStore.getState().activeScenario;
    if (!progress || !activeScenario) {
      throw new Error('Expected progress and active scenario');
    }

    const firstStepId = activeScenario.steps[0]?.id;
    const secondStepId = activeScenario.steps[1]?.id;
    if (!firstStepId || !secondStepId) {
      throw new Error('Expected first two step ids');
    }

    useLearningStore.setState({
      progress: {
        ...progress,
        currentStepIndex: 1,
        steps: [
          { stepId: secondStepId, status: 'active', hintsUsed: 0 },
          { stepId: firstStepId, status: 'completed', hintsUsed: 0 },
        ],
      },
    });

    render(<StepProgress />);

    const nodes = Array.from(document.querySelectorAll('.step-progress-node'));
    expect(nodes[0]).toHaveTextContent('✓');
    expect(nodes[1]).toHaveClass('active');
  });

  it('StepProgress falls back to locked state and empty title when indices mismatch', () => {
    const progress = useLearningStore.getState().progress;
    if (!progress) {
      throw new Error('Expected progress');
    }

    useLearningStore.setState({
      progress: {
        ...progress,
        currentStepIndex: 99,
        steps: [progress.steps[0]],
      },
    });

    render(<StepProgress />);

    expect(screen.getByText('Step 100:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('StepProgress returns null when no activeScenario/progress', () => {
    useLearningStore.setState({ activeScenario: null, progress: null });
    const { container } = render(<StepProgress />);
    expect(container.innerHTML).toBe('');
  });

  it('HintPopup renders all visible hints up to currentHintIndex', () => {
    useLearningStore.setState({ currentHintIndex: 1 });
    render(<HintPopup />);

    expect(screen.getByRole('heading', { name: /Hint 1/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Hint 2/i })).toBeInTheDocument();
  });

  it('CompletionScreen browse and back buttons call expected actions', async () => {
    const user = userEvent.setup();
    const progress = useLearningStore.getState().progress;
    if (!progress) {
      throw new Error('Expected progress to exist');
    }

    useLearningStore.setState({
      progress: { ...progress, startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:02:00.000Z' },
    });

    render(<CompletionScreen />);

    await user.click(screen.getByRole('button', { name: 'Browse Scenarios' }));
    expect(abandonLearning).toHaveBeenCalledTimes(1);
    expect(useUIStore.getState().showScenarioGallery).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Back to Build' }));
    expect(abandonLearning).toHaveBeenCalledTimes(2);
  });
});
