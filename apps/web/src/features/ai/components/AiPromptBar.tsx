import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { isApiConfigured } from '../../../shared/api/client';
import { ComingSoonBanner } from '../../../shared/ui/ComingSoonBanner';
import './AiPromptBar.css';

const AI_BACKEND_REQUIRED_MESSAGE = 'AI features require the backend API - see setup guide.';

interface AiPromptBarProps {
  onSubmit: (prompt: string, provider: string) => void;
  isLoading: boolean;
  provider: string;
  error?: string;
  explanation?: string;
  warnings?: string[];
}

export const AiPromptBar: React.FC<AiPromptBarProps> = ({
  onSubmit,
  isLoading,
  provider,
  error,
  explanation,
  warnings,
}) => {
  const [prompt, setPrompt] = useState('');
  const backendConfigured = isApiConfigured();
  const disabledMessage = !backendConfigured ? AI_BACKEND_REQUIRED_MESSAGE : null;

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading && backendConfigured) {
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
          disabled={isLoading || !backendConfigured}
        />
        <span className="ai-provider-label">{provider.toUpperCase()}</span>
        <button
          className="ai-submit-btn"
          onClick={handleSubmit}
          disabled={!prompt.trim() || isLoading || !backendConfigured}
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
      {disabledMessage && (
        <ComingSoonBanner message={disabledMessage} className="ai-coming-soon" />
      )}
      {error && <div className="ai-error-message">{error}</div>}
      {explanation && <div className="ai-explanation">{explanation}</div>}
      {warnings && warnings.length > 0 && (
        <div className="ai-warnings">
          {warnings.map((w) => (
            <div key={w} className="ai-warning-item">⚠️ {w}</div>
          ))}
        </div>
      )}
    </div>
  );
};
