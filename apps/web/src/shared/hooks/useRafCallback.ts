import { useCallback, useEffect, useRef } from 'react';

export function useRafCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
): (...args: TArgs) => void {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);
  const lastArgsRef = useRef<TArgs | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return useCallback((...args: TArgs) => {
    lastArgsRef.current = args;

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;

      const lastArgs = lastArgsRef.current as TArgs;
      lastArgsRef.current = null;
      callbackRef.current(...lastArgs);
    });
  }, []);
}
