import type { LeafNode } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';

/**
 * Aggregation Validation (v2.0 — CLOUDBLOCKS_SPEC_V2.md §8, §15):
 *
 * - Aggregation count must be >= 1
 * - Size remains fixed regardless of count (visual only — badge "×N")
 */

export function validateAggregation(
  block: LeafNode,
): ValidationError | null {
  const aggregation = block.aggregation;

  // No aggregation field = single instance (valid)
  if (!aggregation) return null;

  if (aggregation.count < 1) {
    return {
      ruleId: 'rule-aggregation-count',
      severity: 'error',
      message: `Node "${block.name}" has invalid aggregation count: ${aggregation.count} (must be >= 1)`,
      suggestion: 'Set the aggregation count to 1 or greater',
      targetId: block.id,
    };
  }

  if (!Number.isInteger(aggregation.count)) {
    return {
      ruleId: 'rule-aggregation-count',
      severity: 'error',
      message: `Node "${block.name}" has non-integer aggregation count: ${aggregation.count}`,
      suggestion: 'Set the aggregation count to a whole number',
      targetId: block.id,
    };
  }

  return null;
}
