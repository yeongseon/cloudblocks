import type {
  ArchitectureModel,
  ValidationResult,
} from '../../shared/types/index';
import { validatePlacement } from './placement';
import { validateConnection } from './connection';

/**
 * Rule Engine — validates an entire ArchitectureModel.
 *
 * Checks:
 * 1. All blocks satisfy placement rules
 * 2. All connections satisfy connection rules
 */
export function validateArchitecture(
  model: ArchitectureModel
): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // ── Placement validation ──
  for (const block of model.blocks) {
    const plate = model.plates.find((p) => p.id === block.placementId);
    const error = validatePlacement(block, plate);
    if (error) {
      if (error.severity === 'error') {
        errors.push(error);
      } else {
        warnings.push(error);
      }
    }
  }

  // ── Connection validation ──
  for (const connection of model.connections) {
    const error = validateConnection(
      connection,
      model.blocks,
      model.externalActors
    );
    if (error) {
      if (error.severity === 'error') {
        errors.push(error);
      } else {
        warnings.push(error);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
