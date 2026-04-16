import { describe, expect, it } from 'vitest';

import { getSiblingProximity } from './dragFeedback';

describe('getSiblingProximity', () => {
  const selfSize = { width: 2, depth: 2 };

  it('returns infinite gap and no overlap when no siblings exist', () => {
    const result = getSiblingProximity('self', { x: 0, z: 0 }, selfSize, []);

    expect(result.nearestGap).toBe(Number.POSITIVE_INFINITY);
    expect(result.wouldOverlap).toBe(false);
  });

  it('returns large gap for a distant sibling', () => {
    const result = getSiblingProximity('self', { x: 0, z: 0 }, selfSize, [
      {
        id: 'far',
        category: 'compute',
        provider: 'azure',
        position: { x: 10, z: 0 },
      },
    ]);

    expect(result.nearestGap).toBe(8);
    expect(result.wouldOverlap).toBe(false);
  });

  it('returns near gap below threshold for a nearby sibling', () => {
    const result = getSiblingProximity('self', { x: 0, z: 0 }, selfSize, [
      {
        id: 'near',
        category: 'compute',
        provider: 'azure',
        position: { x: 3, z: 3 },
      },
    ]);

    expect(result.nearestGap).toBeCloseTo(Math.SQRT2);
    expect(result.nearestGap).toBeLessThan(2);
    expect(result.wouldOverlap).toBe(false);
  });

  it('returns zero gap for edge-touching sibling without overlap', () => {
    const result = getSiblingProximity('self', { x: 0, z: 0 }, selfSize, [
      {
        id: 'touching',
        category: 'compute',
        provider: 'azure',
        position: { x: 2, z: 0 },
      },
    ]);

    expect(result.nearestGap).toBe(0);
    expect(result.wouldOverlap).toBe(false);
  });

  it('returns negative gap and overlap for overlapping sibling', () => {
    const result = getSiblingProximity('self', { x: 0, z: 0 }, selfSize, [
      {
        id: 'overlap',
        category: 'compute',
        provider: 'azure',
        position: { x: 1, z: 1 },
      },
    ]);

    expect(result.nearestGap).toBe(-1);
    expect(result.wouldOverlap).toBe(true);
  });

  it('excludes self entry when scanning siblings', () => {
    const result = getSiblingProximity('self', { x: 0, z: 0 }, selfSize, [
      {
        id: 'self',
        category: 'compute',
        provider: 'azure',
        position: { x: 0, z: 0 },
      },
      {
        id: 'other',
        category: 'compute',
        provider: 'azure',
        position: { x: 5, z: 0 },
      },
    ]);

    expect(result.nearestGap).toBe(3);
    expect(result.wouldOverlap).toBe(false);
  });

  it('tracks nearest sibling among multiple candidates', () => {
    const result = getSiblingProximity('self', { x: 0, z: 0 }, selfSize, [
      {
        id: 'far',
        category: 'compute',
        provider: 'azure',
        position: { x: 8, z: 0 },
      },
      {
        id: 'closer',
        category: 'compute',
        provider: 'azure',
        position: { x: 3, z: 0 },
      },
    ]);

    expect(result.nearestGap).toBe(1);
    expect(result.wouldOverlap).toBe(false);
  });
});
