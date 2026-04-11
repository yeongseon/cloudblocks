import type { ResourceBlock } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';

/**
 * Aggregation Validation (v2.0 — CLOUDBLOCKS_SPEC_V2.md §8, §15):
 *
 * - Aggregation count must be >= 1
 * - Size remains fixed regardless of count (visual only — badge "×N")
 */

export function validateAggregation(block: ResourceBlock): ValidationError | null {
  const aggregation = block.aggregation;

  // No aggregation field = single instance (valid)
  if (!aggregation) return null;

  if (aggregation.count < 1) {
    return {
      ruleId: 'rule-aggregation-count',
      severity: 'error',
      message: `"${block.name}" has an aggregation count of ${aggregation.count}, which is too low.`,
      suggestion:
        'Set the count to 1 or higher. The aggregation count represents how many instances of this resource run in your architecture.',
      targetId: block.id,
    };
  }

  if (!Number.isInteger(aggregation.count)) {
    return {
      ruleId: 'rule-aggregation-count',
      severity: 'error',
      message: `"${block.name}" has a non-whole-number aggregation count: ${aggregation.count}.`,
      suggestion:
        "Use a whole number (like 1, 2, or 3). The count represents distinct resource instances, so fractions don't make sense.",
      targetId: block.id,
    };
  }

  return null;
}
