import type { ArchitectureModel } from '@cloudblocks/schema';
import type { ValidationResult } from '@cloudblocks/domain';
import { validatePlacement } from './placement';
import { validateConnection } from './connection';
import { validateProviderRules } from './providerValidation';
import { validateAggregation } from './aggregation';
import { validateRoles } from './role';

/**
 * Rule Engine — validates an entire ArchitectureModel.
 *
 * Checks:
 * 1. All blocks satisfy placement rules
 * 2. All connections satisfy connection rules
 * 3. All blocks satisfy aggregation rules (v2.0 §8)
 * 4. All blocks satisfy role rules (v2.0 §9)
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

  // ── Aggregation validation (v2.0 §8) ──
  for (const block of model.blocks) {
    const aggError = validateAggregation(block);
    if (aggError) {
      if (aggError.severity === 'error') {
        errors.push(aggError);
      } else {
        warnings.push(aggError);
      }
    }
  }

  // ── Role validation (v2.0 §9) ──
  for (const block of model.blocks) {
    const roleError = validateRoles(block);
    if (roleError) {
      if (roleError.severity === 'error') {
        errors.push(roleError);
      } else {
        warnings.push(roleError);
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

  const providerWarnings = validateProviderRules(model);
  warnings.push(...providerWarnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
