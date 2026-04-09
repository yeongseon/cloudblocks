import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { getScenario } from './scenarios/registry';
import { formatScenarioForProvider } from './scenario-formatter';
import { startHintSubscription, startHintTimer, stopHintSubscription } from './hint-engine';
import { evaluateRules } from './step-validator';
import type { ValidationResult } from './step-validator';
import type { StepValidationRule } from '../../shared/types/learning';
import type { ArchitectureModel } from '@cloudblocks/schema';

let unsubscribe: (() => void) | null = null;
let preLearningSnapshot: ArchitectureModel | null = null;

function hasActiveScenario(): boolean {
  const { activeScenario, progress } = useArchitectureStore.getState();
  return activeScenario !== null && progress !== null;
}

function syncCurrentStepCompletion(): ValidationResult {
  const learningState = useArchitectureStore.getState();
  if (!learningState.activeScenario || !learningState.progress) {
    learningState.setStepComplete(false);
    return { passed: false, results: [] };
  }

  const validation = getValidationDetails();
  learningState.setStepComplete(validation.passed);
  return validation;
}

export function startLearningScenario(scenarioId: string): void {
  const rawScenario = getScenario(scenarioId);
  if (!rawScenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  const provider = useUIStore.getState().activeProvider;
  const scenario = formatScenarioForProvider(rawScenario, provider);

  preLearningSnapshot = JSON.parse(
    JSON.stringify(useArchitectureStore.getState().workspace.architecture),
  );
  useArchitectureStore.getState().replaceArchitecture(scenario.initialArchitecture);
  useUIStore.getState().setEditorMode('learn');
  useArchitectureStore.getState().startScenario(scenario);

  useUIStore.getState().openDrawer('learning');

  startValidationSubscription();
  startHintSubscription();
  syncCurrentStepCompletion();
  startHintTimer();
}

export function advanceToNextStep(): void {
  const learningState = useArchitectureStore.getState();
  const { activeScenario, progress, isCurrentStepComplete } = learningState;

  if (!activeScenario || !progress || !isCurrentStepComplete) {
    return;
  }

  const currentStep = activeScenario.steps[progress.currentStepIndex];
  if (!currentStep) {
    return;
  }

  const isLastStep = progress.currentStepIndex >= activeScenario.steps.length - 1;
  if (isLastStep) {
    learningState.completeScenario();
    stopHintSubscription();
    return;
  }

  learningState.advanceStep();
  syncCurrentStepCompletion();
  startHintTimer();
}

export function resetCurrentStep(): void {
  const learningState = useArchitectureStore.getState();
  const { activeScenario, progress } = learningState;

  if (!activeScenario || !progress) {
    return;
  }

  const currentStep = activeScenario.steps[progress.currentStepIndex];
  if (!currentStep) {
    return;
  }

  const snapshot = currentStep.checkpoint ?? activeScenario.initialArchitecture;
  if (snapshot) {
    useArchitectureStore.getState().replaceArchitecture(snapshot);
  }

  learningState.resetHints();
  syncCurrentStepCompletion();
  startHintTimer();
}

export function abandonLearning(): void {
  useArchitectureStore.getState().abandonScenario();

  if (preLearningSnapshot) {
    useArchitectureStore.getState().replaceArchitecture(preLearningSnapshot);
    preLearningSnapshot = null;
  }

  const uiState = useUIStore.getState();
  uiState.setEditorMode('build');
  uiState.closeDrawer();

  stopValidationSubscription();
  stopHintSubscription();
}

export function startValidationSubscription(): void {
  if (unsubscribe) {
    return;
  }

  unsubscribe = useArchitectureStore.subscribe((state, prevState) => {
    if (state.workspace.architecture !== prevState.workspace.architecture) {
      if (!hasActiveScenario()) {
        useArchitectureStore.getState().setStepComplete(false);
        return;
      }

      const validation = getValidationDetails();
      useArchitectureStore.getState().setStepComplete(validation.passed);
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
  const { activeScenario, progress } = useArchitectureStore.getState();
  if (!activeScenario || !progress) {
    return [];
  }

  const currentStep = activeScenario.steps[progress.currentStepIndex];
  return currentStep?.validationRules ?? [];
}

export function getValidationDetails(): ValidationResult {
  const { activeScenario, progress } = useArchitectureStore.getState();
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
