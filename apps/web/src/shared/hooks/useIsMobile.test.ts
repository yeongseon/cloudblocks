import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

function createMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '(max-width: 768px)',
    addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    dispatchChange(newMatches: boolean) {
      mql.matches = newMatches;
      for (const fn of listeners) {
        fn({ matches: newMatches } as MediaQueryListEvent);
      }
    },
  };
  return { mql, listeners };
}

describe('useIsMobile', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns true when viewport is mobile-sized', () => {
    const { mql } = createMatchMedia(true);
    window.matchMedia = vi.fn().mockReturnValue(mql);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when viewport is desktop-sized', () => {
    const { mql } = createMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when media query changes', () => {
    const { mql } = createMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      mql.dispatchChange(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      mql.dispatchChange(false);
    });
    expect(result.current).toBe(false);
  });

  it('cleans up listener on unmount', () => {
    const { mql } = createMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);

    const { unmount } = renderHook(() => useIsMobile());
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
