// CloudBlocks Domain — Validation types
// Types and interfaces for the rule engine shared between frontend and backend.

/**
 * Severity level for validation rules.
 *
 * Note: The backend suggestion system uses a separate `SuggestionSeverity`
 * ('critical' | 'warning' | 'info') which maps to this type:
 *   critical → error, warning → warning, info → (dropped or future extension)
 */
export type RuleSeverity = 'error' | 'warning';

/**
 * Category of validation rule.
 */
export type RuleType = 'placement' | 'connection';

/**
 * Metadata describing a single validation rule.
 */
export interface RuleDefinition {
  id: string;
  name: string;
  type: RuleType;
  severity: RuleSeverity;
  description: string;
}

/**
 * A single validation error or warning produced by the rule engine.
 */
export interface ValidationError {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  suggestion?: string;
  targetId: string; // block or connection ID
}

/**
 * Complete validation result returned by the rule engine.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
