import type { ArchitectureModel } from '@cloudblocks/schema';
import type { StepValidationRule } from '../../shared/types/learning';
import { validateArchitecture } from '../../entities/validation/engine';

export interface RuleResult {
  rule: StepValidationRule;
  passed: boolean;
}

export interface ValidationResult {
  passed: boolean;
  results: RuleResult[];
}

export function evaluateRule(
  rule: StepValidationRule,
  model: ArchitectureModel
): boolean {
  switch (rule.type) {
    case 'plate-exists':
      return model.plates.some(
        (p) =>
          p.type === rule.plateType &&
          (rule.subnetAccess === undefined || p.subnetAccess === rule.subnetAccess)
      );

    case 'block-exists':
      return model.blocks.some((b) => {
        if (b.category !== rule.category) return false;
        if (rule.onPlateType === undefined) return true;
        const plate = model.plates.find((p) => p.id === b.placementId);
        if (!plate) return false;
        if (plate.type !== rule.onPlateType) return false;
        if (rule.onSubnetAccess !== undefined && plate.subnetAccess !== rule.onSubnetAccess) return false;
        return true;
      });

    case 'connection-exists':
      return model.connections.some((c) => {
        const sourceType = getEndpointType(c.sourceId, model);
        const targetType = getEndpointType(c.targetId, model);
        return sourceType === rule.sourceCategory && targetType === rule.targetCategory;
      });

    case 'entity-on-plate':
      return model.blocks.some((b) => {
        if (b.category !== rule.entityCategory) return false;
        const plate = model.plates.find((p) => p.id === b.placementId);
        if (!plate) return false;
        if (plate.type !== rule.plateType) return false;
        if (rule.subnetAccess !== undefined && plate.subnetAccess !== rule.subnetAccess) return false;
        return true;
      });

    case 'architecture-valid':
      return validateArchitecture(model).valid;

    case 'min-block-count':
      return model.blocks.filter((b) => b.category === rule.category).length >= rule.count;

    case 'min-plate-count':
      return model.plates.filter((p) => p.type === rule.plateType).length >= rule.count;

    default:
      return false;
  }
}

export function evaluateRules(
  rules: StepValidationRule[],
  model: ArchitectureModel
): ValidationResult {
  const results: RuleResult[] = rules.map((rule) => ({
    rule,
    passed: evaluateRule(rule, model),
  }));

  return {
    passed: results.every((r) => r.passed),
    results,
  };
}

function getEndpointType(
  id: string,
  model: ArchitectureModel
): string | null {
  const block = model.blocks.find((b) => b.id === id);
  if (block) return block.category;

  const actor = model.externalActors.find((a) => a.id === id);
  if (actor) return actor.type;

  return null;
}
