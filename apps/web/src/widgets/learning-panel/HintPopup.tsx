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
  const hintOccurrences = new Map<string, number>();
  const hintCards = visibleHints.map((hint, index) => {
    const occurrence = (hintOccurrences.get(hint) ?? 0) + 1;
    hintOccurrences.set(hint, occurrence);

    return {
      key: `${currentStep.id}-${hint}-${occurrence}`,
      hint,
      order: index + 1,
    };
  });

  return (
    <div className="hint-popup-container">
      {hintCards.map((hintCard) => (
        <div key={hintCard.key} className="hint-popup-card">
          <h4 className="hint-popup-title">💡 Hint {hintCard.order}</h4>
          <p className="hint-popup-text">{hintCard.hint}</p>
        </div>
      ))}
    </div>
  );
}
