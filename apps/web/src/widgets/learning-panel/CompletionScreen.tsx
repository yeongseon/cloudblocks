import { useLearningStore } from '../../entities/store/learningStore';
import { useUIStore } from '../../entities/store/uiStore';
import { abandonLearning } from '../../features/learning/scenario-engine';

export function CompletionScreen() {
  const activeScenario = useLearningStore((state) => state.activeScenario);
  const progress = useLearningStore((state) => state.progress);
  const setShowScenarioGallery = useUIStore((state) => state.setShowScenarioGallery);

  if (!activeScenario || !progress || !progress.completedAt) {
    return null;
  }

  const timeTakenMs = new Date(progress.completedAt).getTime() - new Date(progress.startedAt).getTime();
  const totalSeconds = Math.floor(timeTakenMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeString = `${minutes} min ${seconds} sec`;

  const totalHints = progress.steps.reduce((sum, step) => sum + (step.hintsUsed || 0), 0);

  const handleBrowse = () => {
    abandonLearning();
    setShowScenarioGallery(true);
  };

  const handleBack = () => {
    abandonLearning();
  };

  return (
    <div className="completion-screen">
      <div className="completion-icon">🎉</div>
      <h2 className="completion-title">Congratulations!</h2>
      
      <div className="completion-stats">
        <div className="completion-stat-item">
          <span>Scenario:</span>
          <span>{activeScenario.name}</span>
        </div>
        <div className="completion-stat-item">
          <span>Time:</span>
          <span>{timeString}</span>
        </div>
        <div className="completion-stat-item">
          <span>Hints Used:</span>
          <span>{totalHints}</span>
        </div>
      </div>

      <div className="completion-actions">
        <button type="button" className="learning-panel-btn primary" onClick={handleBrowse}>
          Browse Scenarios
        </button>
        <button type="button" className="learning-panel-btn" onClick={handleBack}>
          Back to Build
        </button>
      </div>
    </div>
  );
}
