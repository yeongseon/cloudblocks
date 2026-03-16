import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useLearningStore } from '../../entities/store/learningStore';
import { useUIStore } from '../../entities/store/uiStore';
import { getScenario } from './scenarios/registry';
import { evaluateRules } from './step-validator';
import type { ValidationResult } from './step-validator';
import type { ArchitectureSnapshot, StepValidationRule } from '../../shared/types/learning';

let unsubscribe: (() => void) | null = null;
const checkpointCache = new Map<string, ArchitectureSnapshot>();

function hasActiveScenario(): boolean {
  const { activeScenario, progress } = useLearningStore.getState();
  return activeScenario !== null && progress !== null;
}

function syncCurrentStepCompletion(): ValidationResult {
  const learningState = useLearningStore.getState();
  if (!learningState.activeScenario || !learningState.progress) {
    learningState.setStepComplete(false);
    return { passed: false, results: [] };
  }

  const validation = getValidationDetails();
  learningState.setStepComplete(validation.passed);
  return validation;
}

function cacheStepCheckpoint(stepId: string, checkpoint?: ArchitectureSnapshot): void {
  if (!checkpoint) {
    return;
  }

  checkpointCache.set(stepId, checkpoint);
}

export function startLearningScenario(scenarioId: string): void {
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  useArchitectureStore.getState().replaceArchitecture(scenario.initialArchitecture);
  useUIStore.getState().setEditorMode('learn');
  useLearningStore.getState().startScenario(scenario);

  const uiState = useUIStore.getState();
  if (!uiState.showLearningPanel) {
    uiState.toggleLearningPanel();
  }

  startValidationSubscription();
  syncCurrentStepCompletion();
}

export function advanceToNextStep(): void {
  const learningState = useLearningStore.getState();
  const { activeScenario, progress, isCurrentStepComplete } = learningState;

  if (!activeScenario || !progress || !isCurrentStepComplete) {
    return;
  }

  const currentStep = activeScenario.steps[progress.currentStepIndex];
  if (!currentStep) {
    return;
  }

  cacheStepCheckpoint(currentStep.id, currentStep.checkpoint);

  const isLastStep = progress.currentStepIndex >= activeScenario.steps.length - 1;
  if (isLastStep) {
    learningState.completeScenario();
    return;
  }

  learningState.advanceStep();
  syncCurrentStepCompletion();
}

export function resetCurrentStep(): void {
  const learningState = useLearningStore.getState();
  const { activeScenario, progress } = learningState;

  if (!activeScenario || !progress) {
    return;
  }

  const currentStep = activeScenario.steps[progress.currentStepIndex];
  if (!currentStep) {
    return;
  }

  if (currentStep.checkpoint) {
    useArchitectureStore.getState().replaceArchitecture(currentStep.checkpoint);
  }

  learningState.resetHints();
  syncCurrentStepCompletion();
}

export function abandonLearning(): void {
  useLearningStore.getState().abandonScenario();

  const uiState = useUIStore.getState();
  uiState.setEditorMode('build');
  if (uiState.showLearningPanel) {
    uiState.toggleLearningPanel();
  }

  stopValidationSubscription();
}

export function startValidationSubscription(): void {
  if (unsubscribe) {
    return;
  }

  unsubscribe = useArchitectureStore.subscribe((state, prevState) => {
    if (state.workspace.architecture !== prevState.workspace.architecture) {
      if (!hasActiveScenario()) {
        useLearningStore.getState().setStepComplete(false);
        return;
      }

      const validation = getValidationDetails();
      useLearningStore.getState().setStepComplete(validation.passed);
    }
  });
}

export function stopValidationSubscription(): void {
  if (!unsubscribe) {
    return;
  }

  unsubscribe();
  unsubscribe = null;
}

export function getCurrentStepRules(): StepValidationRule[] {
  const { activeScenario, progress } = useLearningStore.getState();
  if (!activeScenario || !progress) {
    return [];
  }

  const currentStep = activeScenario.steps[progress.currentStepIndex];
  return currentStep?.validationRules ?? [];
}

export function getValidationDetails(): ValidationResult {
  const { activeScenario, progress } = useLearningStore.getState();
  if (!activeScenario || !progress) {
    return { passed: false, results: [] };
  }

  const currentStep = activeScenario.steps[progress.currentStepIndex];
  if (!currentStep) {
    return { passed: false, results: [] };
  }

  const architecture = useArchitectureStore.getState().workspace.architecture;
  return evaluateRules(currentStep.validationRules, architecture);
}

export const ScenarioEngine = {
  startLearningScenario,
  advanceToNextStep,
  resetCurrentStep,
  abandonLearning,
  startValidationSubscription,
  stopValidationSubscription,
  getCurrentStepRules,
  getValidationDetails,
};
