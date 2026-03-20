import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import './AiPromptBar.css';

interface AiPromptBarProps {
  onSubmit: (prompt: string, provider: string) => void;
  isLoading: boolean;
  provider: string;
  error?: string;
}

export const AiPromptBar: React.FC<AiPromptBarProps> = ({ onSubmit, isLoading, provider, error }) => {
  const [prompt, setPrompt] = useState('');

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
        <span className="ai-provider-label">{provider.toUpperCase()}</span>
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
    </div>
  );
};
