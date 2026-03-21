import { describe, it, expect } from 'vitest';
import { computeRoute, segmentAngle, segmentLength } from './routing';

describe('computeRoute', () => {
  it('returns single segment for aligned points', () => {
    const route = computeRoute({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(route.segments).toHaveLength(1);
    expect(route.elbows).toHaveLength(0);
    expect(route.segments[0].start).toEqual({ x: 0, y: 0 });
    expect(route.segments[0].end).toEqual({ x: 100, y: 0 });
  });

  it('returns single segment for vertically aligned points', () => {
    const route = computeRoute({ x: 50, y: 0 }, { x: 50, y: 100 });
    expect(route.segments).toHaveLength(1);
    expect(route.elbows).toHaveLength(0);
  });

  it('returns L-shaped route with elbow for diagonal points', () => {
    const route = computeRoute({ x: 0, y: 0 }, { x: 100, y: 80 });
    expect(route.segments).toHaveLength(2);
    expect(route.elbows).toHaveLength(1);
    expect(route.elbows[0]).toEqual({ x: 100, y: 0 });
  });

  it('returns single segment for very close points', () => {
    const route = computeRoute({ x: 0, y: 0 }, { x: 3, y: 3 });
    expect(route.segments).toHaveLength(1);
    expect(route.elbows).toHaveLength(0);
  });
});

describe('segmentAngle', () => {
  it('returns 0 for horizontal right', () => {
    const angle = segmentAngle({ start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    expect(angle).toBeCloseTo(0);
  });

  it('returns PI/2 for vertical down', () => {
    const angle = segmentAngle({ start: { x: 0, y: 0 }, end: { x: 0, y: 10 } });
    expect(angle).toBeCloseTo(Math.PI / 2);
  });
});

describe('segmentLength', () => {
  it('returns correct length for horizontal segment', () => {
    const len = segmentLength({ start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    expect(len).toBeCloseTo(10);
  });

  it('returns correct length for diagonal segment', () => {
    const len = segmentLength({ start: { x: 0, y: 0 }, end: { x: 3, y: 4 } });
    expect(len).toBeCloseTo(5);
  });
});
