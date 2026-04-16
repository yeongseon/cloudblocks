import { describe, expect, it } from 'vitest';

import { criticallyDampedSpring } from './springMath';

describe('criticallyDampedSpring', () => {
  it('returns the initial value at t=0', () => {
    expect(criticallyDampedSpring(0, 1.04, 1, 6)).toBe(1.04);
  });

  it('returns the initial value when t is negative', () => {
    expect(criticallyDampedSpring(-0.3, 5, 2, 4)).toBe(5);
  });

  it('converges to the target at large time', () => {
    expect(criticallyDampedSpring(2, 10, 1, 4)).toBe(1);
  });

  it('handles positive to negative transitions', () => {
    const value = criticallyDampedSpring(0.08, 2, -1, 5);
    expect(value).toBeLessThan(2);
    expect(value).toBeGreaterThan(-1);
  });

  it('handles negative to positive transitions', () => {
    const value = criticallyDampedSpring(0.08, -4, 3, 5);
    expect(value).toBeGreaterThan(-4);
    expect(value).toBeLessThan(3);
  });

  it('returns target immediately when from equals to', () => {
    expect(criticallyDampedSpring(0.25, 2.5, 2.5, 3)).toBe(2.5);
  });

  it('frequency controls settle speed (higher settles faster)', () => {
    const lowFrequency = criticallyDampedSpring(0.08, 1.04, 1, 2);
    const highFrequency = criticallyDampedSpring(0.08, 1.04, 1, 8);
    expect(Math.abs(highFrequency - 1)).toBeLessThan(Math.abs(lowFrequency - 1));
  });

  it('clamps when value is very close to target', () => {
    expect(criticallyDampedSpring(0.4, 1.04, 1, 6)).toBe(1);
  });

  it('does not clamp before entering threshold', () => {
    const value = criticallyDampedSpring(0.05, 1.04, 1, 6);
    expect(value).not.toBe(1);
    expect(Math.abs(value - 1)).toBeGreaterThan(0.001);
  });

  it('works with very large frequency without producing NaN', () => {
    const value = criticallyDampedSpring(0.02, 1.04, 1, 120);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBe(1);
  });

  it('preserves monotonic progression toward target for increasing time', () => {
    const t1 = criticallyDampedSpring(0.02, 3, 1, 4);
    const t2 = criticallyDampedSpring(0.04, 3, 1, 4);
    const t3 = criticallyDampedSpring(0.08, 3, 1, 4);

    expect(t1).toBeLessThan(3);
    expect(t2).toBeLessThan(t1);
    expect(t3).toBeLessThan(t2);
    expect(t3).toBeGreaterThanOrEqual(1);
  });
});
