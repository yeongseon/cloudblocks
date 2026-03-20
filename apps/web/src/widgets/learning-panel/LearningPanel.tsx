import './LearningPanel.css';
import { useUIStore } from '../../entities/store/uiStore';
import { useLearningStore } from '../../entities/store/learningStore';
import { advanceToNextStep, resetCurrentStep, abandonLearning, getValidationDetails } from '../../features/learning/scenario-engine';
import type { StepValidationRule } from '../../shared/types/learning';
import { StepProgress } from './StepProgress';
import { HintPopup } from './HintPopup';
import { CompletionScreen } from './CompletionScreen';

function describeRule(rule: StepValidationRule): string {
  switch (rule.type) {
    case 'plate-exists':
      return rule.subnetAccess
        ? `Add a ${rule.subnetAccess} ${rule.plateType} plate`
        : `Add a ${rule.plateType} plate`;
    case 'block-exists':
      return `Add a ${rule.category} block`;
    case 'connection-exists':
      return `Connect ${rule.sourceCategory} to ${rule.targetCategory}`;
    case 'entity-on-plate':
      return `Place ${rule.entityCategory} on ${rule.plateType}`;
    case 'architecture-valid':
      return 'Fix validation issues';
    case 'min-block-count':
      return `Add at least ${rule.count} ${rule.category} block(s)`;
    case 'min-plate-count':
      return `Add at least ${rule.count} ${rule.plateType} plate(s)`;
    default:
      return 'Complete requirement';
  }
}

export function LearningPanel() {
  const showLearningPanel = useUIStore((state) => state.showLearningPanel);
  const activeScenario = useLearningStore((state) => state.activeScenario);
  const progress = useLearningStore((state) => state.progress);
  const isCurrentStepComplete = useLearningStore((state) => state.isCurrentStepComplete);
  const showNextHint = useLearningStore((state) => state.showNextHint);
  const currentHintIndex = useLearningStore((state) => state.currentHintIndex);

  if (!showLearningPanel || !activeScenario || !progress) {
    return null;
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
        <button type="button" className="learning-panel-close-btn" onClick={handleClose} aria-label="Close learning panel">
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
                const isPass = validationDetails.results[index]?.passed ?? false;
                return (
                  <li key={`${rule.type}-${index}`} className="validation-item">
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
          
          <button 
            type="button" 
            className="learning-panel-btn" 
            onClick={handleResetStep}
          >
            Reset Step
          </button>
        </div>
      </div>
    </div>
  );
}

export { StepProgress, HintPopup, CompletionScreen };
