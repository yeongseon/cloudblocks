import type { ResourceBlock, ContainerBlock, ResourceCategory, Size } from '@cloudblocks/schema';
import { RESOURCE_RULES } from '@cloudblocks/schema';
import type { ResourceRuleEntry } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';
import { VALID_PARENTS } from '@cloudblocks/domain';
import type { LayerType } from '@cloudblocks/schema';

/**
 * Placement Rules (v3.0 — 8-category Block model):
 * Placement Rules (v3.0 — 7-category Block model):
 *
 * Rules are derived from RESOURCE_RULES (single source of truth).
 * At module load time we build a category → required-parent-layer map
 * so that `validatePlacement` and `canPlaceBlock` stay consistent
 * with the canonical constraint table.
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
 * Build a map of category → allowed parent layers from RESOURCE_RULES.
 * Only non-container resource types are included (containers don't need placement validation).
 *
 * For each category, we collect ALL allowedParents entries and map them to layers,
 * so resources allowed in multiple parent types are correctly validated.
 */
function buildCategoryPlacementMap(): Map<ResourceCategory, Set<LayerType>> {
  const map = new Map<ResourceCategory, Set<LayerType>>();
  const rules = RESOURCE_RULES as Record<string, ResourceRuleEntry>;

  for (const [, rule] of Object.entries(rules)) {
    if (rule.containerCapable) continue;

    if (!map.has(rule.category)) {
      map.set(rule.category, new Set<LayerType>());
    }

    const layers = map.get(rule.category)!;
    for (const parentType of rule.allowedParents) {
      if (parentType === null) continue;
      const layer = PARENT_RESOURCE_TYPE_TO_LAYER[parentType];
      if (layer) {
        layers.add(layer);
      }
    }
  }

  return map;
}

/** Category → allowed parent layers, derived from RESOURCE_RULES. */
const CATEGORY_ALLOWED_PARENT_LAYERS = buildCategoryPlacementMap();

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

export function validatePlacement(
  resource: ResourceBlock,
  parent: ContainerBlock | undefined,
): ValidationError | null {
  if (!parent) {
    return {
      ruleId: 'rule-container-exists',
      severity: 'error',
      message: `Resource "${resource.name}" is not placed on any container`,
      suggestion: 'Place the resource on a valid subnet container',
      targetId: resource.id,
    };
  }

  // ── RESOURCE_RULES-driven placement check ──
  const allowedLayers = CATEGORY_ALLOWED_PARENT_LAYERS.get(resource.category);
  if (
    allowedLayers &&
    Array.from(allowedLayers).length > 0 &&
    !allowedLayers.has(parent.layer as LayerType)
  ) {
    const layerLabels = [...allowedLayers].map((l) =>
      l === 'subnet' ? 'Subnet' : 'Region container',
    );
    const cat = resource.category.charAt(0).toUpperCase() + resource.category.slice(1);
    return {
      ruleId: `rule-${resource.category}-parent`,
      severity: 'error',
      message: `${cat} resource "${resource.name}" must be placed on a ${layerLabels.join(' or ')}`,
      suggestion: `Move the ${cat} resource to a ${layerLabels.join(' or ')}`,
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
export function canPlaceBlock(category: ResourceCategory, container: ContainerBlock): boolean {
  const previewResource: ResourceBlock = {
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

  const result = validatePlacement(previewResource, container);
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
  resource: ResourceBlock,
  container: ContainerBlock,
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
export function validateGridAlignment(resource: ResourceBlock): ValidationError | null {
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
  resource: ResourceBlock,
  siblingResources: ResourceBlock[],
  getResourceSize: (resource: ResourceBlock) => Size,
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
