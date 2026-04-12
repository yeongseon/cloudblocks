import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export interface AnimationClockResult {
  elapsed: number;
  reducedMotion: boolean;
}

export function useAnimationClock(enabled: boolean): AnimationClockResult {
  const reducedMotion = useReducedMotion();
  const active = enabled && !reducedMotion;
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    const tick = (now: number) => {
      if (startRef.current === null) {
        startRef.current = now;
      }

      setElapsed(now - startRef.current);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [active]);

  // Reset stale elapsed when transitioning to inactive.
  // This is a "adjust state during render" pattern (React-safe),
  // avoiding synchronous setState inside effects.
  if (!active && elapsed !== 0) {
    setElapsed(0);
  }

  return { elapsed: active ? elapsed : 0, reducedMotion };
}
