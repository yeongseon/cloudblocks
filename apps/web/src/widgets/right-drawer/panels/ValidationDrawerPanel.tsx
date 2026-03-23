import { useCallback } from 'react';
import { Search, CheckCircle, Play, RefreshCw } from 'lucide-react';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { useUIStore } from '../../../entities/store/uiStore';
import type { ValidationError } from '@cloudblocks/domain';
import './ValidationDrawerPanel.css';

/**
 * Validation panel rendered inside the right drawer.
 *
 * Displays validation errors and warnings grouped by severity.
 * Clicking an item with a targetId selects the corresponding node
 * or connection on the canvas (click-to-focus).
 */
export function ValidationDrawerPanel() {
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const validate = useArchitectureStore((s) => s.validate);
  const setSelectedId = useUIStore((s) => s.setSelectedId);

  const handleItemClick = useCallback(
    (item: ValidationError) => {
      if (item.targetId && item.targetId.length > 0) {
        setSelectedId(item.targetId);
      }
    },
    [setSelectedId],
  );

  const handleRunValidation = useCallback(() => {
    validate();
  }, [validate]);

  if (!validationResult) {
    return (
      <div className="validation-drawer" data-testid="validation-drawer-panel">
        <div className="validation-drawer-empty">
          <span className="validation-drawer-empty-icon" aria-hidden="true">
            <Search size={24} />
          </span>
          No validation results yet.
          <br />
          Run validation to check your architecture.
        </div>
        <button
          type="button"
          className="validation-drawer-run"
          onClick={handleRunValidation}
          data-testid="validation-run-btn"
        >
          <Play size={12} /> Run Validation
        </button>
      </div>
    );
  }

  const errorCount = validationResult.errors.length;
  const warningCount = validationResult.warnings.length;
  const totalCount = errorCount + warningCount;

  return (
    <div className="validation-drawer" data-testid="validation-drawer-panel">
      {/* Status bar */}
      <div
        className="validation-drawer-status"
        data-valid={validationResult.valid}
        data-testid="validation-status"
      >
        <span>
          <span className="validation-drawer-status-icon" aria-hidden="true">
            {validationResult.valid ? '✓' : '✗'}
          </span>{' '}
          {validationResult.valid ? 'Valid' : 'Invalid'}
        </span>
        <span className="validation-drawer-counts">
          {totalCount === 0
            ? 'No issues'
            : `${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Errors section */}
      {errorCount > 0 && (
        <div className="validation-drawer-section">
          <h4 className="validation-drawer-section-title" data-severity="error">
            Errors ({errorCount})
          </h4>
          {validationResult.errors.map((error) => (
            <ValidationItem
              key={`${error.ruleId}-${error.targetId ?? 'unknown'}`}
              item={error}
              onClick={handleItemClick}
            />
          ))}
        </div>
      )}

      {/* Warnings section */}
      {warningCount > 0 && (
        <div className="validation-drawer-section">
          <h4 className="validation-drawer-section-title" data-severity="warning">
            Warnings ({warningCount})
          </h4>
          {validationResult.warnings.map((warning) => (
            <ValidationItem
              key={`${warning.ruleId}-${warning.targetId ?? 'unknown'}`}
              item={warning}
              onClick={handleItemClick}
            />
          ))}
        </div>
      )}

      {/* All clear */}
      {totalCount === 0 && (
        <div className="validation-drawer-empty">
          <span className="validation-drawer-empty-icon" aria-hidden="true">
            <CheckCircle size={24} />
          </span>
          Architecture is valid. No issues detected.
        </div>
      )}

      {/* Re-run button */}
      <button
        type="button"
        className="validation-drawer-run"
        onClick={handleRunValidation}
        data-testid="validation-run-btn"
      >
        <RefreshCw size={12} /> Re-run Validation
      </button>
    </div>
  );
}

/* ── Single validation item ── */

interface ValidationItemProps {
  item: ValidationError;
  onClick: (item: ValidationError) => void;
}

function ValidationItem({ item, onClick }: ValidationItemProps) {
  const hasTarget = Boolean(item.targetId && item.targetId.length > 0);

  return (
    <button
      type="button"
      className="validation-drawer-item"
      data-severity={item.severity}
      data-has-target={hasTarget}
      data-testid="validation-item"
      onClick={() => onClick(item)}
      aria-label={`${item.severity}: ${item.message}${hasTarget ? '. Click to focus.' : ''}`}
    >
      <span className="validation-drawer-item-message">{item.message}</span>
      {item.suggestion && (
        <span className="validation-drawer-item-suggestion">{item.suggestion}</span>
      )}
      <span className="validation-drawer-item-meta">
        {item.ruleId}
        {hasTarget ? ` · ${item.targetId}` : ''}
      </span>
    </button>
  );
}
