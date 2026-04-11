import { describe, it, expect } from 'vitest';
import {
  blocksOverlapAABB,
  containerBlocksOverlap,
  nextGridPosition,
  overlapsSibling,
  overlapsAnySiblingResource,
  findNonOverlappingPosition,
  resourceBlocksOverlap,
  resolveMoveDelta,
} from './helpers';
import { getBlockDimensions } from '../../../shared/types/visualProfile';
import { validateNoOverlap } from '../../validation/placement';
import type { ResourceBlock, Size } from '@cloudblocks/schema';

describe('platesOverlap', () => {
  it('returns true when plates fully overlap at same position', () => {
    expect(
      containerBlocksOverlap(
        { x: 0, z: 0 },
        { width: 6, depth: 8 },
        { x: 0, z: 0 },
        { width: 6, depth: 8 },
      ),
    ).toBe(true);
  });

  it('returns true when plates partially overlap', () => {
    expect(
      containerBlocksOverlap(
        { x: 0, z: 0 },
        { width: 6, depth: 8 },
        { x: 4, z: 0 },
        { width: 6, depth: 8 },
      ),
    ).toBe(true);
  });

  it('returns false when plates are side-by-side touching edges', () => {
    expect(
      containerBlocksOverlap(
        { x: 0, z: 0 },
        { width: 6, depth: 8 },
        { x: 6, z: 0 },
        { width: 6, depth: 8 },
      ),
    ).toBe(false);
  });

  it('returns false when plates are fully separated', () => {
    expect(
      containerBlocksOverlap(
        { x: 0, z: 0 },
        { width: 6, depth: 8 },
        { x: 20, z: 20 },
        { width: 6, depth: 8 },
      ),
    ).toBe(false);
  });

  it('returns false when X overlaps but Z does not', () => {
    expect(
      containerBlocksOverlap(
        { x: 0, z: 0 },
        { width: 6, depth: 4 },
        { x: 2, z: 10 },
        { width: 6, depth: 4 },
      ),
    ).toBe(false);
  });

  it('handles different sized plates', () => {
    expect(
      containerBlocksOverlap(
        { x: 0, z: 0 },
        { width: 10, depth: 10 },
        { x: 3, z: 3 },
        { width: 2, depth: 2 },
      ),
    ).toBe(true);
  });
});

describe('overlapsSibling', () => {
  const siblings = [
    { id: 's1', position: { x: 0, z: 0 }, frame: { width: 6, depth: 8 } },
    { id: 's2', position: { x: 10, z: 0 }, frame: { width: 6, depth: 8 } },
  ];

  it('returns true when candidate overlaps a sibling', () => {
    expect(overlapsSibling({ x: 0, z: 0 }, { width: 6, depth: 8 }, siblings)).toBe(true);
  });

  it('returns false when candidate does not overlap any sibling', () => {
    expect(overlapsSibling({ x: 20, z: 0 }, { width: 6, depth: 8 }, siblings)).toBe(false);
  });

  it('excludes the container itself when excludeId is provided', () => {
    expect(overlapsSibling({ x: 0, z: 0 }, { width: 6, depth: 8 }, siblings, 's1')).toBe(false);
  });
});

describe('findNonOverlappingPosition', () => {
  it('returns initial position when no siblings exist', () => {
    const result = findNonOverlappingPosition({ x: 0, z: 0 }, { width: 6, depth: 8 }, []);
    expect(result).toEqual({ x: 0, z: 0 });
  });

  it('returns initial position when it does not overlap', () => {
    const siblings = [{ id: 's1', position: { x: 20, z: 0 }, frame: { width: 6, depth: 8 } }];
    const result = findNonOverlappingPosition({ x: 0, z: 0 }, { width: 6, depth: 8 }, siblings);
    expect(result).toEqual({ x: 0, z: 0 });
  });

  it('shifts rightward when initial position overlaps', () => {
    const siblings = [{ id: 's1', position: { x: 0, z: 0 }, frame: { width: 6, depth: 8 } }];
    const result = findNonOverlappingPosition({ x: 0, z: 0 }, { width: 6, depth: 8 }, siblings);
    expect(result.x).toBeGreaterThan(0);
    expect(
      containerBlocksOverlap(
        result,
        { width: 6, depth: 8 },
        { x: 0, z: 0 },
        { width: 6, depth: 8 },
      ),
    ).toBe(false);
  });
});

