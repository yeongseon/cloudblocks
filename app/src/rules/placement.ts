import type {
  Block,
  Plate,
  ValidationError,
} from '../models/types';

/**
 * Placement Rules (from DOMAIN_MODEL.md §6):
 *
 * - ComputeBlock must be placed on SubnetPlate
 * - DatabaseBlock must be placed on private SubnetPlate
 * - GatewayBlock must be placed on public SubnetPlate
 * - StorageBlock must be placed on SubnetPlate
 */

export function validatePlacement(
  block: Block,
  plate: Plate | undefined
): ValidationError | null {
  if (!plate) {
    return {
      ruleId: 'rule-plate-exists',
      severity: 'error',
      message: `Block "${block.name}" is not placed on any plate`,
      suggestion: 'Place the block on a valid subnet plate',
      targetId: block.id,
    };
  }

  switch (block.category) {
    case 'compute':
      if (plate.type !== 'subnet') {
        return {
          ruleId: 'rule-compute-subnet',
          severity: 'error',
          message: `Compute block "${block.name}" must be placed on a Subnet Plate`,
          suggestion: 'Move the Compute block to a Subnet Plate',
          targetId: block.id,
        };
      }
      break;

    case 'database':
      if (plate.type !== 'subnet' || plate.subnetAccess !== 'private') {
        return {
          ruleId: 'rule-db-private',
          severity: 'error',
          message: `Database block "${block.name}" must be placed on a private Subnet Plate`,
          suggestion: 'Move the Database block to a Private Subnet Plate',
          targetId: block.id,
        };
      }
      break;

    case 'gateway':
      if (plate.type !== 'subnet' || plate.subnetAccess !== 'public') {
        return {
          ruleId: 'rule-gw-public',
          severity: 'error',
          message: `Gateway block "${block.name}" must be placed on a public Subnet Plate`,
          suggestion: 'Move the Gateway block to a Public Subnet Plate',
          targetId: block.id,
        };
      }
      break;

    case 'storage':
      if (plate.type !== 'subnet') {
        return {
          ruleId: 'rule-storage-subnet',
          severity: 'error',
          message: `Storage block "${block.name}" must be placed on a Subnet Plate`,
          suggestion: 'Move the Storage block to a Subnet Plate',
          targetId: block.id,
        };
      }
      break;
  }

  return null;
}
