import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SceneCanvas } from './SceneCanvas';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { Connection, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { endpointId } from '@cloudblocks/schema';
import { audioService } from '../../shared/utils/audioService';
import * as viewportUtils from './utils/viewportUtils';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');
vi.mock('../../shared/utils/audioService', () => ({
  audioService: { playSound: vi.fn() },
}));
const containerBlockSpriteMock = vi.fn((_props: unknown) => null);
const blockSpriteMock = vi.fn((_props: unknown) => null);
const connectionRendererMock = vi.fn((_props: unknown) => null);
vi.mock('../../entities/container-block/ContainerBlockSprite', () => ({
  ContainerBlockSprite: (props: { containerId?: string }) => {
    containerBlockSpriteMock(props);
    return (
      <div data-container-id={props.containerId} data-testid={`container-${props.containerId}`} />
    );
  },
}));
vi.mock('../../entities/block/BlockSprite', () => ({
  BlockSprite: (props: { blockId?: string }) => {
    blockSpriteMock(props);
    return <div data-testid={`block-${props.blockId}`} />;
  },
}));
vi.mock('../../entities/connection/ConnectionRenderer', () => ({
  ConnectionRenderer: (props: { connectionId?: string; overlayMode?: string }) => {
    connectionRendererMock(props);
    return (
      <g
        data-testid={`connection-${props.connectionId}`}
        data-overlay-mode={props.overlayMode ?? 'normal'}
      />
    );
  },
}));
vi.mock('../../entities/connection/ExternalActorSprite', () => ({
  ExternalActorSprite: () => null,
}));
vi.mock('./EmptyCanvasOverlay', () => ({ EmptyCanvasOverlay: () => null }));
vi.mock('./DragGhost', () => ({ DragGhost: () => null }));
vi.mock('./ConnectionPreview', () => ({ ConnectionPreview: () => null }));

const mockSetSelectedId = vi.fn();
const mockAddNode = vi.fn();
const mockMoveExternalBlockPosition = vi.fn();
const mockClearSelection = vi.fn();
const mockSetSelectedIds = vi.fn();
const mockCompleteInteraction = vi.fn();
const mockSetCanvasZoom = vi.fn();
const mockClearFitToContentRequest = vi.fn();
let mockFitToContentRequested = false;
let mockInteractionState: 'idle' | 'placing' | 'connecting' = 'idle';
let mockDraggedBlockCategory: string | null = null;
let mockDraggedResourceName: string | null = null;
let mockDraggedResourceType: string | null = null;
let mockDraggedSubtype: string | null = null;
let mockIsSoundMuted = true;

const architecture: {
  nodes: Array<ResourceBlock | ContainerBlock>;
  connections: Connection[];
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
      addNode: mockAddNode,
      moveExternalBlockPosition: mockMoveExternalBlockPosition,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useArchitectureStore);

  vi.mocked(useUIStore).mockImplementation(((selector: unknown) => {
    const state = {
      setSelectedId: mockSetSelectedId,
      selectedIds: new Set<string>(),
      clearSelection: mockClearSelection,
      setSelectedIds: mockSetSelectedIds,
      interactionState: mockInteractionState,
      draggedBlockCategory: mockDraggedBlockCategory,
      draggedResourceName: mockDraggedResourceName,
      draggedResourceType: mockDraggedResourceType,
      draggedSubtype: mockDraggedSubtype,
      activeProvider: 'aws',
      completeInteraction: mockCompleteInteraction,
      setCanvasZoom: mockSetCanvasZoom,
      fitToContentRequested: mockFitToContentRequested,
      clearFitToContentRequest: mockClearFitToContentRequest,
      isSoundMuted: mockIsSoundMuted,
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
    mockInteractionState = 'idle';
    mockDraggedBlockCategory = null;
    mockDraggedResourceName = null;
    mockDraggedResourceType = null;
    mockDraggedSubtype = null;
    mockIsSoundMuted = true;
    mockSetCanvasZoom.mockClear();
    mockClearFitToContentRequest.mockClear();
    architecture.nodes = [];
    architecture.connections = [];
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

  it('falls back to window resize events when ResizeObserver is unavailable', () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: undefined });

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<SceneCanvas />);

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: originalResizeObserver,
    });
  });

  it('recomputes origin on window resize in the fallback path', () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: undefined });

    let rect = {
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    const originSpy = vi.spyOn(viewportUtils, 'computeViewportOrigin');

    const { container, unmount } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      configurable: true,
      value: () => rect,
    });

    rect = {
      width: 960,
      height: 720,
      top: 0,
      left: 0,
      right: 960,
      bottom: 720,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };

    window.dispatchEvent(new Event('resize'));

    expect(originSpy).toHaveBeenCalledWith(960, 720);

    unmount();
    originSpy.mockRestore();
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: originalResizeObserver,
    });
  });
});

