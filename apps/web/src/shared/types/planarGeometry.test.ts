import { describe, expect, it } from 'vitest';
import type { ResourceBlock, Size } from '@cloudblocks/schema';
import { isGridAligned, planarBounds, planarOverlap, snapToGrid } from './planarGeometry';
import { validateGridAlignment, validateNoOverlap } from '../../entities/validation/placement';
import { blocksOverlapAABB } from '../../entities/store/slices/helpers';

/**
 * #1958 — the contract these tests defend is that *one* interpretation of
 * position and size is used everywhere. The asymmetric cases are the ones that
 * previously disagreed between live movement and architecture validation.
 */

function resource(id: string, x: number, z: number): ResourceBlock {
  return {
    id,
    name: id,
    kind: 'resource',
    layer: 'resource',
    resourceType: 'virtual_machine',
    category: 'compute',
    provider: 'azure',
    parentId: 'container-1',
    position: { x, y: 0.5, z },
    metadata: {},
  };
}

describe('planarBounds', () => {
  it('treats position as the centre and size as the full extent', () => {
    expect(planarBounds({ x: 3, z: 3 }, { width: 2, depth: 4 })).toEqual({
      minX: 2,
      maxX: 4,
      minZ: 1,
      maxZ: 5,
    });
  });
});

describe('planarOverlap', () => {
  it('does not treat edge contact as overlap', () => {
    expect(
      planarOverlap({ x: 0, z: 0 }, { width: 2, depth: 2 }, { x: 2, z: 0 }, { width: 2, depth: 2 }),
    ).toBe(false);
  });

  it('detects overlap one unit inside the shared edge', () => {
    expect(
      planarOverlap({ x: 0, z: 0 }, { width: 2, depth: 2 }, { x: 1, z: 0 }, { width: 2, depth: 2 }),
    ).toBe(true);
  });

  it('is symmetric for asymmetric sizes', () => {
    const a = { position: { x: 0, z: 0 }, size: { width: 6, depth: 1 } };
    const b = { position: { x: 2, z: 0 }, size: { width: 1, depth: 6 } };

    expect(planarOverlap(a.position, a.size, b.position, b.size)).toBe(true);
    expect(planarOverlap(b.position, b.size, a.position, a.size)).toBe(true);
  });

  it('separates on a single axis', () => {
    expect(
      planarOverlap({ x: 0, z: 0 }, { width: 6, depth: 1 }, { x: 0, z: 4 }, { width: 6, depth: 1 }),
    ).toBe(false);
  });
});

describe('grid alignment', () => {
  it('accepts integer CU positions and rejects fractions', () => {
    expect(isGridAligned({ x: -3, z: 4 })).toBe(true);
    expect(isGridAligned({ x: -2.2, z: 4 })).toBe(false);
    expect(isGridAligned({ x: 0, z: 0.5 })).toBe(false);
  });

  it('snaps to the nearest CU', () => {
    expect(snapToGrid({ x: -2.2, z: 3.6 })).toEqual({ x: -2, z: 4 });
  });
});

describe('live movement and architecture validation agree', () => {
  const size = (width: number, depth: number): Size => ({ width, depth, height: 2 });

  const cases: Array<{
    name: string;
    a: [number, number];
    b: [number, number];
    sizeA: Size;
    sizeB: Size;
  }> = [
    { name: 'edge contact', a: [0, 0], b: [4, 0], sizeA: size(4, 2), sizeB: size(4, 2) },
    { name: 'one unit of overlap', a: [0, 0], b: [3, 0], sizeA: size(4, 2), sizeB: size(4, 2) },
    { name: 'wide over tall', a: [0, 0], b: [2, 0], sizeA: size(6, 1), sizeB: size(1, 6) },
    { name: 'tall clear of wide', a: [0, 0], b: [4, 0], sizeA: size(6, 1), sizeB: size(1, 6) },
    { name: 'identical position', a: [0, 0], b: [0, 0], sizeA: size(2, 2), sizeB: size(3, 3) },
  ];

  it.each(cases)('$name', ({ a, b, sizeA, sizeB }) => {
    const blockA = resource('a', a[0], a[1]);
    const blockB = resource('b', b[0], b[1]);
    const sizeOf = (block: ResourceBlock): Size => (block.id === 'a' ? sizeA : sizeB);

    // live movement path
    const live = blocksOverlapAABB(blockA.position, sizeA, blockB.position, sizeB);
    // architecture validation path
    const validated = validateNoOverlap(blockA, [blockB], sizeOf) !== null;

    expect(validated).toBe(live);
  });
});

describe('validateGridAlignment uses the shared contract', () => {
  it('accepts a CU-aligned block', () => {
    expect(validateGridAlignment(resource('a', -3, 4))).toBeNull();
  });

  it('rejects the tenths that the old generator emitted', () => {
    expect(validateGridAlignment(resource('a', -2.2, 0))?.ruleId).toBe('rule-grid-alignment');
  });
});
