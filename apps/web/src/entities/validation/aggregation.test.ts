import { describe, it, expect } from 'vitest';
import type { LeafNode } from '@cloudblocks/schema';
import { validateAggregation } from './aggregation';
import { makeTestBlock, type LegacyBlockOverrides } from '../../__tests__/legacyModelTestUtils';

function makeBlock(overrides: LegacyBlockOverrides = {}): LeafNode {
  return makeTestBlock({
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'plate-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  });
}

describe('validateAggregation', () => {
  it('returns null when block has no aggregation (single instance)', () => {
    const block = makeBlock();
    expect(validateAggregation(block)).toBeNull();
  });

  it('returns null for single mode with count 1', () => {
    const block = makeBlock({ aggregation: { mode: 'single', count: 1 } });
    expect(validateAggregation(block)).toBeNull();
  });

  it('returns null for count mode with valid count', () => {
    const block = makeBlock({ aggregation: { mode: 'count', count: 5 } });
    expect(validateAggregation(block)).toBeNull();
  });

  it('returns null for count of 1', () => {
    const block = makeBlock({ aggregation: { mode: 'count', count: 1 } });
    expect(validateAggregation(block)).toBeNull();
  });

  it('returns error when count is 0', () => {
    const block = makeBlock({
      id: 'b1',
      name: 'ZeroCount',
      aggregation: { mode: 'count', count: 0 },
    });

    expect(validateAggregation(block)).toEqual({
      ruleId: 'rule-aggregation-count',
      severity: 'error',
      message: 'Node "ZeroCount" has invalid aggregation count: 0 (must be >= 1)',
      suggestion: 'Set the aggregation count to 1 or greater',
      targetId: 'b1',
    });
  });

  it('returns error when count is negative', () => {
    const block = makeBlock({
      id: 'b2',
      name: 'NegativeCount',
      aggregation: { mode: 'count', count: -3 },
    });

    expect(validateAggregation(block)).toEqual({
      ruleId: 'rule-aggregation-count',
      severity: 'error',
      message: 'Node "NegativeCount" has invalid aggregation count: -3 (must be >= 1)',
      suggestion: 'Set the aggregation count to 1 or greater',
      targetId: 'b2',
    });
  });

  it('returns error when count is fractional', () => {
    const block = makeBlock({
      id: 'b3',
      name: 'FractionalCount',
      aggregation: { mode: 'count', count: 2.5 },
    });

    expect(validateAggregation(block)).toEqual({
      ruleId: 'rule-aggregation-count',
      severity: 'error',
      message: 'Node "FractionalCount" has non-integer aggregation count: 2.5',
      suggestion: 'Set the aggregation count to a whole number',
      targetId: 'b3',
    });
  });

  it('returns null for large valid count', () => {
    const block = makeBlock({ aggregation: { mode: 'count', count: 100 } });
    expect(validateAggregation(block)).toBeNull();
  });
});
