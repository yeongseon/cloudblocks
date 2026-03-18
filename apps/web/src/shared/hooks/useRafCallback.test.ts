import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRafCallback } from './useRafCallback';

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
    queuedFrames.forEach(([, callback]) => callback(timestamp));
  };

  return {
    runFrame,
    requestAnimationFrameMock,
    cancelAnimationFrameMock,
  };
}

describe('useRafCallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('batches multiple calls into one frame and keeps latest args', () => {
    const { runFrame, requestAnimationFrameMock } = installRafMocks();
    const callback = vi.fn();

    const { result } = renderHook(() => useRafCallback(callback));

    act(() => {
      result.current(1);
      result.current(2);
      result.current(3);
    });

    expect(requestAnimationFrameMock).toHaveBeenCalledOnce();
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      runFrame();
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(3);
  });

  it('schedules a new frame after previous frame runs', () => {
    const { runFrame, requestAnimationFrameMock } = installRafMocks();
    const callback = vi.fn();

    const { result } = renderHook(() => useRafCallback(callback));

    act(() => {
      result.current('first');
      runFrame();
      result.current('second');
      runFrame();
    });

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, 'first');
    expect(callback).toHaveBeenNthCalledWith(2, 'second');
  });

  it('uses the latest callback reference after rerender', () => {
    const { runFrame } = installRafMocks();

    const callbackA = vi.fn();
    const callbackB = vi.fn();

    const { result, rerender } = renderHook(
      ({ callback }: { callback: (value: number) => void }) => useRafCallback(callback),
      { initialProps: { callback: callbackA } },
    );

    act(() => {
      result.current(42);
    });

    rerender({ callback: callbackB });

    act(() => {
      runFrame();
    });

    expect(callbackA).not.toHaveBeenCalled();
    expect(callbackB).toHaveBeenCalledOnce();
    expect(callbackB).toHaveBeenCalledWith(42);
  });

  it('cancels pending frame on unmount', () => {
    const { cancelAnimationFrameMock } = installRafMocks();
    const callback = vi.fn();

    const { result, unmount } = renderHook(() => useRafCallback(callback));

    act(() => {
      result.current('pending');
    });

    unmount();

    expect(cancelAnimationFrameMock).toHaveBeenCalledOnce();
    expect(callback).not.toHaveBeenCalled();
  });
});
