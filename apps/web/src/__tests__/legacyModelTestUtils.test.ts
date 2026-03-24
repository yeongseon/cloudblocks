import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBlocks,
  getPlates,
  makeTestArchitecture,
  makeTestBlock,
  makeTestPlate,
} from './legacyModelTestUtils';

describe('legacyModelTestUtils category mapping', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps legacy categories to current resource categories', () => {
    expect(makeTestBlock({ category: 'database' }).category).toBe('data');
    expect(makeTestBlock({ category: 'storage' }).category).toBe('data');
    expect(makeTestBlock({ category: 'gateway' }).category).toBe('delivery');
    expect(makeTestBlock({ category: 'function' }).category).toBe('compute');
    expect(makeTestBlock({ category: 'queue' }).category).toBe('messaging');
    expect(makeTestBlock({ category: 'event' }).category).toBe('messaging');
    expect(makeTestBlock({ category: 'analytics' }).category).toBe('operations');
    expect(makeTestBlock({ category: 'observability' }).category).toBe('operations');
    expect(makeTestBlock({ category: 'identity' }).category).toBe('identity');
  });

  it('preserves already-mapped categories and defaults undefined to compute', () => {
    expect(makeTestBlock({ category: 'compute' }).category).toBe('compute');
    expect(makeTestBlock({ category: 'operations' }).category).toBe('operations');
    expect(makeTestBlock().category).toBe('compute');
  });
});

describe('legacyModelTestUtils node filters', () => {
  it('separates container and resource nodes', () => {
    const architecture = makeTestArchitecture({
      nodes: [
        makeTestPlate({ id: 'container-a' }),
        makeTestBlock({ id: 'block-a' }),
        makeTestBlock({ id: 'block-b', category: 'data' }),
      ],
    });

    expect(getPlates(architecture).map((node) => node.id)).toEqual(['container-a']);
    expect(getBlocks(architecture).map((node) => node.id)).toEqual(['block-a', 'block-b']);
  });
});
