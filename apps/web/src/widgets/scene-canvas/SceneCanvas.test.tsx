import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SceneCanvas } from './SceneCanvas';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');
vi.mock('../../entities/store/workerStore');
vi.mock('../../shared/utils/audioService', () => ({
  audioService: { playSound: vi.fn() },
}));
vi.mock('../../entities/plate/PlateSprite', () => ({ PlateSprite: () => null }));
vi.mock('../../entities/block/BlockSprite', () => ({ BlockSprite: () => null }));
vi.mock('../../entities/connection/BrickConnector', () => ({ BrickConnector: () => null }));
vi.mock('../../entities/connection/ExternalActorSprite', () => ({ ExternalActorSprite: () => null }));
vi.mock('./EmptyCanvasOverlay', () => ({ EmptyCanvasOverlay: () => null }));
vi.mock('./DragGhost', () => ({ DragGhost: () => null }));
vi.mock('./ConnectionPreview', () => ({ ConnectionPreview: () => null }));

const mockSetSelectedId = vi.fn();
const mockAddBlock = vi.fn();
const mockCompleteInteraction = vi.fn();

const architecture = {
  nodes: [],
  connections: [],
  externalActors: [],
};

function setupStoreMocks() {
  vi.mocked(useArchitectureStore).mockImplementation(((selector: unknown) => {
    const state = {
      workspace: { architecture },
      addBlock: mockAddBlock,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useArchitectureStore);

  vi.mocked(useUIStore).mockImplementation(((selector: unknown) => {
    const state = {
      setSelectedId: mockSetSelectedId,
      interactionState: 'idle' as const,
      draggedBlockCategory: null,
      draggedResourceName: null,
      activeProvider: 'aws',
      completeInteraction: mockCompleteInteraction,
      isSoundMuted: true,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useUIStore);

  vi.mocked(useWorkerStore).mockImplementation(((selector: unknown) => {
    const state = {
      workerPosition: [-3, 0, -6] as [number, number, number],
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useWorkerStore);
}

describe('SceneCanvas ResizeObserver origin update', () => {
  let capturedCallback: ResizeObserverCallback | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    setupStoreMocks();
    capturedCallback = null;

    globalThis.ResizeObserver = class MockResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        capturedCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      constructor(_cb: ResizeObserverCallback) {}
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it('recomputes origin when ResizeObserver fires', () => {
    const { container } = render(<SceneCanvas />);
    expect(capturedCallback).not.toBeNull();

    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    Object.defineProperty(viewport, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }),
    });

    capturedCallback!(
      [{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    expect(container.querySelector('.scene-viewport')).toBeTruthy();
  });
});

describe('SceneCanvas pointer capture handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStoreMocks();
  });

  it('does not release pointer capture when container does not own it', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    const hasPointerCaptureMock = vi.fn().mockReturnValue(false);
    const releasePointerCaptureMock = vi.fn();

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCaptureMock,
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCaptureMock,
    });

    fireEvent.pointerUp(viewport, { pointerId: 42, clientX: 10, clientY: 10 });

    expect(releasePointerCaptureMock).not.toHaveBeenCalled();
  });

  it('releases pointer capture when container owns it', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    const hasPointerCaptureMock = vi.fn().mockReturnValue(true);
    const releasePointerCaptureMock = vi.fn();

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCaptureMock,
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCaptureMock,
    });

    fireEvent.pointerUp(viewport, { pointerId: 7, clientX: 10, clientY: 10 });

    expect(releasePointerCaptureMock).toHaveBeenCalledWith(7);
  });
});