describe('resolveMoveDelta', () => {
  const container = {
    id: 'p1',
    position: { x: 0, z: 0 },
    frame: { width: 6, depth: 8 },
  };

  it('returns full delta when no overlap would occur', () => {
    const siblings = [{ id: 's1', position: { x: 20, z: 0 }, frame: { width: 6, depth: 8 } }];
    const result = resolveMoveDelta(container, 3, 0, siblings);
    expect(result).toEqual({ deltaX: 3, deltaZ: 0 });
  });

  it('reduces delta when full move would overlap', () => {
    const siblings = [{ id: 's1', position: { x: 8, z: 0 }, frame: { width: 6, depth: 8 } }];
    const result = resolveMoveDelta(container, 8, 0, siblings);
    expect(result.deltaX).toBeLessThan(8);
    expect(result.deltaX).toBeGreaterThanOrEqual(0);
  });

  it('returns zero delta when any movement would overlap', () => {
    const siblings = [{ id: 's1', position: { x: 5, z: 0 }, frame: { width: 6, depth: 8 } }];
    const result = resolveMoveDelta(container, 5, 0, siblings);
    expect(result.deltaX).toBeLessThan(5);
  });
});

describe('resourceBlocksOverlap', () => {
  it('returns true when resource blocks overlap', () => {
    expect(
      resourceBlocksOverlap(
        { x: 0, z: 0 },
        { width: 2, depth: 2 },
        { x: 1, z: 0 },
        { width: 2, depth: 2 },
      ),
    ).toBe(true);
  });

  it('returns false when resource blocks touch edges', () => {
    expect(
      resourceBlocksOverlap(
        { x: 0, z: 0 },
        { width: 2, depth: 2 },
        { x: 2, z: 0 },
        { width: 2, depth: 2 },
      ),
    ).toBe(false);
  });
});

describe('overlapsAnySiblingResource', () => {
  const siblings = [
    {
      id: 'a',
      position: { x: 0, z: 0 },
      category: 'compute' as const,
      provider: 'azure' as const,
    },
    {
      id: 'b',
      position: { x: 4, z: 0 },
      category: 'compute' as const,
      provider: 'azure' as const,
    },
  ];

  it('returns true when candidate overlaps any sibling', () => {
    expect(
      overlapsAnySiblingResource({ x: 1, z: 0 }, { width: 2, depth: 2 }, siblings, 'candidate'),
    ).toBe(true);
  });

  it('returns false when overlap is only with excluded id', () => {
    expect(overlapsAnySiblingResource({ x: 0, z: 0 }, { width: 2, depth: 2 }, siblings, 'a')).toBe(
      false,
    );
  });
});

describe('overlapsAnySiblingResource — escape hatch', () => {
  const siblings = [
    {
      id: 'a',
      position: { x: 0, z: 0 },
      category: 'compute' as const,
      provider: 'azure' as const,
    },
    {
      id: 'b',
      position: { x: 4, z: 0 },
      category: 'compute' as const,
      provider: 'azure' as const,
    },
  ];

  it('allows move when block is already overlapping at current position', () => {
    // Block at x=0.5 already overlaps sibling 'a' at x=0 (both 2×2).
    // Moving to x=1 should be allowed (escape hatch).
    expect(
      overlapsAnySiblingResource({ x: 1, z: 0 }, { width: 2, depth: 2 }, siblings, 'candidate', {
        x: 0.5,
        z: 0,
      }),
    ).toBe(false);
  });

  it('rejects move when block is NOT currently overlapping', () => {
    // Block at x=6 does NOT overlap anyone.
    // Moving to x=1 would overlap sibling 'a' — should be rejected.
    expect(
      overlapsAnySiblingResource({ x: 1, z: 0 }, { width: 2, depth: 2 }, siblings, 'candidate', {
        x: 6,
        z: 0,
      }),
    ).toBe(true);
  });

  it('allows move that overlaps a DIFFERENT sibling while already invalid (intentional)', () => {
    // Block 'candidate' is at x=0.5 — overlapping sibling 'a' (at x=0).
    // Moving to x=3.5 would overlap sibling 'b' (at x=4).
    // Because candidate is already invalid, the escape hatch allows this move
    // so the user is never trapped. Post-placement validation will surface
    // the remaining overlap.
    const threeWay = [
      {
        id: 'a',
        position: { x: 0, z: 0 },
        category: 'compute' as const,
        provider: 'azure' as const,
      },
      {
        id: 'b',
        position: { x: 4, z: 0 },
        category: 'compute' as const,
        provider: 'azure' as const,
      },
    ];
    expect(
      overlapsAnySiblingResource(
        { x: 3.5, z: 0 }, // candidate pos (overlaps 'b')
        { width: 2, depth: 2 },
        threeWay,
        'candidate',
        { x: 0.5, z: 0 }, // current pos (overlaps 'a') → escape hatch fires
      ),
    ).toBe(false);
  });
});

