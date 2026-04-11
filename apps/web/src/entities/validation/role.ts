import type { ResourceBlock } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';
import { BLOCK_ROLES } from '@cloudblocks/domain';

/**
 * Role Validation (v2.0 — CLOUDBLOCKS_SPEC_V2.md §9):
 *
 * - Roles must be valid BlockRole values
 * - No duplicate roles on a single block
 * - Roles are visual-only — they do NOT affect size, color, or placement
 */

export function validateRoles(block: ResourceBlock): ValidationError | null {
  const roles = block.roles;

  // No roles field = valid (roles are optional)
  if (!roles || roles.length === 0) return null;

  // Check for invalid role values
  const invalidRoles = roles.filter((r) => !(BLOCK_ROLES as readonly string[]).includes(r));
  if (invalidRoles.length > 0) {
    return {
      ruleId: 'rule-role-invalid',
      severity: 'error',
      message: `"${block.name}" has unrecognized role(s): ${invalidRoles.join(', ')}.`,
      suggestion: `Valid roles are: ${BLOCK_ROLES.join(', ')}. Roles are visual tags that help communicate a block's purpose in your architecture.`,
      targetId: block.id,
    };
  }

  // Check for duplicate roles
  const hasDuplicateRoles = roles.some((role, index) => roles.indexOf(role) !== index);
  if (hasDuplicateRoles) {
    const duplicates = roles.filter((r, i) => roles.indexOf(r) !== i);
    return {
      ruleId: 'rule-role-duplicate',
      severity: 'warning',
      message: `"${block.name}" has duplicate role(s): ${[...new Set(duplicates)].join(', ')}.`,
      suggestion: 'Remove the duplicate - each role only needs to be assigned once.',
      targetId: block.id,
    };
  }

  return null;
}
