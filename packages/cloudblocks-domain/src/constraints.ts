// CloudBlocks Domain — Resource constraint validation
// Runtime validators driven by RESOURCE_RULES from @cloudblocks/schema.
// These are the canonical functions for placement and block integrity checks.

import { RESOURCE_RULES, getAllowedParents } from '@cloudblocks/schema';
import type { Block } from '@cloudblocks/schema';

// ---------------------------------------------------------------------------
// Containment validation (Proposal 3)
// ---------------------------------------------------------------------------

export interface ContainmentError {
  childId: string;
  childResourceType: string;
  parentId: string | null;
  parentResourceType: string | null;
  reason: string;
}

/**
 * Validate whether a child block can be placed inside a parent block.
 *
 * Rules:
 * - If `allowedParents` includes `null`, the child can be root-level (parentBlock = undefined).
 * - Otherwise the parent's resourceType must be in the child's `allowedParents`.
 * - Unknown resource types are allowed (graceful degradation for future extensions).
 *
 * @returns `null` if valid, or a `ContainmentError` describing the violation.
 */
export function validateContainment(
  child: Block,
  parent: Block | null | undefined,
): ContainmentError | null {
  const allowedParents = getAllowedParents(child.resourceType);

  // Unknown resource type — skip validation (graceful for future extensions)
  if (allowedParents === undefined) {
    return null;
  }

  // Root placement
  if (parent == null) {
    if (allowedParents.includes(null)) {
      return null;
    }
    return {
      childId: child.id,
      childResourceType: child.resourceType,
      parentId: null,
      parentResourceType: null,
      reason: `${child.resourceType} cannot be placed at root level. Allowed parents: ${allowedParents.filter((p) => p !== null).join(', ')}`,
    };
  }

  // Parent placement
  if (allowedParents.includes(parent.resourceType)) {
    return null;
  }

  return {
    childId: child.id,
    childResourceType: child.resourceType,
    parentId: parent.id,
    parentResourceType: parent.resourceType,
    reason: `${child.resourceType} cannot be placed inside ${parent.resourceType}. Allowed parents: ${allowedParents.filter((p) => p !== null).join(', ') || '(root only)'}`,
  };
}

// ---------------------------------------------------------------------------
// Block integrity validation (Proposal 1)
// ---------------------------------------------------------------------------

export interface BlockIntegrityError {
  blockId: string;
  field: string;
  reason: string;
}

/**
 * Validate that a block's `kind` is consistent with its `resourceType`.
 *
 * Rules:
 * - If resourceType is known and `containerCapable` is false, kind must be 'resource'.
 * - If resourceType is known and `containerCapable` is true, kind can be either
 *   (containers can also theoretically be leaves, though unusual).
 * - Unknown resource types pass validation (graceful degradation).
 *
 * @returns Array of integrity errors (empty if valid).
 */
export function validateBlockIntegrity(block: Block): BlockIntegrityError[] {
  const errors: BlockIntegrityError[] = [];
  const rule = (RESOURCE_RULES as Record<string, { containerCapable: boolean }>)[
    block.resourceType
  ];

  if (rule === undefined) {
    // Unknown resource type — skip (graceful)
    return errors;
  }

  // kind: 'container' on a non-container-capable resource type
  if (block.kind === 'container' && !rule.containerCapable) {
    errors.push({
      blockId: block.id,
      field: 'kind',
      reason: `${block.resourceType} cannot be kind='container'. Only container-capable types (${Object.entries(
        RESOURCE_RULES,
      )
        .filter(([, r]) => r.containerCapable)
        .map(([k]) => k)
        .join(', ')}) can be containers.`,
    });
  }

  return errors;
}

/**
 * Convenience: validate both block integrity and containment in one call.
 * Looks up the parent from a flat blocks array.
 */
export function validateBlockPlacement(
  block: Block,
  allBlocks: readonly Block[],
): (BlockIntegrityError | ContainmentError)[] {
  const errors: (BlockIntegrityError | ContainmentError)[] = [];

  // 1. Block integrity (kind vs resourceType)
  errors.push(...validateBlockIntegrity(block));

  // 2. Containment (parent validation)
  const parent = block.parentId ? (allBlocks.find((n) => n.id === block.parentId) ?? null) : null;
  const containmentError = validateContainment(block, parent);
  if (containmentError) {
    errors.push(containmentError);
  }

  return errors;
}
