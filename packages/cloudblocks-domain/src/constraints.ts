// CloudBlocks Domain — Resource constraint validation
// Runtime validators driven by RESOURCE_RULES from @cloudblocks/schema.
// These are the canonical functions for placement and node integrity checks.

import {
  RESOURCE_RULES,
  getAllowedParents,
} from '@cloudblocks/schema';
import type { ResourceNode } from '@cloudblocks/schema';

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
 * Validate whether a child node can be placed inside a parent node.
 *
 * Rules:
 * - If `allowedParents` includes `null`, the child can be root-level (parentNode = undefined).
 * - Otherwise the parent's resourceType must be in the child's `allowedParents`.
 * - Unknown resource types are allowed (graceful degradation for future extensions).
 *
 * @returns `null` if valid, or a `ContainmentError` describing the violation.
 */
export function validateContainment(
  child: ResourceNode,
  parent: ResourceNode | null | undefined,
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
      reason: `${child.resourceType} cannot be placed at root level. Allowed parents: ${allowedParents.filter(p => p !== null).join(', ')}`,
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
    reason: `${child.resourceType} cannot be placed inside ${parent.resourceType}. Allowed parents: ${allowedParents.filter(p => p !== null).join(', ') || '(root only)'}`,
  };
}

// ---------------------------------------------------------------------------
// Node integrity validation (Proposal 1)
// ---------------------------------------------------------------------------

export interface NodeIntegrityError {
  nodeId: string;
  field: string;
  reason: string;
}

/**
 * Validate that a node's `kind` is consistent with its `resourceType`.
 *
 * Rules:
 * - If resourceType is known and `containerCapable` is false, kind must be 'resource'.
 * - If resourceType is known and `containerCapable` is true, kind can be either
 *   (containers can also theoretically be leaves, though unusual).
 * - Unknown resource types pass validation (graceful degradation).
 *
 * @returns Array of integrity errors (empty if valid).
 */
export function validateNodeIntegrity(node: ResourceNode): NodeIntegrityError[] {
  const errors: NodeIntegrityError[] = [];
  const rule = (RESOURCE_RULES as Record<string, { containerCapable: boolean }>)[
    node.resourceType
  ];

  if (rule === undefined) {
    // Unknown resource type — skip (graceful)
    return errors;
  }

  // kind: 'container' on a non-container-capable resource type
  if (node.kind === 'container' && !rule.containerCapable) {
    errors.push({
      nodeId: node.id,
      field: 'kind',
      reason: `${node.resourceType} cannot be kind='container'. Only container-capable types (${
        Object.entries(RESOURCE_RULES)
          .filter(([, r]) => r.containerCapable)
          .map(([k]) => k)
          .join(', ')
      }) can be containers.`,
    });
  }

  return errors;
}

/**
 * Convenience: validate both node integrity and containment in one call.
 * Looks up the parent from a flat nodes array.
 */
export function validateNodePlacement(
  node: ResourceNode,
  allNodes: readonly ResourceNode[],
): (NodeIntegrityError | ContainmentError)[] {
  const errors: (NodeIntegrityError | ContainmentError)[] = [];

  // 1. Node integrity (kind vs resourceType)
  errors.push(...validateNodeIntegrity(node));

  // 2. Containment (parent validation)
  const parent = node.parentId
    ? allNodes.find(n => n.id === node.parentId) ?? null
    : null;
  const containmentError = validateContainment(node, parent);
  if (containmentError) {
    errors.push(containmentError);
  }

  return errors;
}
