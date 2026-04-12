import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnimationClock } from './useAnimationClock';

const useReducedMotionMock = vi.fn(() => false);

vi.mock('./useReducedMotion', () => ({
  useReducedMotion: () => useReducedMotionMock(),
}));

interface RafController {
  runFrame: (timestamp?: number) => void;
  requestAnimationFrameMock: ReturnType<typeof vi.fn>;
  cancelAnimationFrameMock: ReturnType<typeof vi.fn>;
}

function installRafMocks(): RafController {
  let frameId = 0;
  const frameQueue = new Map<number, FrameRequestCallback>();

  const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
    frameId += 1;
    frameQueue.set(frameId, callback);
    return frameId;
  });

  const cancelAnimationFrameMock = vi.fn((id: number) => {
    frameQueue.delete(id);
  });

  vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);

  const runFrame = (timestamp = 16) => {
    const queuedFrames = [...frameQueue.entries()];
    frameQueue.clear();
    queuedFrames.forEach(([, callback]) => {
      callback(timestamp);
    });
  };

  return {
    runFrame,
    requestAnimationFrameMock,
    cancelAnimationFrameMock,
  };
}

describe('useAnimationClock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useReducedMotionMock.mockReset();
    useReducedMotionMock.mockReturnValue(false);
  });

  it('returns elapsed 0 and does not schedule frames when disabled', () => {
    const { requestAnimationFrameMock } = installRafMocks();

    const { result } = renderHook(() => useAnimationClock(false));

    expect(result.current.elapsed).toBe(0);
    expect(result.current.reducedMotion).toBe(false);
    expect(requestAnimationFrameMock).not.toHaveBeenCalled();
  });

  it('returns elapsed 0 and reducedMotion true when reduced motion is enabled', () => {
    const { requestAnimationFrameMock } = installRafMocks();
    useReducedMotionMock.mockReturnValue(true);

    const { result } = renderHook(() => useAnimationClock(true));

    expect(result.current.elapsed).toBe(0);
    expect(result.current.reducedMotion).toBe(true);
    expect(requestAnimationFrameMock).not.toHaveBeenCalled();
  });

  it('increments elapsed time while enabled', () => {
    const { runFrame } = installRafMocks();

    const { result } = renderHook(() => useAnimationClock(true));

    act(() => {
      runFrame(100);
    });
    expect(result.current.elapsed).toBe(0);

    act(() => {
      runFrame(160);
    });
    expect(result.current.elapsed).toBe(60);
  });

  it('cancels pending animation frame on unmount', () => {
    const { cancelAnimationFrameMock } = installRafMocks();

    const { unmount } = renderHook(() => useAnimationClock(true));
    unmount();

    expect(cancelAnimationFrameMock).toHaveBeenCalledOnce();
  });

  it('resets elapsed to 0 when disabled after being active', () => {
    const { runFrame } = installRafMocks();

    const { result, rerender } = renderHook(({ enabled }) => useAnimationClock(enabled), {
      initialProps: { enabled: true },
    });

    act(() => {
      runFrame(100);
    });
    act(() => {
      runFrame(200);
    });
    expect(result.current.elapsed).toBe(100);

    rerender({ enabled: false });
    expect(result.current.elapsed).toBe(0);
  });

  it('returns elapsed 0 on first frame after re-enable (no stale value)', () => {
    const { runFrame } = installRafMocks();

    const { result, rerender } = renderHook(({ enabled }) => useAnimationClock(enabled), {
      initialProps: { enabled: true },
    });

    // Run a few frames to accumulate elapsed time
    act(() => {
      runFrame(100);
    });
    act(() => {
      runFrame(200);
    });
    expect(result.current.elapsed).toBe(100);

    // Disable
    rerender({ enabled: false });
    expect(result.current.elapsed).toBe(0);

    // Re-enable — before RAF fires, elapsed must still be 0 (not stale 100)
    rerender({ enabled: true });
    expect(result.current.elapsed).toBe(0);

    // After first RAF fires on re-enable, elapsed resets from new start
    act(() => {
      runFrame(500);
    });
    expect(result.current.elapsed).toBe(0); // first frame sets startRef

    act(() => {
      runFrame(600);
    });
    expect(result.current.elapsed).toBe(100);
  });

  it('cancels pending frame when transitioning from active to inactive', () => {
    const { runFrame, cancelAnimationFrameMock } = installRafMocks();

    const { rerender } = renderHook(({ enabled }) => useAnimationClock(enabled), {
      initialProps: { enabled: true },
    });

    // Run a frame so frameRef.current is set
    act(() => {
      runFrame(100);
    });

    // Transition to inactive — should cancel the pending frame
    rerender({ enabled: false });
    expect(cancelAnimationFrameMock).toHaveBeenCalled();
  });
});
