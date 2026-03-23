import { useState, useCallback } from 'react';
import { useUIStore } from '../../entities/store/uiStore';
import { useHelperTrigger } from './useHelperTrigger';
import './FigureHelper.css';

export function FigureHelper() {
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
    <div className="figure-helper" data-testid="figure-helper">
      {showBubble && (
        <div
          className={`figure-helper__bubble figure-helper__bubble--${message.type}`}
          data-testid="figure-helper-bubble"
          role="status"
        >
          <p className="figure-helper__text">{message.text}</p>
          <div className="figure-helper__actions">
            {message.targetId && (
              <button
                type="button"
                className="figure-helper__btn figure-helper__btn--goto"
                data-testid="figure-helper-goto"
                onClick={handleGoTo}
              >
                Go to
              </button>
            )}
            <button
              type="button"
              className="figure-helper__btn figure-helper__btn--dismiss"
              data-testid="figure-helper-dismiss"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="figure-helper__toggle"
        data-testid="figure-helper-toggle"
        onClick={handleToggle}
        aria-label="Toggle helper"
      >
        ?
      </button>
    </div>
  );
}
