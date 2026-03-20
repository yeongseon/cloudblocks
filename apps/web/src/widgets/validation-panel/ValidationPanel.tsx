import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import './ValidationPanel.css';

export function ValidationPanel() {
  const showValidation = useUIStore((s) => s.showValidation);
  const validationResult = useArchitectureStore((s) => s.validationResult);

  if (!showValidation || !validationResult) return null;

  return (
    <div className="validation-panel">
      <h3 className="validation-title">
        📊 Validation Results
        <span
          className={`validation-status ${validationResult.valid ? 'validation-valid' : 'validation-invalid'}`}
        >
          {validationResult.valid ? '✓ VALID' : '✗ INVALID'}
        </span>
      </h3>

      {validationResult.errors.length > 0 && (
        <div className="validation-section">
          <h4 className="validation-section-title">Errors ({validationResult.errors.length})</h4>
          {validationResult.errors.map((error, i) => (
            <div key={i} className="validation-item validation-error">
              <div className="validation-message">{error.message}</div>
              {error.suggestion && (
                <div className="validation-suggestion">
                  💡 {error.suggestion}
                </div>
              )}
              <div className="validation-meta">
                Rule: {error.ruleId} | Target: {error.targetId}
              </div>
            </div>
          ))}
        </div>
      )}

      {validationResult.warnings.length > 0 && (
        <div className="validation-section">
          <h4 className="validation-section-title">Warnings ({validationResult.warnings.length})</h4>
          {validationResult.warnings.map((warning, i) => (
            <div key={i} className="validation-item validation-warning">
              <div className="validation-message">{warning.message}</div>
              {warning.suggestion && (
                <div className="validation-suggestion">
                  💡 {warning.suggestion}
                </div>
              )}
              <div className="validation-meta">
                Rule: {warning.ruleId} | Target: {warning.targetId}
              </div>
            </div>
          ))}
        </div>
      )}

      {validationResult.valid && (
        <div className="validation-success">
          ✅ Architecture is valid! No rule violations detected.
        </div>
      )}
    </div>
  );
}
