import { useState } from 'react';
import { useUIStore } from '../../entities/store/uiStore';
import {
  listScenarios,
  listScenariosByDifficulty,
} from '../../features/learning/scenarios/registry';
import { startLearningScenario } from '../../features/learning/scenario-engine';
import type { ScenarioDifficulty } from '../../shared/types/learning';
import './ScenarioGallery.css';

const difficultyColors: Record<ScenarioDifficulty, string> = {
  beginner: '#34C759',
  intermediate: '#FF9500',
  advanced: '#FF3B30',
};

const categoryLabels: Record<ScenarioDifficulty | 'all', string> = {
  all: 'All',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const categoryKeys: Array<ScenarioDifficulty | 'all'> = [
  'all',
  'beginner',
  'intermediate',
  'advanced',
];

export function ScenarioGallery() {
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const [activeDifficulty, setActiveDifficulty] = useState<ScenarioDifficulty | 'all'>('all');

  const scenarios =
    activeDifficulty === 'all' ? listScenarios() : listScenariosByDifficulty(activeDifficulty);

  const handleStart = (id: string) => {
    startLearningScenario(id);
    setActiveDifficulty('all');
    closeDrawer();
  };

  return (
    <div className="scenario-gallery">
      <div className="scenario-gallery-filters">
        {categoryKeys.map((key) => (
          <button
            type="button"
            key={key}
            className={`scenario-gallery-filter-btn ${activeDifficulty === key ? 'active' : ''}`}
            onClick={() => setActiveDifficulty(key)}
          >
            {categoryLabels[key]}
          </button>
        ))}
      </div>

      {scenarios.length === 0 ? (
        <div className="scenario-gallery-empty">No scenarios in this category.</div>
      ) : (
        <div className="scenario-gallery-list">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="scenario-gallery-card">
              <div className="scenario-gallery-card-header">
                <span className="scenario-gallery-card-name">{scenario.name}</span>
                <span
                  className="scenario-gallery-badge"
                  style={{ backgroundColor: difficultyColors[scenario.difficulty] }}
                >
                  {scenario.difficulty}
                </span>
              </div>
              <p className="scenario-gallery-card-desc">{scenario.description}</p>
              <div className="scenario-gallery-card-footer">
                <div className="scenario-gallery-tags">
                  <span className="scenario-gallery-tag scenario-gallery-tag-time">
                    ~{scenario.estimatedMinutes} min
                  </span>
                  {scenario.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="scenario-gallery-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="scenario-gallery-use-btn"
                  onClick={() => handleStart(scenario.id)}
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
