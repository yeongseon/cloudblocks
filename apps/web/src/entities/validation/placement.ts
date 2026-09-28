import type { ResourceBlock, ContainerBlock, ResourceCategory, Size } from '@cloudblocks/schema';
import {
  CATEGORY_DEFAULT_RESOURCE_TYPE,
  KNOWN_RESOURCE_TYPES,
  RESOURCE_RULES,
  getAllowedParents,
} from '@cloudblocks/schema';
import type { ResourceRuleEntry, ResourceType } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';
import { VALID_PARENTS, validateContainment } from '@cloudblocks/domain';
import type { LayerType } from '@cloudblocks/schema';
import { isGridAligned, planarOverlap } from '../../shared/types/planarGeometry';

/**
 * Placement Rules (v4.0 — canonical containment delegation):
 *
 * Rules are driven by RESOURCE_RULES (single source of truth) via the
 * canonical `validateContainment()` validator from @cloudblocks/domain.
 *
 * - Root placement: checked via ROOT_ALLOWED_RESOURCE_TYPES (per-resourceType).
 * - Container placement: delegated to validateContainment (per-resourceType).
 * - Grid alignment: integer CU positions required.
 * - No overlapping blocks.
 */

// ---------------------------------------------------------------------------
// Derived sets from RESOURCE_RULES
// ---------------------------------------------------------------------------

/** Human-readable label for a parent resourceType. */
const PARENT_LABEL: Record<string, string> = {
  subnet: 'Subnet',
  virtual_network: 'Region container',
};

/**
 * Build a set of resource types that allow root-level placement (no container).
 * A resource type allows root placement when its allowedParents includes `null`.
 */
function buildRootAllowedResourceTypes(): ReadonlySet<string> {
  const set = new Set<string>();
  const rules = RESOURCE_RULES as Record<string, ResourceRuleEntry>;

  for (const [resourceType, rule] of Object.entries(rules)) {
    if (rule.allowedParents.includes(null)) {
      set.add(resourceType);
    }
  }

  return set;
}

/** Resource types that allow root-level placement (allowedParents includes null). */
export const ROOT_ALLOWED_RESOURCE_TYPES = buildRootAllowedResourceTypes();

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

export function validatePlacement(
  resource: ResourceBlock,
  parent: ContainerBlock | undefined,
): ValidationError | null {
  if (!KNOWN_RESOURCE_TYPES.has(resource.resourceType)) {
    return {
      ruleId: 'rule-unknown-resource-type',
      severity: 'error',
      message: `"${resource.name}" uses an unknown resource type "${resource.resourceType}".`,
      suggestion:
        'This block came from an older or hand-edited file and cannot be validated or exported. Replace it with a resource from the palette.',
      targetId: resource.id,
    };
  }

  if (!parent) {
    // Root-level placement is valid for resource types whose allowedParents includes null
    if (ROOT_ALLOWED_RESOURCE_TYPES.has(resource.resourceType)) {
      return null;
    }
    return {
      ruleId: 'rule-container-exists',
      severity: 'error',
      message: `"${resource.name}" needs a container — place it on a Subnet or Region container.`,
      suggestion:
        'Most resources need a parent container to define their network scope. Drag this block onto a container on the canvas.',
      targetId: resource.id,
    };
  }

  // ── Canonical containment check (per-resourceType) ──
  const containmentErr = validateContainment(resource, parent);
  if (containmentErr) {
    const allowed = getAllowedParents(resource.resourceType);
    const parentTypes = allowed?.filter((p): p is string => p !== null) ?? [];
    const labels = parentTypes.map((t) => PARENT_LABEL[t] ?? t);
    const destination = labels.length > 0 ? labels.join(' or ') : 'valid container';
    return {
      ruleId: `rule-${resource.category}-parent`,
      severity: 'error',
      message: `"${resource.name}" is on the wrong container type — it needs a ${destination}.`,
      suggestion: `Each resource type has specific container requirements based on its cloud infrastructure role. Move this block to the correct container.`,
      targetId: resource.id,
    };
  }

  return null;
}

/**
 * Convenience wrapper for validatePlacement to check if a resource can be placed.
 * Used in drag-to-create flows to show/hide drop targets.
 *
 * When container is null, checks whether the resource type allows root-level placement.
 *
 * @param category - The resource category to check
 * @param container - The container to check placement against, or null for root placement
 * @param resourceType - Optional specific resource type (defaults to category)
 * @returns true if the resource can be placed, false otherwise
 */
export function canPlaceBlock(
  category: ResourceCategory,
  container: ContainerBlock | null,
  resourceType?: ResourceType | string,
): boolean {
  const effectiveResourceType =
    resourceType ?? CATEGORY_DEFAULT_RESOURCE_TYPE[category] ?? category;

  if (!container) {
    return ROOT_ALLOWED_RESOURCE_TYPES.has(effectiveResourceType);
  }

  const previewResource: ResourceBlock = {
    id: '__preview__',
    name: '__preview__',
    kind: 'resource',
    layer: 'resource',
    resourceType: effectiveResourceType,
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
      message: `"${resource.name}" can't go inside a "${container.layer}" container.`,
      suggestion: `Resources can be placed on: ${validParents.join(', ')}. This hierarchy mirrors how cloud providers organize infrastructure layers.`,
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
  if (!isGridAligned(resource.position)) {
    return {
      ruleId: 'rule-grid-alignment',
      severity: 'error',
      message: `"${resource.name}" is off the grid.`,
      suggestion:
        'Snap it to a grid position. All blocks align to a uniform grid to keep architectures tidy and readable.',
      targetId: resource.id,
    };
  }

  return null;
}

/**
 * Validate that a resource does not overlap with any sibling resource on the
 * same container, using the shared planar geometry contract (#1958).
 *
 * Reported as a warning rather than an error. Overlap is a layout problem, not
 * a corrupt model: the editor's own live guard deliberately allows dragging a
 * block that is *already* overlapping so the user can pull it out, and making
 * this blocking would also stop export for an architecture the editor let the
 * user build. Grid misalignment stays an error, because every generated and
 * reflowed position is now CU-aligned, so an off-grid value means hand-edited
 * or corrupt data.
 */
export function validateNoOverlap(
  resource: ResourceBlock,
  siblingResources: ResourceBlock[],
  getResourceSize: (resource: ResourceBlock) => Size,
): ValidationError | null {
  const blockSize = getResourceSize(resource);

  for (const sibling of siblingResources) {
    if (sibling.id === resource.id) continue;

    if (planarOverlap(resource.position, blockSize, sibling.position, getResourceSize(sibling))) {
      return {
        ruleId: 'rule-no-overlap',
        severity: 'warning',
        message: `"${resource.name}" overlaps with "${sibling.name}".`,
        suggestion:
          "Move one of them so they don't overlap. Each resource needs its own space on the container.",
        targetId: resource.id,
      };
    }
  }

  return null;
}
