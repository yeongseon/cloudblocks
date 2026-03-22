import React from 'react';
import { useAiStore } from '../store';
import { isApiConfigured } from '../../../shared/api/client';
import type { AiSuggestion } from '../api';
import './SuggestionsPanel.css';

const AI_BACKEND_REQUIRED_MESSAGE = 'AI features require the backend API - see setup guide.';

const SEVERITY_ICONS: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

const CATEGORY_LABELS: Record<string, string> = {
  security: 'Security',
  reliability: 'Reliability',
  best_practice: 'Best Practice',
};

function SuggestionItem({ suggestion }: { suggestion: AiSuggestion }) {
  const icon = SEVERITY_ICONS[suggestion.severity] ?? '⚪';
  const category = CATEGORY_LABELS[suggestion.category] ?? suggestion.category;

  return (
    <div className="suggestion-item" data-severity={suggestion.severity}>
      <div className="suggestion-header">
        <span className="suggestion-severity">{icon}</span>
        <span className="suggestion-category">{category}</span>
      </div>
      <div className="suggestion-message">{suggestion.message}</div>
      {suggestion.action_description && (
        <div className="suggestion-action">{suggestion.action_description}</div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="score-row">
      <span className="score-label">{label}</span>
      <div className="score-track">
        <div className="score-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="score-value">{value}</span>
    </div>
  );
}

export const SuggestionsPanel: React.FC = () => {
  const loading = useAiStore((s) => s.suggestLoading);
  const error = useAiStore((s) => s.suggestError);
  const result = useAiStore((s) => s.suggestResult);
  const backendConfigured = isApiConfigured();

  if (!backendConfigured) {
    return (
      <div className="suggestions-panel" data-testid="suggestions-panel">
        <div className="suggestions-error">{AI_BACKEND_REQUIRED_MESSAGE}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="suggestions-panel" data-testid="suggestions-panel">
        <div className="suggestions-loading">Analyzing architecture…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="suggestions-panel" data-testid="suggestions-panel">
        <div className="suggestions-error">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="suggestions-panel" data-testid="suggestions-panel">
        <div className="suggestions-empty">
          Run AI analysis to get architecture suggestions.
        </div>
      </div>
    );
  }

  const { suggestions, score } = result;

  return (
    <div className="suggestions-panel" data-testid="suggestions-panel">
      {Object.keys(score).length > 0 && (
        <div className="suggestions-scores">
          <h4 className="suggestions-section-title">Architecture Score</h4>
          {Object.entries(score).map(([key, val]) => (
            <ScoreBar key={key} label={key} value={val} />
          ))}
        </div>
      )}

      <div className="suggestions-list">
        <h4 className="suggestions-section-title">
          Suggestions ({suggestions.length})
        </h4>
        {suggestions.length === 0 ? (
          <div className="suggestions-empty">No suggestions — looking good!</div>
        ) : (
          suggestions.map((s) => (
            <SuggestionItem key={`${s.severity}-${s.category}-${s.message}`} suggestion={s} />
          ))
        )}
      </div>
    </div>
  );
};
