import type {
  Block,
  BlockCategory,
  Plate,
  ValidationError,
} from '../../shared/types/index';

/**
 * Placement Rules (from DOMAIN_MODEL.md §6):
 *
 * - ComputeBlock must be placed on SubnetPlate
 * - DatabaseBlock must be placed on private SubnetPlate
 * - GatewayBlock must be placed on public SubnetPlate
 * - StorageBlock must be placed on SubnetPlate
 * - AnalyticsBlock must be placed on SubnetPlate
 * - IdentityBlock must be placed on SubnetPlate
 * - ObservabilityBlock must be placed on SubnetPlate
 * - FunctionBlock must be placed on NetworkPlate (not Subnet) — v1.0
 * - QueueBlock must be placed on NetworkPlate (not Subnet) — v1.0
 * - EventBlock must be placed on NetworkPlate (not Subnet) — v1.0
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

    case 'analytics':
      if (plate.type !== 'subnet') {
        return {
          ruleId: 'rule-analytics-subnet',
          severity: 'error',
          message: `Analytics block "${block.name}" must be placed on a Subnet Plate`,
          suggestion: 'Move the Analytics block to a Subnet Plate',
          targetId: block.id,
        };
      }
      break;

    case 'identity':
      if (plate.type !== 'subnet') {
        return {
          ruleId: 'rule-identity-subnet',
          severity: 'error',
          message: `Identity block "${block.name}" must be placed on a Subnet Plate`,
          suggestion: 'Move the Identity block to a Subnet Plate',
          targetId: block.id,
        };
      }
      break;

    case 'observability':
      if (plate.type !== 'subnet') {
        return {
          ruleId: 'rule-observability-subnet',
          severity: 'error',
          message: `Observability block "${block.name}" must be placed on a Subnet Plate`,
          suggestion: 'Move the Observability block to a Subnet Plate',
          targetId: block.id,
        };
      }
      break;

    case 'function':
    case 'queue':
    case 'event':
      if (plate.type !== 'region') {
        return {
          ruleId: 'rule-serverless-network',
          severity: 'error',
          message: `${block.category.charAt(0).toUpperCase() + block.category.slice(1)} block "${block.name}" must be placed on a Region Plate`,
          suggestion: `Move the ${block.category.charAt(0).toUpperCase() + block.category.slice(1)} block to a Region Plate (not a Subnet)`,
          targetId: block.id,
        };
      }
      break;

    default:
      break;
  }

  return null;
}

/**
 * Convenience wrapper for validatePlacement to check if a block can be placed on a plate.
 * Used in drag-to-create flows to show/hide drop targets.
 *
 * @param category - The block category to check
 * @param plate - The plate to check placement against
 * @returns true if the block can be placed, false otherwise
 */
export function canPlaceBlock(category: BlockCategory, plate: Plate): boolean {
  const stubBlock: Block = {
    id: '__preview__',
    name: '__preview__',
    category,
    placementId: plate.id,
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
  };

  const result = validatePlacement(stubBlock, plate);
  return result === null;
}
