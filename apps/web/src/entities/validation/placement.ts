import type { LeafNode, ContainerNode, ResourceCategory, Size } from '@cloudblocks/schema';
import { RESOURCE_RULES } from '@cloudblocks/schema';
import type { ResourceRuleEntry } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';
import { VALID_PARENTS } from '@cloudblocks/domain';
import type { LayerType } from '@cloudblocks/schema';

/**
 * Placement Rules (v3.0 — 7-category ResourceNode model):
 *
 * Rules are derived from RESOURCE_RULES (single source of truth).
 * At module load time we build a category → required-parent-layer map
 * so that `validatePlacement` and `canPlaceBlock` stay consistent
 * with the canonical constraint table.
 *
 * Additional UI-level constraints:
 * - edge resources require `subnetAccess: 'public'` on the parent container
 *
 * Layer hierarchy rules:
 * - Resources must be placed on valid parent layers
 * - All positions must be CU-aligned (integer)
 * - No overlapping blocks
 */

// ---------------------------------------------------------------------------
// Derived placement map from RESOURCE_RULES
// ---------------------------------------------------------------------------

/**
 * Maps parent resourceType → corresponding container layer.
 * This lets us translate RESOURCE_RULES' `allowedParents` (resourceType-based)
 * into layer-based checks that match how containers are rendered in the UI.
 */
const PARENT_RESOURCE_TYPE_TO_LAYER: Record<string, LayerType> = {
  subnet: 'subnet',
  virtual_network: 'region',
};

/**
 * Build a map of category → required parent layer from RESOURCE_RULES.
 * Only non-container resource types are included (containers don't need placement validation).
 *
 * For each category, we pick the first allowedParents entry and map it to a layer.
 * If all resources in a category have the same allowedParents, the result is deterministic.
 */
function buildCategoryPlacementMap(): Map<ResourceCategory, LayerType> {
  const map = new Map<ResourceCategory, LayerType>();
  const rules = RESOURCE_RULES as Record<string, ResourceRuleEntry>;

  for (const [, rule] of Object.entries(rules)) {
    if (rule.containerCapable) continue; // Skip containers
    if (map.has(rule.category)) continue; // First rule per category wins

    const parentType = rule.allowedParents[0];
    if (parentType === null) continue; // Root-level resources don't need placement validation

    const layer = PARENT_RESOURCE_TYPE_TO_LAYER[parentType];
    if (layer) {
      map.set(rule.category, layer);
    }
  }

  return map;
}

/** Category → required parent layer, derived from RESOURCE_RULES. */
const CATEGORY_REQUIRED_PARENT_LAYER = buildCategoryPlacementMap();

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

export function validatePlacement(
  resource: LeafNode,
  parent: ContainerNode | undefined
): ValidationError | null {
  if (!parent) {
    return {
      ruleId: 'rule-plate-exists',
      severity: 'error',
      message: `Resource "${resource.name}" is not placed on any container`,
      suggestion: 'Place the resource on a valid subnet container',
      targetId: resource.id,
    };
  }

  // ── Edge-specific: require public subnetAccess ──
  if (resource.category === 'edge') {
    if (parent.layer !== 'subnet' || parent.subnetAccess !== 'public') {
      return {
        ruleId: 'rule-edge-public',
        severity: 'error',
        message: `Edge resource "${resource.name}" must be placed on a public Subnet`,
        suggestion: 'Move the Edge resource to a Public Subnet',
        targetId: resource.id,
      };
    }
    return null;
  }

  // ── RESOURCE_RULES-driven placement check ──
  const requiredLayer = CATEGORY_REQUIRED_PARENT_LAYER.get(resource.category);
  if (requiredLayer && parent.layer !== requiredLayer) {
    const layerLabel = requiredLayer === 'subnet' ? 'Subnet' : 'Region container';
    const cat = resource.category.charAt(0).toUpperCase() + resource.category.slice(1);
    return {
      ruleId: `rule-${resource.category}-${requiredLayer}`,
      severity: 'error',
      message: `${cat} resource "${resource.name}" must be placed on a ${layerLabel}`,
      suggestion: `Move the ${cat} resource to a ${layerLabel}`,
      targetId: resource.id,
    };
  }

  return null;
}

/**
 * Convenience wrapper for validatePlacement to check if a resource can be placed on a container.
 * Used in drag-to-create flows to show/hide drop targets.
 *
 * @param category - The resource category to check
 * @param container - The container to check placement against
 * @returns true if the resource can be placed, false otherwise
 */
export function canPlaceBlock(category: ResourceCategory, container: ContainerNode): boolean {
  const stubResource: LeafNode = {
    id: '__preview__',
    name: '__preview__',
    kind: 'resource',
    layer: 'resource',
    resourceType: category,
    category,
    provider: 'azure',
    parentId: container.id,
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
  };

  const result = validatePlacement(stubResource, container);
  return result === null;
}

// ─── v2.0 Layer Hierarchy Validation ────────────────────────────

/**
 * Validate that a container's layer type is a valid parent for the 'resource' layer
 * according to the v2.0 6-layer hierarchy (VALID_PARENTS).
 *
 * Resources can be placed on: subnet, zone, region, edge, global.
 * This validates that the container's layer is in the allowed parent list for resources.
 */
export function validateLayerPlacement(
  resource: LeafNode,
  container: ContainerNode,
): ValidationError | null {
  const blockLayer: LayerType = 'resource';
  const validParents = VALID_PARENTS[blockLayer];

  if (!validParents.includes(container.layer as LayerType)) {
    return {
      ruleId: 'rule-layer-hierarchy',
      severity: 'error',
      message: `Resource "${resource.name}" cannot be placed on a "${container.layer}" container (invalid layer hierarchy)`,
      suggestion: `Valid parent layers for resources: ${validParents.join(', ')}`,
      targetId: resource.id,
    };
  }

  return null;
}

/**
 * Validate that a resource's position is CU-aligned (integer coordinates).
 * Spec §10: "All positions must be CU-aligned"
 * Spec §15: "Position not aligned to CU grid" → must reject
 */
export function validateGridAlignment(
  resource: LeafNode,
): ValidationError | null {
  const { x, z } = resource.position;

  if (!Number.isInteger(x) || !Number.isInteger(z)) {
    return {
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: `Resource "${resource.name}" position (${x}, ${z}) is not CU-aligned`,
      suggestion: 'Snap the resource to integer grid positions',
      targetId: resource.id,
    };
  }

  return null;
}

/**
 * Validate that a resource does not overlap with any sibling resource on the same container.
 * Spec §10: "Resources must not overlap"
 * Spec §15: "Resource overlapping another resource" → must reject
 *
 * Uses axis-aligned bounding box (AABB) overlap detection
 * in world coordinates (x, z plane).
 */
export function validateNoOverlap(
  resource: LeafNode,
  siblingResources: LeafNode[],
  getResourceSize: (resource: LeafNode) => Size,
): ValidationError | null {
  const blockSize = getResourceSize(resource);
  const bx1 = resource.position.x;
  const bz1 = resource.position.z;
  const bx2 = bx1 + blockSize.width;
  const bz2 = bz1 + blockSize.depth;

  for (const sibling of siblingResources) {
    if (sibling.id === resource.id) continue;

    const siblingSize = getResourceSize(sibling);
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
        message: `Resource "${resource.name}" overlaps with "${sibling.name}"`,
        suggestion: 'Move the resource to a non-overlapping position',
        targetId: resource.id,
      };
    }
  }

  return null;
}
