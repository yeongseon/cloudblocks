import type { ArchitectureModel, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import type { ValidationResult } from '@cloudblocks/domain';
import { validateGridAlignment, validateNoOverlap, validatePlacement } from './placement';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import { validateGraphInvariants } from './graph';
import { validateDedicatedSubnets } from './dedicatedSubnet';
import { validateConnection } from './connection';
import { validateProviderRules } from './providerValidation';
import { validateAggregation } from './aggregation';
import { validateRoles } from './role';

/**
 * Rule Engine — validates an entire ArchitectureModel.
 *
 * Checks:
 * 1. Dedicated-subnet constraints (#1928)
 * 2. Graph invariants — unique ids, parent links, dimensions, endpoint
 *    ownership and port capacity (#1953)
 * 3. All resource nodes satisfy placement, grid-alignment and overlap rules
 * 4. All connections satisfy connection rules
 * 5. All resource nodes satisfy aggregation rules (v2.0 §8)
 * 6. All resource nodes satisfy role rules (v2.0 §9)
 */
export function validateArchitecture(model: ArchitectureModel): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  const containers = model.nodes.filter((n): n is ContainerBlock => n.kind === 'container');
  const resources = model.nodes.filter((n): n is ResourceBlock => n.kind === 'resource');

  // ── Dedicated subnet constraints (#1928) ──
  errors.push(...validateDedicatedSubnets(model));

  // ── Graph invariants ──
  for (const issue of validateGraphInvariants(model)) {
    if (issue.severity === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  // ── Placement validation ──
  const resourceSize = (resource: ResourceBlock) =>
    getBlockDimensions(resource.category, resource.provider, resource.subtype);

  for (const resource of resources) {
    const parent = containers.find((c) => c.id === resource.parentId);
    const siblings = resources.filter((candidate) => candidate.parentId === resource.parentId);

    for (const error of [
      validatePlacement(resource, parent),
      validateGridAlignment(resource),
      validateNoOverlap(resource, siblings, resourceSize),
    ]) {
      if (!error) continue;
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
    const error = validateConnection(connection, model.endpoints, model.nodes);
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
