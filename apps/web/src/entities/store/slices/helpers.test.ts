import { describe, it, expect } from 'vitest';
import {
  containerBlocksOverlap,
  overlapsSibling,
  findNonOverlappingPosition,
  resolveMoveDelta,
} from './helpers';

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
