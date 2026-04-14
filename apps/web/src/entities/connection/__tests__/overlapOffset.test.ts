import { describe, expect, it } from 'vitest';
import { endpointId } from '@cloudblocks/schema';
import type { Connection, ConnectionType } from '@cloudblocks/schema';
import {
  computeAdaptiveSpacing,
  computeOverlapOffsets,
  getCanonicalDirection,
  getOverlapGroupKey,
  offsetScreenPoints,
  resolveConnectionType,
} from '../overlapOffset';

function makeConnection(
  id: string,
  fromBlockId: string,
  toBlockId: string,
  type?: ConnectionType,
): Connection {
  return {
    id,
    from: endpointId(fromBlockId, 'output', 'data'),
    to: endpointId(toBlockId, 'input', 'data'),
    metadata: type ? { type } : {},
  };
}

describe('overlapOffset', () => {
  describe('resolveConnectionType', () => {
    it('returns metadata.type when it is a valid ConnectionType', () => {
      const conn = makeConnection('c1', 'a', 'b', 'http');
      expect(resolveConnectionType(conn)).toBe('http');
    });

    it('falls back to dataflow when metadata.type is missing', () => {
      const conn = makeConnection('c1', 'a', 'b');
      expect(resolveConnectionType(conn)).toBe('dataflow');
    });

    it('falls back to dataflow when metadata.type is unrecognized', () => {
      const conn: Connection = {
        id: 'c1',
        from: endpointId('a', 'output', 'data'),
        to: endpointId('b', 'input', 'data'),
        metadata: { type: 'unknown-type' },
      };
      expect(resolveConnectionType(conn)).toBe('dataflow');
    });

    it('falls back to dataflow when metadata.type is not a string', () => {
      const conn: Connection = {
        id: 'c1',
        from: endpointId('a', 'output', 'data'),
        to: endpointId('b', 'input', 'data'),
        metadata: { type: 42 },
      };
      expect(resolveConnectionType(conn)).toBe('dataflow');
    });

    it.each(['dataflow', 'http', 'internal', 'data', 'async'] as const)(
      'recognizes %s as valid type',
      (type) => {
        const conn = makeConnection('c1', 'a', 'b', type);
        expect(resolveConnectionType(conn)).toBe(type);
      },
    );
  });

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

  describe('getCanonicalDirection', () => {
    it('returns null when endpoints cannot be parsed', () => {
      const invalid: Connection = {
        id: 'c-invalid',
        from: 'bad',
        to: 'also-bad',
        metadata: {},
      };
      expect(getCanonicalDirection(invalid)).toBeNull();
    });

    it('returns forward when from < to alphabetically', () => {
      const conn = makeConnection('c1', 'alpha', 'beta');
      const result = getCanonicalDirection(conn);
      expect(result).toEqual({ key: 'alpha::beta', bucket: 'forward' });
    });

    it('returns reverse when from > to alphabetically', () => {
      const conn = makeConnection('c1', 'beta', 'alpha');
      const result = getCanonicalDirection(conn);
      expect(result).toEqual({ key: 'alpha::beta', bucket: 'reverse' });
    });

    it('returns forward when from === to (self-loop, same canonical sort)', () => {
      const conn = makeConnection('c1', 'same', 'same');
      const result = getCanonicalDirection(conn);
      expect(result).toEqual({ key: 'same::same', bucket: 'forward' });
    });
  });

  describe('computeAdaptiveSpacing', () => {
    it('returns 0 for single connection', () => {
      expect(computeAdaptiveSpacing(1, 8)).toBe(0);
    });

    it('returns 0 for zero connections', () => {
      expect(computeAdaptiveSpacing(0, 8)).toBe(0);
    });

    it('uses baseOffsetPx when group is small', () => {
      // 2 connections: min(8, 24/2) = min(8, 12) = 8
      expect(computeAdaptiveSpacing(2, 8)).toBe(8);
    });

    it('shrinks spacing for larger groups', () => {
      // 4 connections: min(8, 24/4) = min(8, 6) = 6
      expect(computeAdaptiveSpacing(4, 8)).toBe(6);
    });

    it('clamps to minimum spacing', () => {
      // 10 connections: min(8, 24/10) = min(8, 2.4) → clamp to 4
      expect(computeAdaptiveSpacing(10, 8)).toBe(4);
    });

    it('respects baseOffsetPx when smaller than bundle ratio but above min', () => {
      // 2 connections with base=5: min(5, 24/2) = min(5, 12) = 5, max(5, 4) = 5
      expect(computeAdaptiveSpacing(2, 5)).toBe(5);
    });

    it('clamps up to min spacing when baseOffsetPx is very small', () => {
      // 2 connections with base=3: min(3, 24/2) = 3, but max(3, 4) = 4 (min clamp)
      expect(computeAdaptiveSpacing(2, 3)).toBe(4);
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

    it('assigns direction-aware offsets for bidirectional pair', () => {
      const forward = makeConnection('c1', 'block-a', 'block-b');
      const reverse = makeConnection('c2', 'block-b', 'block-a');

      const offsets = computeOverlapOffsets([forward, reverse], 8);

      // Forward gets positive, reverse gets negative
      const fwdOffset = offsets.get('c1')!;
      const revOffset = offsets.get('c2')!;
      expect(fwdOffset).toBeGreaterThan(0);
      expect(revOffset).toBeLessThan(0);
      // Magnitudes should be equal (symmetric)
      expect(Math.abs(fwdOffset)).toBeCloseTo(Math.abs(revOffset));
    });

    it('centers unidirectional group', () => {
      const c1 = makeConnection('c1', 'block-a', 'block-b');
      const c2 = makeConnection('c2', 'block-a', 'block-b');
      const c3 = makeConnection('c3', 'block-a', 'block-b');

      const offsets = computeOverlapOffsets([c1, c2, c3], 8);

      // 3 connections, centered: offsets should be [-spacing, 0, +spacing]
      const values = [offsets.get('c1')!, offsets.get('c2')!, offsets.get('c3')!];
      // Middle value should be 0 (centered)
      expect(values).toContain(0);
      // Should be symmetric
      const sorted = [...values].sort((a, b) => a - b);
      expect(sorted[0]).toBe(-sorted[2]);
    });

    it('centers unidirectional reverse group', () => {
      const c1 = makeConnection('c1', 'block-b', 'block-a');
      const c2 = makeConnection('c2', 'block-b', 'block-a');

      const offsets = computeOverlapOffsets([c1, c2], 8);

      const o1 = offsets.get('c1')!;
      const o2 = offsets.get('c2')!;
      // Centered: one negative, one positive
      expect(o1 + o2).toBeCloseTo(0);
    });

    it('handles 3 forward + 1 reverse (asymmetric bidirectional)', () => {
      const f1 = makeConnection('f1', 'block-a', 'block-b');
      const f2 = makeConnection('f2', 'block-a', 'block-b');
      const f3 = makeConnection('f3', 'block-a', 'block-b');
      const r1 = makeConnection('r1', 'block-b', 'block-a');

      const offsets = computeOverlapOffsets([f1, f2, f3, r1], 8);

      // Forward connections should all have positive offsets
      expect(offsets.get('f1')!).toBeGreaterThan(0);
      expect(offsets.get('f2')!).toBeGreaterThan(0);
      expect(offsets.get('f3')!).toBeGreaterThan(0);
      // Reverse should have negative offset
      expect(offsets.get('r1')!).toBeLessThan(0);
    });

    it('is deterministic regardless of input order', () => {
      const c1 = makeConnection('c1', 'block-a', 'block-b', 'http');
      const c2 = makeConnection('c2', 'block-a', 'block-b', 'dataflow');
      const c3 = makeConnection('c3', 'block-b', 'block-a', 'data');

      const offsets1 = computeOverlapOffsets([c1, c2, c3], 8);
      const offsets2 = computeOverlapOffsets([c3, c1, c2], 8);
      const offsets3 = computeOverlapOffsets([c2, c3, c1], 8);

      expect(offsets1.get('c1')).toBe(offsets2.get('c1'));
      expect(offsets1.get('c2')).toBe(offsets2.get('c2'));
      expect(offsets1.get('c3')).toBe(offsets2.get('c3'));
      expect(offsets1.get('c1')).toBe(offsets3.get('c1'));
      expect(offsets1.get('c2')).toBe(offsets3.get('c2'));
      expect(offsets1.get('c3')).toBe(offsets3.get('c3'));
    });

    it('sorts by type rank within direction bucket', () => {
      // Two forward connections with different types
      const http = makeConnection('c-http', 'block-a', 'block-b', 'http');
      const dataflow = makeConnection('c-dataflow', 'block-a', 'block-b', 'dataflow');

      const offsets = computeOverlapOffsets([http, dataflow], 8);

      // dataflow (rank 0) should get lower lane than http (rank 1)
      expect(offsets.get('c-dataflow')!).toBeLessThan(offsets.get('c-http')!);
    });

    it('sorts by ID when types match', () => {
      const c_alpha = makeConnection('alpha', 'block-a', 'block-b');
      const c_beta = makeConnection('beta', 'block-a', 'block-b');

      const offsets = computeOverlapOffsets([c_beta, c_alpha], 8);

      // alpha should get lower lane than beta
      expect(offsets.get('alpha')!).toBeLessThan(offsets.get('beta')!);
    });

    it('computes offsets independently per block pair', () => {
      const a1 = makeConnection('a1', 'block-a', 'block-b');
      const a2 = makeConnection('a2', 'block-a', 'block-b');
      const b1 = makeConnection('b1', 'block-c', 'block-d');

      const offsets = computeOverlapOffsets([a1, a2, b1], 5);

      // a1/a2 should have non-zero offsets (group of 2)
      expect(offsets.get('a1')).not.toBe(0);
      expect(offsets.get('a2')).not.toBe(0);
      // b1 is alone in its group
      expect(offsets.get('b1')).toBe(0);
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

    it('applies adaptive spacing for large groups', () => {
      // Create 8 forward connections
      const connections = Array.from({ length: 8 }, (_, i) =>
        makeConnection(`c${i}`, 'block-a', 'block-b'),
      );

      const offsets = computeOverlapOffsets(connections, 8);

      // All should have offsets (centered unidirectional)
      for (const conn of connections) {
        expect(offsets.has(conn.id)).toBe(true);
      }
      // Spacing should be adaptive (less than baseOffsetPx=8)
      const values = connections.map((c) => offsets.get(c.id)!);
      const sorted = [...values].sort((a, b) => a - b);
      const actualSpacing = sorted[1] - sorted[0];
      expect(actualSpacing).toBeLessThan(8);
      expect(actualSpacing).toBeGreaterThanOrEqual(4); // min spacing
    });

    it('handles single forward with no reverse in bidirectional context', () => {
      // Even though the key groups them, if only one exists, offset is 0
      const single = makeConnection('only', 'block-a', 'block-b');
      const offsets = computeOverlapOffsets([single], 8);
      expect(offsets.get('only')).toBe(0);
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

    it('handles coincident points (zero-length segments) in offsetScreenPoints', () => {
      const shifted = offsetScreenPoints(
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        5,
      );

      // First point has zero-length backward segment, normal from forward segment only
      // Second point: backward segment is zero-length (skipped), forward segment contributes
      // Third point: only backward segment contributes
      expect(shifted.length).toBe(3);
      // The offset should still produce valid numbers
      expect(Number.isFinite(shifted[0].x)).toBe(true);
      expect(Number.isFinite(shifted[0].y)).toBe(true);
    });
  });
});
