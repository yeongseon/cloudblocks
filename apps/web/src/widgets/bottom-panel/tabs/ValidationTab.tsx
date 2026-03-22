import { useArchitectureStore } from '../../../entities/store/architectureStore';
import '../../validation-panel/ValidationPanel.css';
import './ValidationTab.css';

export function ValidationTab() {
  const validationResult = useArchitectureStore((s) => s.validationResult);

  if (!validationResult) {
    return (
      <div className="bottom-dock-validation">
        <div className="validation-panel">
          <div className="validation-success">
            No validation results. Run validation from the menu.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bottom-dock-validation">
      <div className="validation-panel">
        <h3 className="validation-title">
          Validation Results
          <span
            className={`validation-status ${validationResult.valid ? 'validation-valid' : 'validation-invalid'}`}
          >
            {validationResult.valid ? 'VALID' : 'INVALID'}
          </span>
        </h3>

        {validationResult.errors.length > 0 && (
          <div className="validation-section">
            <h4 className="validation-section-title">Errors ({validationResult.errors.length})</h4>
            {validationResult.errors.map((error) => (
              <div key={`${error.ruleId}-${error.targetId ?? 'unknown'}`} className="validation-item validation-error">
                <div className="validation-message">{error.message}</div>
                {error.suggestion && (
                  <div className="validation-suggestion">
                    {error.suggestion}
                  </div>
                )}
                <div className="validation-meta">
                  Rule: {error.ruleId} | Target: {error.targetId && error.targetId.length > 0 ? error.targetId : 'Unknown target'}
                </div>
              </div>
            ))}
          </div>
        )}

        {validationResult.warnings.length > 0 && (
          <div className="validation-section">
            <h4 className="validation-section-title">Warnings ({validationResult.warnings.length})</h4>
            {validationResult.warnings.map((warning) => (
              <div key={`${warning.ruleId}-${warning.targetId ?? 'unknown'}`} className="validation-item validation-warning">
                <div className="validation-message">{warning.message}</div>
                {warning.suggestion && (
                  <div className="validation-suggestion">
                    {warning.suggestion}
                  </div>
                )}
                <div className="validation-meta">
                  Rule: {warning.ruleId} | Target: {warning.targetId && warning.targetId.length > 0 ? warning.targetId : 'Unknown target'}
                </div>
              </div>
            ))}
          </div>
        )}

        {validationResult.valid && validationResult.warnings.length === 0 && (
          <div className="validation-success">
            Architecture is valid! No rule violations detected.
          </div>
        )}

        {validationResult.valid && validationResult.warnings.length > 0 && (
          <div className="validation-success">
            No blocking errors detected.
          </div>
        )}
      </div>
    </div>
  );
}
