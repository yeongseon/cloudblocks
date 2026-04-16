/**
 * Critically-damped spring interpolation.
 * Returns interpolated value at time `t` (seconds) for a spring
 * transitioning from `from` to `to`.
 *
 * @param t - elapsed time in seconds (0 = start)
 * @param from - initial value
 * @param to - target value (equilibrium)
 * @param frequency - natural frequency in Hz (higher = faster settle), default 4
 * @returns interpolated value that converges to `to`
 */
export function criticallyDampedSpring(t: number, from: number, to: number, frequency = 4): number {
  if (t <= 0) {
    return from;
  }

  const omega = 2 * Math.PI * frequency;
  const value = to + (from - to) * (1 + omega * t) * Math.exp(-omega * t);

  if (Math.abs(value - to) <= 0.001) {
    return to;
  }

  return value;
}
