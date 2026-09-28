import type { ArchitectureModel, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { requiresDedicatedSubnet } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';

/**
 * Dedicated-subnet constraints (#1928).
 *
 * Application Gateway, Bastion and Firewall cannot share a subnet — Azure
 * refuses the deployment outright, so an architecture that puts anything else
 * alongside them is not merely untidy, it is undeployable. Containment alone
 * cannot express that: `allowedParents: ['subnet']` says *which* parent is
 * legal, not that the parent must be exclusive.
 *
 * This is the constraint half of #1928. Private endpoint targets and VNet
 * Integration direction need a relationship the wire format does not carry yet
 * and are tracked separately.
 */
export function validateDedicatedSubnets(model: ArchitectureModel): ValidationError[] {
  const resources = model.nodes.filter((node): node is ResourceBlock => node.kind === 'resource');
  const subnets = new Map(
    model.nodes
      .filter((node): node is ContainerBlock => node.kind === 'container')
      .map((container) => [container.id, container]),
  );

  const errors: ValidationError[] = [];

  for (const resource of resources) {
    if (!requiresDedicatedSubnet(resource.resourceType) || resource.parentId === null) {
      continue;
    }

    if (!subnets.has(resource.parentId)) {
      continue;
    }

    const coTenants = resources.filter(
      (candidate) => candidate.parentId === resource.parentId && candidate.id !== resource.id,
    );

    if (coTenants.length === 0) {
      continue;
    }

    const names = coTenants.map((candidate) => `"${candidate.name}"`).join(', ');
    errors.push({
      ruleId: 'rule-dedicated-subnet',
      severity: 'error',
      message: `"${resource.name}" needs a subnet of its own, but it shares one with ${names}.`,
      suggestion:
        'Azure will not deploy this resource into a shared subnet. Create a separate subnet for it and move the other resources out.',
      targetId: resource.id,
    });
  }

  return errors;
}
