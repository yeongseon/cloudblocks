import type {
  Block,
  BlockCategory,
  Plate,
  Size,
  ValidationError,
} from '../../shared/types/index';
import { VALID_PARENTS } from '../../shared/types/index';
import type { LayerType } from '../../shared/types/index';

/**
 * Placement Rules (v2.0 — CLOUDBLOCKS_SPEC_V2.md §10, §15):
 *
 * Legacy category-based rules (§6 v1.x):
 * - ComputeBlock must be placed on SubnetPlate
 * - DatabaseBlock must be placed on private SubnetPlate
 * - GatewayBlock must be placed on public SubnetPlate
 * - StorageBlock must be placed on SubnetPlate
 * - AnalyticsBlock must be placed on SubnetPlate
 * - IdentityBlock must be placed on SubnetPlate
 * - ObservabilityBlock must be placed on SubnetPlate
 * - FunctionBlock must be placed on NetworkPlate (not Subnet)
 * - QueueBlock must be placed on NetworkPlate (not Subnet)
 * - EventBlock must be placed on NetworkPlate (not Subnet)
 *
 * v2.0 layer hierarchy rules (§10):
 * - Global resources cannot be inside subnet
 * - Edge resources cannot be inside zone
 * - Zone resources must belong to a zone
 * - Subnet resources must belong to a subnet
 * - Blocks must stay inside parent plate
 * - No overlapping blocks
 * - Grid snap: all positions must be CU-aligned (integer)
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

// ─── v2.0 Layer Hierarchy Validation ────────────────────────────

/**
 * Validate that a plate's layer type is a valid parent for the 'resource' layer
 * according to the v2.0 6-layer hierarchy (VALID_PARENTS).
 *
 * Resources (blocks) can be placed on: subnet, zone, region, edge, global.
 * This validates that the plate type is in the allowed parent list for resources.
 */
export function validateLayerPlacement(
  block: Block,
  plate: Plate,
): ValidationError | null {
  const blockLayer: LayerType = 'resource';
  const validParents = VALID_PARENTS[blockLayer];

  if (!validParents.includes(plate.type as LayerType)) {
    return {
      ruleId: 'rule-layer-hierarchy',
      severity: 'error',
      message: `Block "${block.name}" cannot be placed on a "${plate.type}" plate (invalid layer hierarchy)`,
      suggestion: `Valid parent layers for resources: ${validParents.join(', ')}`,
      targetId: block.id,
    };
  }

  return null;
}

/**
 * Validate that a block's position is CU-aligned (integer coordinates).
 * Spec §10: "All positions must be CU-aligned"
 * Spec §15: "Position not aligned to CU grid" → must reject
 */
export function validateGridAlignment(
  block: Block,
): ValidationError | null {
  const { x, z } = block.position;

  if (!Number.isInteger(x) || !Number.isInteger(z)) {
    return {
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: `Block "${block.name}" position (${x}, ${z}) is not CU-aligned`,
      suggestion: 'Snap the block to integer grid positions',
      targetId: block.id,
    };
  }

  return null;
}

/**
 * Validate that a block does not overlap with any sibling block on the same plate.
 * Spec §10: "Blocks must not overlap"
 * Spec §15: "Block overlapping another block" → must reject
 *
 * Uses axis-aligned bounding box (AABB) overlap detection
 * in world coordinates (x, z plane).
 */
export function validateNoOverlap(
  block: Block,
  siblingBlocks: Block[],
  getBlockSize: (block: Block) => Size,
): ValidationError | null {
  const blockSize = getBlockSize(block);
  const bx1 = block.position.x;
  const bz1 = block.position.z;
  const bx2 = bx1 + blockSize.width;
  const bz2 = bz1 + blockSize.depth;

  for (const sibling of siblingBlocks) {
    if (sibling.id === block.id) continue;

    const siblingSize = getBlockSize(sibling);
    const sx1 = sibling.position.x;
    const sz1 = sibling.position.z;
    const sx2 = sx1 + siblingSize.width;
    const sz2 = sz1 + siblingSize.depth;

    // AABB overlap: two rectangles overlap if they overlap on both axes
    const overlapX = bx1 < sx2 && bx2 > sx1;
    const overlapZ = bz1 < sz2 && bz2 > sz1;

    if (overlapX && overlapZ) {
      return {
        ruleId: 'rule-no-overlap',
        severity: 'error',
        message: `Block "${block.name}" overlaps with "${sibling.name}"`,
        suggestion: 'Move the block to a non-overlapping position',
        targetId: block.id,
      };
    }
  }

  return null;
}
