import { useLearningStore } from '../../entities/store/learningStore';

export function StepProgress() {
  const activeScenario = useLearningStore((state) => state.activeScenario);
  const progress = useLearningStore((state) => state.progress);

  if (!activeScenario || !progress) {
    return null;
  }

  const currentStepIndex = progress.currentStepIndex;
  const steps = activeScenario.steps;
  const currentStepTitle = steps[currentStepIndex]?.title || '';

  return (
    <div className="step-progress-container">
      <div className="step-progress-bar">
        <div className="step-progress-line" />
        {steps.map((step, index) => {
          const stepStatus = progress.steps[index]?.status || 'locked';
          const isActive = index === currentStepIndex;
          
          let nodeClass = 'step-progress-node';
          if (stepStatus === 'completed') {
            nodeClass += ' completed';
          } else if (isActive) {
            nodeClass += ' active';
          }

          return (
            <div key={step.id} className={nodeClass}>
              {stepStatus === 'completed' ? '✓' : index + 1}
            </div>
          );
        })}
      </div>
      <p className="step-progress-title">
        Step {currentStepIndex + 1}: {currentStepTitle}
      </p>
    </div>
  );
}
