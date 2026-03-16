import { useLearningStore } from '../../entities/store/learningStore';

export function HintPopup() {
  const activeScenario = useLearningStore((state) => state.activeScenario);
  const progress = useLearningStore((state) => state.progress);
  const currentHintIndex = useLearningStore((state) => state.currentHintIndex);

  if (!activeScenario || !progress) {
    return null;
  }

  if (currentHintIndex === -1) {
    return null;
  }

  const currentStepIndex = progress.currentStepIndex;
  const currentStep = activeScenario.steps[currentStepIndex];

  if (!currentStep || !currentStep.hints || currentStep.hints.length === 0) {
    return null;
  }

  const visibleHints = currentStep.hints.slice(0, currentHintIndex + 1);

  return (
    <div className="hint-popup-container">
      {visibleHints.map((hint, index) => (
        <div key={hint} className="hint-popup-card">
          <h4 className="hint-popup-title">💡 Hint {index + 1}</h4>
          <p className="hint-popup-text">{hint}</p>
        </div>
      ))}
    </div>
  );
}
