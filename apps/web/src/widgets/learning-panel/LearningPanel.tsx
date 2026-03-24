import './LearningPanel.css';
import { useLearningStore } from '../../entities/store/learningStore';
import {
  advanceToNextStep,
  resetCurrentStep,
  abandonLearning,
  getValidationDetails,
} from '../../features/learning/scenario-engine';
import type { StepValidationRule } from '../../shared/types/learning';
import { StepProgress } from './StepProgress';
import { HintPopup } from './HintPopup';
import { CompletionScreen } from './CompletionScreen';

function getRuleIdentifier(rule: StepValidationRule): string {
  switch (rule.type) {
    case 'container-exists':
      return `container-exists:${rule.plateType}`;
    case 'block-exists':
      return `block-exists:${rule.category}:${rule.onPlateType ?? 'any'}`;
    case 'connection-exists':
      return `connection-exists:${rule.sourceCategory}:${rule.targetCategory}`;
    case 'entity-on-container':
      return `entity-on-container:${rule.entityCategory}:${rule.plateType}`;
    case 'architecture-valid':
      return 'architecture-valid';
    case 'min-block-count':
      return `min-block-count:${rule.category}:${rule.count}`;
    case 'min-container-count':
      return `min-container-count:${rule.plateType}:${rule.count}`;
    default:
      return 'unknown-rule';
  }
}

function describeRule(rule: StepValidationRule): string {
  switch (rule.type) {
    case 'container-exists':
      return `Add a ${rule.plateType} container`;
    case 'block-exists':
      return `Add a ${rule.category} node`;
    case 'connection-exists':
      return `Connect ${rule.sourceCategory} to ${rule.targetCategory}`;
    case 'entity-on-container':
      return `Place ${rule.entityCategory} on ${rule.plateType} container`;
    case 'architecture-valid':
      return 'Fix validation issues';
    case 'min-block-count':
      return `Add at least ${rule.count} ${rule.category} node(s)`;
    case 'min-container-count':
      return `Add at least ${rule.count} ${rule.plateType} container(s)`;
    default:
      return 'Complete requirement';
  }
}

export function LearningPanel() {
  const activeScenario = useLearningStore((state) => state.activeScenario);
  const progress = useLearningStore((state) => state.progress);
  const isCurrentStepComplete = useLearningStore((state) => state.isCurrentStepComplete);
  const showNextHint = useLearningStore((state) => state.showNextHint);
  const currentHintIndex = useLearningStore((state) => state.currentHintIndex);

  if (!activeScenario || !progress) {
    return (
      <div className="learning-panel-empty">
        <p>No active scenario. Open the Scenarios panel to start one.</p>
      </div>
    );
  }

  if (progress.completedAt) {
    return (
      <div className="learning-panel-container">
        <CompletionScreen />
      </div>
    );
  }

  const currentStepIndex = progress.currentStepIndex;
  const currentStep = activeScenario.steps[currentStepIndex];

  if (!currentStep) {
    return null;
  }

  const validationDetails = getValidationDetails();
  const rules = currentStep.validationRules || [];
  const validationResultByRuleId = new Map(
    validationDetails.results.map((result) => [getRuleIdentifier(result.rule), result.passed]),
  );
  const maxHints = currentStep.hints ? currentStep.hints.length : 0;
  const allHintsShown = currentHintIndex >= maxHints - 1;

  const handleNextStep = () => {
    advanceToNextStep();
  };

  const handleResetStep = () => {
    resetCurrentStep();
  };

  const handleShowHint = () => {
    showNextHint();
  };

  const handleClose = () => {
    abandonLearning();
  };

  return (
    <div className="learning-panel-container">
      <div className="learning-panel-header">
        <h3 className="learning-panel-title">{activeScenario.name}</h3>
        <button
          type="button"
          className="learning-panel-close-btn"
          onClick={handleClose}
          aria-label="Close learning panel"
        >
          ×
        </button>
      </div>

      <div className="learning-panel-content">
        <StepProgress />

        <div className="learning-panel-card">
          <h4 className="learning-panel-card-title">{currentStep.title}</h4>
          <p className="learning-panel-card-text">{currentStep.instruction}</p>

          {rules.length > 0 && (
            <ul className="validation-list">
              {rules.map((rule, index) => {
                const ruleId = getRuleIdentifier(rule);
                const isPass = validationResultByRuleId.get(ruleId) ?? false;
                return (
                  <li key={`${ruleId}-${index}`} className="validation-item">
                    <span className={`validation-icon ${isPass ? 'pass' : 'fail'}`}>
                      {isPass ? '✓' : '✗'}
                    </span>
                    {describeRule(rule)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <HintPopup />

        <div className="learning-panel-actions">
          <button
            type="button"
            className="learning-panel-btn primary"
            onClick={handleNextStep}
            disabled={!isCurrentStepComplete}
          >
            Next Step
          </button>

          <button
            type="button"
            className="learning-panel-btn"
            onClick={handleShowHint}
            disabled={allHintsShown || maxHints === 0}
          >
            Show Hint
          </button>

          <button type="button" className="learning-panel-btn" onClick={handleResetStep}>
            Reset Step
          </button>
        </div>
      </div>
    </div>
  );
}

export { StepProgress, HintPopup, CompletionScreen };