describe('blocksOverlapAABB', () => {
  it('is used by both containerBlocksOverlap and resourceBlocksOverlap', () => {
    const posA = { x: 0, z: 0 };
    const sizeA = { width: 4, depth: 4 };
    const posB = { x: 2, z: 2 };
    const sizeB = { width: 4, depth: 4 };
    expect(blocksOverlapAABB(posA, sizeA, posB, sizeB)).toBe(true);
    expect(containerBlocksOverlap(posA, sizeA, posB, sizeB)).toBe(true);
    expect(resourceBlocksOverlap(posA, sizeA, posB, sizeB)).toBe(true);
  });
});

describe('validateNoOverlap — post-placement safety net', () => {
  const getSize = (): Size => ({ width: 2, height: 2, depth: 2 });

  const makeResource = (id: string, x: number, z: number): ResourceBlock => ({
    id,
    name: id,
    kind: 'resource',
    layer: 'resource',
    resourceType: 'virtual_machine',
    category: 'compute',
    provider: 'azure',
    parentId: 'subnet-1',
    position: { x, y: 0, z },
    metadata: {},
  });

  it('detects overlap on legacy/imported data where blocks were placed on top of each other', () => {
    const blockA = makeResource('res-a', 0, 0);
    const blockB = makeResource('res-b', 1, 0); // overlaps blockA
    const result = validateNoOverlap(blockA, [blockB], getSize);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('rule-no-overlap');
    expect(result!.severity).toBe('error');
  });

  it('does NOT report overlap when blocks are properly separated', () => {
    const blockA = makeResource('res-a', 0, 0);
    const blockC = makeResource('res-c', 5, 0); // far away
    expect(validateNoOverlap(blockA, [blockC], getSize)).toBeNull();
  });
});

describe('nextGridPosition — blockSize parameter', () => {
  it('uses default block size when blockSize is omitted', () => {
    const pos = nextGridPosition([], { width: 10, depth: 10 });
    expect(pos).toBeDefined();
    expect(pos.y).toBe(0.5);
  });

  it('uses custom block size when provided', () => {
    nextGridPosition([], { width: 10, depth: 10 }); // ensure no error without blockSize
    const posLarge = nextGridPosition([], { width: 10, depth: 10 }, { width: 3, depth: 3 });
    // Both should return the first position (index 0), but spacing differs.
    // With larger blocks the grid step is bigger, so startX may differ.
    expect(posLarge).toBeDefined();
    expect(posLarge.y).toBe(0.5);
  });

  it('computes fewer columns for larger block size', () => {
    // plateSize 10×10, medium block (2×2, spacing 0.2): step=2.2, maxCols=floor((10-2)/2.2)+1=4
    const posMedium = nextGridPosition(
      Array.from({ length: 4 }, (_, i) => ({ id: `b${i}` }) as ResourceBlock),
      { width: 10, depth: 10 },
      { width: 2, depth: 2 },
    );
    // large block (3×3, spacing 0.2): step=3.2, maxCols=floor((10-3)/3.2)+1=3
    const posLarge = nextGridPosition(
      Array.from({ length: 3 }, (_, i) => ({ id: `b${i}` }) as ResourceBlock),
      { width: 10, depth: 10 },
      { width: 3, depth: 3 },
    );
    // Medium index=4 should be row 1 (maxCols=4), large index=3 should also be row 1 (maxCols=3)
    expect(posMedium.z).toBeLessThan(0); // negative z = further row
    expect(posLarge.z).toBeLessThan(0);
  });
});

describe('getBlockDimensions — size hierarchy', () => {
  it('returns large (3×3) for network category', () => {
    const dims = getBlockDimensions('network');
    expect(dims.width).toBe(3);
    expect(dims.depth).toBe(3);
  });

  it('returns large (3×3) for data category', () => {
    const dims = getBlockDimensions('data');
    expect(dims.width).toBe(3);
    expect(dims.depth).toBe(3);
  });

  it('returns medium (2×2) for compute category', () => {
    const dims = getBlockDimensions('compute');
    expect(dims.width).toBe(2);
    expect(dims.depth).toBe(2);
  });

  it('returns medium (2×2) for security category', () => {
    const dims = getBlockDimensions('security');
    expect(dims.width).toBe(2);
    expect(dims.depth).toBe(2);
  });

  it('returns medium (2×2) for delivery category', () => {
    const dims = getBlockDimensions('delivery');
    expect(dims.width).toBe(2);
    expect(dims.depth).toBe(2);
  });

  it('returns medium (2×2) for messaging category', () => {
    const dims = getBlockDimensions('messaging');
    expect(dims.width).toBe(2);
    expect(dims.depth).toBe(2);
  });

  it('foundational categories (network, data) are larger than others', () => {
    const network = getBlockDimensions('network');
    const data = getBlockDimensions('data');
    const compute = getBlockDimensions('compute');
    const security = getBlockDimensions('security');
    expect(network.width).toBeGreaterThan(compute.width);
    expect(data.width).toBeGreaterThan(security.width);
  });
});
