import { useState, useCallback } from 'react';
import { useUIStore } from '../../entities/store/uiStore';
import { useHelperTrigger } from './useHelperTrigger';
import './Helper.css';

export function Helper() {
  const message = useHelperTrigger();
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const handleDismiss = useCallback(() => {
    if (message) {
      setDismissed((prev) => new Set(prev).add(message.key));
    }
    setBubbleOpen(false);
  }, [message]);

  const handleGoTo = useCallback(() => {
    if (message?.targetId) {
      setSelectedId(message.targetId);
    }
  }, [message, setSelectedId]);

  const handleToggle = useCallback(() => {
    setBubbleOpen((prev) => !prev);
  }, []);

  if (!message) return null;

  const showBubble = bubbleOpen && !dismissed.has(message.key);

  return (
    <div className="helper-widget" data-testid="helper-widget">
      {showBubble && (
        <div
          className={`helper-widget__bubble helper-widget__bubble--${message.type}`}
          data-testid="helper-widget-bubble"
          role="status"
        >
          <p className="helper-widget__text">{message.text}</p>
          <div className="helper-widget__actions">
            {message.targetId && (
              <button
                type="button"
                className="helper-widget__btn helper-widget__btn--goto"
                data-testid="helper-widget-goto"
                onClick={handleGoTo}
              >
                Go to
              </button>
            )}
            <button
              type="button"
              className="helper-widget__btn helper-widget__btn--dismiss"
              data-testid="helper-widget-dismiss"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="helper-widget__toggle"
        data-testid="helper-widget-toggle"
        onClick={handleToggle}
        aria-label="Toggle helper"
      >
        ?
      </button>
    </div>
  );
}