describe('SceneCanvas pointer capture handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFitToContentRequested = false;
    architecture.nodes = [];
    architecture.connections = [];
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

  it('clears selection on shift-click without starting a lasso drag', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    Object.defineProperty(viewport, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(viewport, { pointerId: 3, clientX: 20, clientY: 30, shiftKey: true });
    fireEvent.pointerUp(viewport, { pointerId: 3, clientX: 20, clientY: 30, shiftKey: true });

    expect(mockClearSelection).toHaveBeenCalled();
    expect(mockSetSelectedIds).not.toHaveBeenCalled();
  });

  it('selects nodes inside the lasso rectangle after shift-drag', () => {
    const externalBlock: ResourceBlock = {
      id: 'lasso-target',
      name: 'Browser',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'browser',
      category: 'delivery',
      provider: 'aws',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      metadata: {},
      roles: ['external'],
    };
    architecture.nodes = [externalBlock];

    const { container, getByTestId, queryByTestId } = render(<SceneCanvas />);
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
    Object.defineProperty(viewport, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(viewport, { pointerId: 4, clientX: 0, clientY: 0, shiftKey: true });
    fireEvent.pointerMove(viewport, { pointerId: 4, clientX: 500, clientY: 500, shiftKey: true });
    expect(getByTestId('lasso-rect')).toBeInTheDocument();

    fireEvent.pointerUp(viewport, { pointerId: 4, clientX: 500, clientY: 500, shiftKey: true });

    expect(mockSetSelectedIds).toHaveBeenCalledWith(['lasso-target']);
    expect(queryByTestId('lasso-rect')).toBeNull();
  });

  it('clears selection when a lasso drag does not hit any nodes', () => {
    architecture.nodes = [
      {
        id: 'far-away',
        name: 'Browser',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'browser',
        category: 'delivery',
        provider: 'aws',
        parentId: null,
        position: { x: 100, y: 0, z: 100 },
        metadata: {},
      },
    ];

    const { container } = render(<SceneCanvas />);
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
    Object.defineProperty(viewport, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(viewport, { pointerId: 13, clientX: 0, clientY: 0, shiftKey: true });
    fireEvent.pointerMove(viewport, { pointerId: 13, clientX: 50, clientY: 50, shiftKey: true });
    fireEvent.pointerUp(viewport, { pointerId: 13, clientX: 50, clientY: 50, shiftKey: true });

    expect(mockSetSelectedIds).not.toHaveBeenCalled();
    expect(mockClearSelection).toHaveBeenCalled();
  });

  it('completes connecting interactions when releasing on empty canvas', () => {
    mockInteractionState = 'connecting';
    setupStoreMocks();

    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerUp(viewport, { pointerId: 5, clientX: 10, clientY: 10 });

    expect(mockCompleteInteraction).toHaveBeenCalledTimes(1);
    expect(mockAddNode).not.toHaveBeenCalled();
  });

  it('starts panning and clears selection on plain canvas drag', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const world = container.querySelector('.scene-world') as HTMLDivElement;

    Object.defineProperty(viewport, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(viewport, { pointerId: 10, clientX: 20, clientY: 30 });
    fireEvent.pointerMove(viewport, { pointerId: 10, clientX: 60, clientY: 90 });

    expect(mockClearSelection).toHaveBeenCalled();
    expect(world.style.transform).not.toBe('translate3d(0px, 0px, 0) scale(0.85)');
  });

  it('ignores pointer-down events that start from child elements', () => {
    architecture.nodes = [
      {
        id: 'child-click',
        name: 'Browser',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'browser',
        category: 'delivery',
        provider: 'aws',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
      },
    ];

    const { getByTestId } = render(<SceneCanvas />);
    fireEvent.pointerDown(getByTestId('block-child-click'), {
      pointerId: 11,
      clientX: 20,
      clientY: 30,
    });

    expect(mockClearSelection).not.toHaveBeenCalled();
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
    architecture.connections = [];
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

  it('clears a fit-to-content request immediately when the canvas is empty', async () => {
    mockFitToContentRequested = true;
    setupStoreMocks();

    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 900,
        height: 700,
        top: 0,
        left: 0,
        right: 900,
        bottom: 700,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    capturedCallback?.(
      [{ contentRect: { width: 900, height: 700 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    await waitFor(() => {
      expect(mockClearFitToContentRequest).toHaveBeenCalledTimes(1);
    });
  });

  it('waits for origin initialization before fitting content', () => {
    mockFitToContentRequested = true;
    architecture.nodes = [
      {
        id: 'origin-wait',
        name: 'Browser',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'browser',
        category: 'delivery',
        provider: 'aws',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
      },
    ];
    setupStoreMocks();

    const { container } = render(<SceneCanvas />);
    const world = container.querySelector('.scene-world') as HTMLDivElement;

    expect(mockClearFitToContentRequest).not.toHaveBeenCalled();
    expect(world.style.transform).toBe('translate3d(0px, 0px, 0) scale(0.85)');
  });

  it('clears the fit request when transform calculation returns null', async () => {
    const transformSpy = vi
      .spyOn(viewportUtils, 'computeFitToContentTransform')
      .mockReturnValueOnce(null);

    mockFitToContentRequested = true;
    architecture.nodes = [
      {
        id: 'null-fit',
        name: 'Browser',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'browser',
        category: 'delivery',
        provider: 'aws',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
      },
    ];
    setupStoreMocks();

    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    Object.defineProperty(viewport, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 900,
        height: 700,
        top: 0,
        left: 0,
        right: 900,
        bottom: 700,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    capturedCallback?.(
      [{ contentRect: { width: 900, height: 700 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    await waitFor(() => {
      expect(mockClearFitToContentRequest).toHaveBeenCalledTimes(1);
    });

    transformSpy.mockRestore();
  });

  it('passes id-based props to rendered sprites and computes occupied cells per container', () => {
    const container: ContainerBlock = {
      id: 'container-1',
      name: 'Region',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'aws',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 10, height: 0.3, depth: 10 },
      metadata: {},
    };
    const nestedBlock: ResourceBlock = {
      id: 'block-1',
      name: 'API',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'web_compute',
      category: 'compute',
      provider: 'aws',
      parentId: container.id,
      position: { x: 2, y: 0, z: 3 },
      metadata: {},
    };

    architecture.nodes = [container, nestedBlock];

    render(<SceneCanvas />);

    expect(containerBlockSpriteMock).toHaveBeenCalled();

    const containerCall = containerBlockSpriteMock.mock.calls.find(
      ([props]) => (props as { containerId?: string }).containerId === container.id,
    );
    expect(containerCall).toBeDefined();
    const containerProps = containerCall![0] as {
      containerId: string;
      occupiedCells?: Set<string>;
    };
    expect(containerProps.containerId).toBe(container.id);
    expect(containerProps.occupiedCells).toEqual(new Set(['2:3', '2:4', '3:3', '3:4']));

    expect(
      blockSpriteMock.mock.calls.some(
        ([props]) =>
          (props as { blockId?: string; onMove?: unknown }).blockId === nestedBlock.id &&
          (props as { onMove?: unknown }).onMove === undefined,
      ),
    ).toBe(true);
  });

  it('routes root external blocks through the external move handler', () => {
    const externalBlock: ResourceBlock = {
      id: 'external-browser',
      name: 'Browser',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'browser',
      category: 'delivery',
      provider: 'aws',
      parentId: null,
      position: { x: -2, y: 0, z: 2 },
      metadata: {},
    };

    architecture.nodes = [externalBlock];

    render(<SceneCanvas />);

    expect(
      blockSpriteMock.mock.calls.some(
        ([props]) =>
          (props as { blockId?: string; onMove?: unknown }).blockId === externalBlock.id &&
          (props as { onMove?: unknown }).onMove === mockMoveExternalBlockPosition,
      ),
    ).toBe(true);
  });

  it('skips nested blocks whose parent container cannot be resolved', () => {
    const orphanedBlock: ResourceBlock = {
      id: 'orphaned-block',
      name: 'Orphan',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'web_compute',
      category: 'compute',
      provider: 'aws',
      parentId: 'missing-container',
      position: { x: 1, y: 0, z: 1 },
      metadata: {},
    };

    architecture.nodes = [orphanedBlock];

    render(<SceneCanvas />);

    expect(blockSpriteMock).not.toHaveBeenCalled();
  });

  it('passes id-based props to connection renderers', () => {
    architecture.connections = [
      {
        id: 'conn-1',
        from: endpointId('source', 'output', 'data'),
        to: endpointId('target', 'input', 'data'),
        metadata: {},
      },
    ];

    render(<SceneCanvas />);

    expect(
      connectionRendererMock.mock.calls.some(
        ([props]) =>
          (props as { connectionId?: string; overlapOffset?: number }).connectionId === 'conn-1' &&
          (props as { overlapOffset?: number }).overlapOffset === 0,
      ),
    ).toBe(true);
  });

  it('renders top-level containers before nested containers', () => {
    const rootContainer: ContainerBlock = {
      id: 'root-container',
      name: 'VNet',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'aws',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 16, height: 0.3, depth: 12 },
      metadata: {},
    };
    const nestedContainer: ContainerBlock = {
      id: 'nested-container',
      name: 'Subnet',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'aws',
      parentId: rootContainer.id,
      position: { x: 1, y: 0, z: 1 },
      frame: { width: 8, height: 0.3, depth: 6 },
      metadata: {},
    };

    architecture.nodes = [nestedContainer, rootContainer];

    render(<SceneCanvas />);

    const renderedContainerIds = containerBlockSpriteMock.mock.calls.map(
      ([props]) => (props as { containerId?: string }).containerId,
    );

    expect(renderedContainerIds.slice(0, 2)).toEqual(['root-container', 'nested-container']);
  });

  it('sorts same-level containers by isometric depth', () => {
    const backContainer: ContainerBlock = {
      id: 'back-container',
      name: 'Back Zone',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'aws',
      parentId: null,
      position: { x: 5, y: 0, z: 5 },
      frame: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    };
    const frontContainer: ContainerBlock = {
      id: 'front-container',
      name: 'Front Zone',
      kind: 'container',
      layer: 'region',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'aws',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 12, height: 0.3, depth: 10 },
      metadata: {},
    };

    architecture.nodes = [backContainer, frontContainer];

    render(<SceneCanvas />);

    const renderedContainerIds = containerBlockSpriteMock.mock.calls.map(
      ([props]) => (props as { containerId?: string }).containerId,
    );

    expect(renderedContainerIds.slice(0, 2)).toEqual(['front-container', 'back-container']);
  });
});

describe('SceneCanvas placement flows', () => {
  const regionContainer: ContainerBlock = {
    id: 'region-1',
    name: 'Subnet',
    kind: 'container',
    layer: 'subnet',
    resourceType: 'subnet',
    category: 'network',
    provider: 'aws',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 12, height: 0.3, depth: 10 },
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFitToContentRequested = false;
    mockInteractionState = 'idle';
    mockDraggedBlockCategory = null;
    mockDraggedResourceName = null;
    mockDraggedResourceType = null;
    mockDraggedSubtype = null;
    mockIsSoundMuted = true;
    architecture.nodes = [];
    architecture.connections = [];
    setupStoreMocks();
  });

  it('adds a block to a valid container drop target', () => {
    architecture.nodes = [regionContainer];
    mockInteractionState = 'placing';
    mockDraggedBlockCategory = 'compute';
    mockDraggedResourceName = 'API';
    mockDraggedResourceType = 'web_compute';
    mockIsSoundMuted = false;
    setupStoreMocks();

    const { container, getByTestId } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const dropTarget = getByTestId('container-region-1');

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    document.elementsFromPoint = vi.fn(() => [dropTarget]);

    fireEvent.pointerUp(viewport, { pointerId: 6, clientX: 120, clientY: 180 });

    expect(mockAddNode).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'resource',
        resourceType: 'web_compute',
        name: 'API',
        parentId: 'region-1',
        provider: 'aws',
      }),
    );
    expect(audioService.playSound).toHaveBeenCalledWith('block-snap');
    expect(mockCompleteInteraction).toHaveBeenCalledTimes(1);
  });

  it('skips placement when the hovered container id cannot be resolved', () => {
    architecture.nodes = [regionContainer];
    mockInteractionState = 'placing';
    mockDraggedBlockCategory = 'compute';
    mockDraggedResourceName = 'API';
    mockDraggedResourceType = 'web_compute';
    setupStoreMocks();

    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const unresolvedTarget = document.createElement('div');
    unresolvedTarget.setAttribute('data-container-id', 'missing-region');

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    document.elementsFromPoint = vi.fn(() => [unresolvedTarget]);

    fireEvent.pointerUp(viewport, { pointerId: 7, clientX: 120, clientY: 180 });

    expect(mockAddNode).not.toHaveBeenCalled();
    expect(mockCompleteInteraction).toHaveBeenCalledTimes(1);
  });

  it('does not place a block into a container that fails placement rules', () => {
    architecture.nodes = [regionContainer];
    mockInteractionState = 'placing';
    mockDraggedBlockCategory = 'delivery';
    mockDraggedResourceName = 'Browser';
    mockDraggedResourceType = 'browser';
    setupStoreMocks();

    const { container, getByTestId } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const dropTarget = getByTestId('container-region-1');

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    document.elementsFromPoint = vi.fn(() => [dropTarget]);

    fireEvent.pointerUp(viewport, { pointerId: 12, clientX: 120, clientY: 180 });

    expect(mockAddNode).not.toHaveBeenCalled();
    expect(mockCompleteInteraction).toHaveBeenCalledTimes(1);
  });

  it('adds a root-level block when the resource type allows canvas placement', () => {
    mockInteractionState = 'placing';
    mockDraggedBlockCategory = 'delivery';
    mockDraggedResourceName = 'Browser';
    mockDraggedResourceType = 'browser';
    setupStoreMocks();

    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    document.elementsFromPoint = vi.fn(() => []);

    fireEvent.pointerUp(viewport, { pointerId: 8, clientX: 80, clientY: 120 });

    expect(mockAddNode).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'browser', parentId: null, name: 'Browser' }),
    );
    expect(mockCompleteInteraction).toHaveBeenCalledTimes(1);
  });

  it('does not add a root-level block when the resource type requires a container', () => {
    mockInteractionState = 'placing';
    mockDraggedBlockCategory = 'compute';
    mockDraggedResourceName = 'API';
    mockDraggedResourceType = 'web_compute';
    setupStoreMocks();

    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    document.elementsFromPoint = vi.fn(() => []);

    fireEvent.pointerUp(viewport, { pointerId: 9, clientX: 80, clientY: 120 });

    expect(mockAddNode).not.toHaveBeenCalled();
    expect(mockCompleteInteraction).toHaveBeenCalledTimes(1);
  });

  it('zooms the canvas on Ctrl+wheel events', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const world = container.querySelector('.scene-world') as HTMLDivElement;

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

    fireEvent.wheel(viewport, { clientX: 400, clientY: 300, deltaY: -120, ctrlKey: true });

    expect(world.style.transform).not.toBe('translate3d(0px, 0px, 0) scale(0.85)');
    expect(mockSetCanvasZoom).toHaveBeenCalled();
  });

  it('zooms out on Ctrl+wheel events with positive delta', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const world = container.querySelector('.scene-world') as HTMLDivElement;

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

    fireEvent.wheel(viewport, { clientX: 400, clientY: 300, deltaY: 120, ctrlKey: true });

    expect(world.style.transform).not.toBe('translate3d(0px, 0px, 0) scale(0.85)');
  });

  it('zooms the canvas on Meta+wheel events (macOS)', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const world = container.querySelector('.scene-world') as HTMLDivElement;

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

    fireEvent.wheel(viewport, { clientX: 400, clientY: 300, deltaY: -120, metaKey: true });

    expect(world.style.transform).not.toBe('translate3d(0px, 0px, 0) scale(0.85)');
    expect(mockSetCanvasZoom).toHaveBeenCalled();
  });

  it('does not zoom on wheel events without Ctrl/Meta modifier', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;
    const world = container.querySelector('.scene-world') as HTMLDivElement;

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

    // Clear any calls from initial render's zoom sync effect
    mockSetCanvasZoom.mockClear();

    const initialTransform = world.style.transform;
    const wheelEvent = new WheelEvent('wheel', {
      clientX: 400,
      clientY: 300,
      deltaY: -120,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault');
    viewport.dispatchEvent(wheelEvent);

    expect(world.style.transform).toBe(initialTransform);
    expect(mockSetCanvasZoom).not.toHaveBeenCalled();
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  describe('SceneCanvas selected-connection overlay', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockFitToContentRequested = false;
      mockInteractionState = 'idle';
      mockDraggedBlockCategory = null;
      mockDraggedResourceName = null;
      mockDraggedResourceType = null;
      mockDraggedSubtype = null;
      mockIsSoundMuted = true;
      architecture.nodes = [];
      architecture.connections = [];
      setupStoreMocks();
    });

    it('splits selected connection across base and overlay layers with overlay mode', () => {
      architecture.connections = [
        {
          id: 'sel-conn',
          from: endpointId('a', 'output', 'data'),
          to: endpointId('b', 'input', 'data'),
          metadata: {},
        },
      ];

      vi.mocked(useUIStore).mockImplementation(((selector: unknown) => {
        const state = {
          setSelectedId: mockSetSelectedId,
          selectedIds: new Set(['sel-conn']),
          clearSelection: mockClearSelection,
          setSelectedIds: mockSetSelectedIds,
          interactionState: mockInteractionState,
          draggedBlockCategory: mockDraggedBlockCategory,
          draggedResourceName: mockDraggedResourceName,
          draggedResourceType: mockDraggedResourceType,
          draggedSubtype: mockDraggedSubtype,
          activeProvider: 'aws',
          completeInteraction: mockCompleteInteraction,
          setCanvasZoom: mockSetCanvasZoom,
          fitToContentRequested: mockFitToContentRequested,
          clearFitToContentRequest: mockClearFitToContentRequest,
          isSoundMuted: mockIsSoundMuted,
          gridStyle: 'paper' as const,
          flowFocusMode: false,
        };
        return (selector as (s: typeof state) => unknown)(state);
      }) as typeof useUIStore);

      vi.mocked(useArchitectureStore).mockImplementation(((selector: unknown) => {
        const state = {
          workspace: { architecture },
          addNode: mockAddNode,
          moveExternalBlockPosition: mockMoveExternalBlockPosition,
        };
        return (selector as (s: typeof state) => unknown)(state);
      }) as typeof useArchitectureStore);

      render(<SceneCanvas />);

      // Verify that ConnectionRenderer was called with the selected connection
      // at least once with overlayMode='hit-only' (from base layer)
      expect(
        connectionRendererMock.mock.calls.some(
          ([props]) =>
            (props as { connectionId?: string; overlayMode?: string }).connectionId ===
              'sel-conn' && (props as { overlayMode?: string }).overlayMode === 'hit-only',
        ),
      ).toBe(true);

      // Verify that ConnectionRenderer was called with the selected connection
      // at least once with overlayMode='visual-only' (from overlay layer)
      expect(
        connectionRendererMock.mock.calls.some(
          ([props]) =>
            (props as { connectionId?: string; overlayMode?: string }).connectionId ===
              'sel-conn' && (props as { overlayMode?: string }).overlayMode === 'visual-only',
        ),
      ).toBe(true);
    });
  });
});
