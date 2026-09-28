// CloudBlocks Domain — Resource constraint validation
// Runtime validators driven by RESOURCE_RULES from @cloudblocks/schema.
// These are the canonical functions for placement and block integrity checks.

import {
  KNOWN_RESOURCE_TYPES,
  RESOURCE_RULES,
  getAllowedParents,
  isContainerCapable,
} from '@cloudblocks/schema';
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
 * - Unknown resource types are rejected: an identity the registry does not know
 *   carries no constraints, so accepting it would bypass containment entirely.
 *
 * @returns `null` if valid, or a `ContainmentError` describing the violation.
 */
export function validateContainment(
  child: Block,
  parent: Block | null | undefined,
): ContainmentError | null {
  const allowedParents = getAllowedParents(child.resourceType);

  if (allowedParents === undefined) {
    return {
      childId: child.id,
      childResourceType: child.resourceType,
      parentId: parent?.id ?? null,
      parentResourceType: parent?.resourceType ?? null,
      reason: `${child.resourceType} is not a known resource type, so its placement cannot be validated.`,
    };
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
 * - Unknown resource types are rejected — `kind` cannot be checked without a rule.
 * - If `containerCapable` is false, kind must be 'resource'.
 * - If `containerCapable` is true, kind can be either (containers can also
 *   theoretically be leaves, though unusual).
 *
 * @returns Array of integrity errors (empty if valid).
 */
export function validateBlockIntegrity(block: Block): BlockIntegrityError[] {
  const errors: BlockIntegrityError[] = [];

  if (!KNOWN_RESOURCE_TYPES.has(block.resourceType)) {
    errors.push({
      blockId: block.id,
      field: 'resourceType',
      reason: `${block.resourceType} is not a known resource type.`,
    });
    return errors;
  }

  // kind: 'container' on a non-container-capable resource type
  if (block.kind === 'container' && !isContainerCapable(block.resourceType)) {
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
