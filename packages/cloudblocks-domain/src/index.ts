// CloudBlocks Domain — Shared domain logic
// Business-logic constants, hierarchy rules, and validation types
// shared between frontend and backend.

export const DOMAIN_VERSION = '0.1.0';

// Layer hierarchy rules
export { VALID_PARENTS } from './hierarchy.js';

// Resource constraint validation (Proposals 1–3)
export {
  validateContainment,
  validateNodeIntegrity,
  validateNodePlacement,
} from './constraints.js';
export type {
  ContainmentError,
  NodeIntegrityError,
} from './constraints.js';

// Human-readable labels and role constants
export { CONNECTION_TYPE_LABELS, BLOCK_ROLES } from './labels.js';

// Validation types
export type {
  RuleSeverity,
  RuleType,
  RuleDefinition,
  ValidationError,
  ValidationResult,
} from './validation.js';
