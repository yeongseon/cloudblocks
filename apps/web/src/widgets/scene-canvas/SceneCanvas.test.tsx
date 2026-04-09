import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SceneCanvas } from './SceneCanvas';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { Connection, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { endpointId } from '@cloudblocks/schema';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');
vi.mock('../../shared/utils/audioService', () => ({
  audioService: { playSound: vi.fn() },
}));
const containerBlockSpriteMock = vi.fn(() => null);
const blockSpriteMock = vi.fn(() => null);
const connectionRendererMock = vi.fn(() => null);
vi.mock('../../entities/container-block/ContainerBlockSprite', () => ({
  ContainerBlockSprite: (props: unknown) => containerBlockSpriteMock(props),
}));
vi.mock('../../entities/block/BlockSprite', () => ({
  BlockSprite: (props: unknown) => blockSpriteMock(props),
}));
vi.mock('../../entities/connection/ConnectionRenderer', () => ({
  ConnectionRenderer: (props: unknown) => connectionRendererMock(props),
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
      clearSelection: mockClearSelection,
      setSelectedIds: mockSetSelectedIds,
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
    )?.[0] as {
      containerId: string;
      occupiedCells?: Set<string>;
    };
    expect(containerCall.containerId).toBe(container.id);
    expect(containerCall.occupiedCells).toEqual(new Set(['2:3', '2:4', '3:3', '3:4']));

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
});
