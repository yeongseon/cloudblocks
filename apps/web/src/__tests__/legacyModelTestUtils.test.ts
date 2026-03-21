import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeTestBlock } from './legacyModelTestUtils';

describe('legacyModelTestUtils category mapping', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps legacy categories to current resource categories', () => {
    expect(makeTestBlock({ category: 'database' }).category).toBe('data');
    expect(makeTestBlock({ category: 'storage' }).category).toBe('data');
    expect(makeTestBlock({ category: 'gateway' }).category).toBe('edge');
    expect(makeTestBlock({ category: 'function' }).category).toBe('compute');
    expect(makeTestBlock({ category: 'queue' }).category).toBe('messaging');
    expect(makeTestBlock({ category: 'event' }).category).toBe('messaging');
    expect(makeTestBlock({ category: 'analytics' }).category).toBe('operations');
    expect(makeTestBlock({ category: 'observability' }).category).toBe('operations');
    expect(makeTestBlock({ category: 'identity' }).category).toBe('security');
  });

  it('preserves already-mapped categories and defaults undefined to compute', () => {
    expect(makeTestBlock({ category: 'compute' }).category).toBe('compute');
    expect(makeTestBlock({ category: 'operations' }).category).toBe('operations');
    expect(makeTestBlock().category).toBe('compute');
  });
});
