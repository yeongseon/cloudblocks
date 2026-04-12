import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

interface MotionQueryMock {
  mql: MediaQueryList & { dispatchChange: (matches: boolean) => void };
}

function createMotionQueryMock(matches: boolean): MotionQueryMock {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];
  let currentMatches = matches;

  const mql = {
    get matches() {
      return currentMatches;
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_event: string, handler: (event: MediaQueryListEvent) => void) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: (event: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(handler);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    dispatchChange(nextMatches: boolean) {
      currentMatches = nextMatches;
      for (const listener of listeners) {
        listener({ matches: nextMatches } as MediaQueryListEvent);
      }
    },
  } as unknown as MediaQueryList & { dispatchChange: (matches: boolean) => void };

  return { mql };
}

describe('useReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('uses the current reduced motion preference as initial value', () => {
    const { mql } = createMotionQueryMock(true);
    window.matchMedia = vi.fn().mockReturnValue(mql);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    const { mql } = createMotionQueryMock(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mql.dispatchChange(true);
    });
    expect(result.current).toBe(true);
  });

  it('removes the change listener on unmount', () => {
    const { mql } = createMotionQueryMock(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);

    const { unmount } = renderHook(() => useReducedMotion());

    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
