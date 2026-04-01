import { describe, expect, it } from 'vitest';
import { endpointId } from '@cloudblocks/schema';
import type { Connection } from '@cloudblocks/schema';
import { computeOverlapOffsets, getOverlapGroupKey, offsetScreenPoints } from '../overlapOffset';

function makeConnection(id: string, fromBlockId: string, toBlockId: string): Connection {
  return {
    id,
    from: endpointId(fromBlockId, 'output', 'data'),
    to: endpointId(toBlockId, 'input', 'data'),
    metadata: {},
  };
}

describe('overlapOffset', () => {
  describe('getOverlapGroupKey', () => {
    it('returns null when endpoints cannot be parsed', () => {
      const invalid: Connection = {
        id: 'c-invalid',
        from: 'invalid-from',
        to: 'invalid-to',
        metadata: {},
      };

      expect(getOverlapGroupKey(invalid)).toBeNull();
    });

    it('returns sorted block id pair as key', () => {
      const connection = makeConnection('c1', 'block-z', 'block-a');

      expect(getOverlapGroupKey(connection)).toBe('block-a::block-z');
    });

    it('returns same key for bidirectional connections', () => {
      const forward = makeConnection('c1', 'block-a', 'block-b');
      const backward = makeConnection('c2', 'block-b', 'block-a');

      expect(getOverlapGroupKey(forward)).toBe('block-a::block-b');
      expect(getOverlapGroupKey(backward)).toBe('block-a::block-b');
    });
  });

  describe('computeOverlapOffsets', () => {
    it('returns empty map for empty input', () => {
      const offsets = computeOverlapOffsets([], 5);

      expect(offsets.size).toBe(0);
    });

    it('assigns zero offset for a single connection', () => {
      const c1 = makeConnection('c1', 'block-a', 'block-b');

      const offsets = computeOverlapOffsets([c1], 5);

      expect(offsets.get('c1')).toBe(0);
    });

    it('assigns centered offsets for two overlapping connections', () => {
      const c1 = makeConnection('c1', 'block-a', 'block-b');
      const c2 = makeConnection('c2', 'block-b', 'block-a');

      const offsets = computeOverlapOffsets([c1, c2], 6);

      expect(offsets.get('c1')).toBe(-3);
      expect(offsets.get('c2')).toBe(3);
    });

    it('assigns centered offsets for three overlapping connections', () => {
      const c1 = makeConnection('c1', 'block-a', 'block-b');
      const c2 = makeConnection('c2', 'block-a', 'block-b');
      const c3 = makeConnection('c3', 'block-b', 'block-a');

      const offsets = computeOverlapOffsets([c1, c2, c3], 4);

      expect(offsets.get('c1')).toBe(-4);
      expect(offsets.get('c2')).toBe(0);
      expect(offsets.get('c3')).toBe(4);
    });

    it('computes offsets independently per block pair', () => {
      const a1 = makeConnection('a1', 'block-a', 'block-b');
      const a2 = makeConnection('a2', 'block-a', 'block-b');
      const b1 = makeConnection('b1', 'block-c', 'block-d');
      const b2 = makeConnection('b2', 'block-c', 'block-d');
      const b3 = makeConnection('b3', 'block-c', 'block-d');

      const offsets = computeOverlapOffsets([a1, a2, b1, b2, b3], 5);

      expect(offsets.get('a1')).toBe(-2.5);
      expect(offsets.get('a2')).toBe(2.5);
      expect(offsets.get('b1')).toBe(-5);
      expect(offsets.get('b2')).toBe(0);
      expect(offsets.get('b3')).toBe(5);
    });

    it('skips connections with unparseable endpoints', () => {
      const valid = makeConnection('valid', 'block-a', 'block-b');
      const invalid: Connection = {
        id: 'invalid',
        from: 'bad',
        to: 'still-bad',
        metadata: {},
      };

      const offsets = computeOverlapOffsets([invalid, valid], 5);

      expect(offsets.get('valid')).toBe(0);
      expect(offsets.has('invalid')).toBe(false);
    });
  });

  describe('offsetScreenPoints', () => {
    it('returns empty array for empty input', () => {
      expect(offsetScreenPoints([], 5)).toEqual([]);
    });

    it('returns same single point regardless of offset', () => {
      expect(offsetScreenPoints([{ x: 10, y: 20 }], 7)).toEqual([{ x: 10, y: 20 }]);
    });

    it('returns a copy of original points for zero offset', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];

      const shifted = offsetScreenPoints(points, 0);

      expect(shifted).toEqual(points);
      expect(shifted).not.toBe(points);
      expect(shifted[0]).not.toBe(points[0]);
    });

    it('offsets horizontal line to a parallel vertical shift', () => {
      const shifted = offsetScreenPoints(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        5,
      );

      expect(shifted[0].x).toBeCloseTo(0);
      expect(shifted[0].y).toBeCloseTo(5);
      expect(shifted[1].x).toBeCloseTo(10);
      expect(shifted[1].y).toBeCloseTo(5);
    });

    it('offsets vertical line to a parallel horizontal shift', () => {
      const shifted = offsetScreenPoints(
        [
          { x: 0, y: 0 },
          { x: 0, y: 10 },
        ],
        5,
      );

      expect(shifted[0].x).toBeCloseTo(-5);
      expect(shifted[0].y).toBeCloseTo(0);
      expect(shifted[1].x).toBeCloseTo(-5);
      expect(shifted[1].y).toBeCloseTo(10);
    });

    it('uses averaged corner normal for an L-shaped path', () => {
      const shifted = offsetScreenPoints(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
        5,
      );

      expect(shifted[0].x).toBeCloseTo(0);
      expect(shifted[0].y).toBeCloseTo(5);
      expect(shifted[1].x).toBeCloseTo(10 - Math.SQRT1_2 * 5);
      expect(shifted[1].y).toBeCloseTo(Math.SQRT1_2 * 5);
      expect(shifted[2].x).toBeCloseTo(5);
      expect(shifted[2].y).toBeCloseTo(10);
    });
  });
});
