import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
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
 * 1. All resource nodes satisfy placement rules
 * 2. All connections satisfy connection rules
 * 3. All resource nodes satisfy aggregation rules (v2.0 §8)
 * 4. All resource nodes satisfy role rules (v2.0 §9)
 */
export function validateArchitecture(
  model: ArchitectureModel
): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  const containers = model.nodes.filter((n): n is ContainerNode => n.kind === 'container');
  const resources = model.nodes.filter((n): n is LeafNode => n.kind === 'resource');
  const externalActors = model.externalActors ?? [];

  // ── Placement validation ──
  for (const resource of resources) {
    const parent = containers.find((c) => c.id === resource.parentId);
    const error = validatePlacement(resource, parent);
    if (error) {
      if (error.severity === 'error') {
        errors.push(error);
      } else {
        warnings.push(error);
      }
    }
  }

  // ── Aggregation validation (v2.0 §8) ──
  for (const resource of resources) {
    const aggError = validateAggregation(resource);
    if (aggError) {
      if (aggError.severity === 'error') {
        errors.push(aggError);
      } else {
        warnings.push(aggError);
      }
    }
  }

  // ── Role validation (v2.0 §9) ──
  for (const resource of resources) {
    const roleError = validateRoles(resource);
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
      model.endpoints,
      model.nodes,
      externalActors
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
