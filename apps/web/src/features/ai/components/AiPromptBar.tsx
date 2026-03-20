import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import './AiPromptBar.css';

interface AiPromptBarProps {
  onSubmit: (prompt: string, provider: string) => void;
  isLoading: boolean;
  error?: string;
  explanation?: string;
  warnings?: string[];
}

export const AiPromptBar: React.FC<AiPromptBarProps> = ({
  onSubmit,
  isLoading,
  error,
  explanation,
  warnings,
}) => {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('aws');

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim(), provider);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="ai-prompt-container">
      <div className="ai-prompt-bar" data-loading={isLoading}>
        <input
          type="text"
          className="ai-prompt-input"
          placeholder="Describe your cloud architecture..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <select
          className="ai-provider-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          disabled={isLoading}
        >
          <option value="aws">AWS</option>
          <option value="azure">Azure</option>
          <option value="gcp">GCP</option>
        </select>
        <button
          className="ai-submit-btn"
          onClick={handleSubmit}
          disabled={!prompt.trim() || isLoading}
          title="Generate Architecture"
          type="button"
        >
          {isLoading ? (
            <div className="ai-loading-spinner" data-testid="loading-spinner" />
          ) : (
            '✨'
          )}
        </button>
      </div>
      {error && <div className="ai-error-message">{error}</div>}
      {explanation && <div className="ai-explanation">{explanation}</div>}
      {warnings && warnings.length > 0 && (
        <div className="ai-warnings">
          {warnings.map((w, i) => (
            <div key={i} className="ai-warning-item">⚠️ {w}</div>
          ))}
        </div>
      )}
    </div>
  );
};
