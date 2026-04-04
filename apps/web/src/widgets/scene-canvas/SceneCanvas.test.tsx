import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SceneCanvas } from './SceneCanvas';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ResourceBlock } from '@cloudblocks/schema';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');
vi.mock('../../shared/utils/audioService', () => ({
  audioService: { playSound: vi.fn() },
}));
vi.mock('../../entities/container-block/ContainerBlockSprite', () => ({
  ContainerBlockSprite: () => null,
}));
vi.mock('../../entities/block/BlockSprite', () => ({ BlockSprite: () => null }));
vi.mock('../../entities/connection/ConnectionRenderer', () => ({ ConnectionRenderer: () => null }));
vi.mock('../../entities/connection/ExternalActorSprite', () => ({
  ExternalActorSprite: () => null,
}));
vi.mock('./EmptyCanvasOverlay', () => ({ EmptyCanvasOverlay: () => null }));
vi.mock('./DragGhost', () => ({ DragGhost: () => null }));
vi.mock('./ConnectionPreview', () => ({ ConnectionPreview: () => null }));

const mockSetSelectedId = vi.fn();
const mockAddBlock = vi.fn();
const mockCompleteInteraction = vi.fn();
const mockSetCanvasZoom = vi.fn();
const mockClearFitToContentRequest = vi.fn();
let mockFitToContentRequested = false;

const architecture: {
  nodes: ResourceBlock[];
  connections: unknown[];
  externalActors: unknown[];
} = {
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
      draggedResourceType: null,
      draggedSubtype: null,
      activeProvider: 'aws',
      completeInteraction: mockCompleteInteraction,
      setCanvasZoom: mockSetCanvasZoom,
      fitToContentRequested: mockFitToContentRequested,
      clearFitToContentRequest: mockClearFitToContentRequest,
      isSoundMuted: true,
      gridStyle: 'paper' as const,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useUIStore);
}

describe('SceneCanvas ResizeObserver origin update', () => {
  let capturedCallback: ResizeObserverCallback | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFitToContentRequested = false;
    mockSetCanvasZoom.mockClear();
    mockClearFitToContentRequest.mockClear();
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
      value: () => ({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
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
    mockFitToContentRequested = false;
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

describe('SceneCanvas external lane zone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFitToContentRequested = false;
    architecture.nodes = [];
    architecture.connections = [];
    setupStoreMocks();
  });

  it('renders external lane zone when root external blocks exist', () => {
    const externalBlock: ResourceBlock = {
      id: 'external-1',
      name: 'Client',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'browser',
      category: 'delivery',
      provider: 'aws',
      parentId: null,
      position: { x: -2, y: 0, z: 4 },
      metadata: {},
      roles: ['external'],
    };
    architecture.nodes = [externalBlock];

    const { getByTestId } = render(<SceneCanvas />);
    expect(getByTestId('external-lane-zone')).toBeInTheDocument();
  });

  it('does not render external lane zone when no root external blocks exist', () => {
    const internalBlock: ResourceBlock = {
      id: 'internal-1',
      name: 'Compute',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'web_compute',
      category: 'compute',
      provider: 'aws',
      parentId: 'container-1',
      position: { x: 1, y: 0, z: 1 },
      metadata: {},
    };
    architecture.nodes = [internalBlock];

    const { queryByTestId } = render(<SceneCanvas />);
    expect(queryByTestId('external-lane-zone')).toBeNull();
  });
});

describe('SceneCanvas fit-to-content', () => {
  let capturedCallback: ResizeObserverCallback | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFitToContentRequested = false;
    architecture.nodes = [];
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

  it('fits viewport and clears request when fit-to-content is requested', async () => {
    const externalBlock: ResourceBlock = {
      id: 'external-fit',
      name: 'Client',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'browser',
      category: 'delivery',
      provider: 'aws',
      parentId: null,
      position: { x: -6, y: 0, z: 6 },
      metadata: {},
      roles: ['external'],
    };
    architecture.nodes = [externalBlock];
    mockFitToContentRequested = true;

    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const world = container.querySelector('.scene-world') as HTMLDivElement;

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 1200,
        height: 800,
        top: 0,
        left: 0,
        right: 1200,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    // Fire ResizeObserver to set origin to non-zero (required for fit-to-content guard)
    capturedCallback!(
      [{ contentRect: { width: 1200, height: 800 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    await waitFor(() => {
      expect(world.style.transform).not.toBe('translate3d(0px, 0px, 0) scale(0.85)');
      expect(mockClearFitToContentRequest).toHaveBeenCalledTimes(1);
    });
  });
});
