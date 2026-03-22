import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ConnectionPreview } from './ConnectionPreview';
import { useUIStore } from '../../entities/store/uiStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';

vi.mock('../../entities/store/uiStore');
vi.mock('../../entities/store/architectureStore');
vi.mock('../../shared/hooks/useRafCallback', () => ({
  useRafCallback: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

type UIState = {
  interactionState: 'idle' | 'connecting';
  connectionSource: string | null;
};

type ArchNode = {
  id: string;
  kind: 'container' | 'resource';
  parentId: string | null;
  name?: string;
  layer?: 'region' | 'resource';
  category?: 'compute';
  provider?: 'azure';
  resourceType?: 'virtual_network' | 'web_compute';
  position?: { x: number; y: number; z: number };
  size?: { width: number; height: number; depth: number };
  metadata?: Record<string, unknown>;
};

const basePlate: ArchNode = {
  id: 'plate-1',
  kind: 'container',
  parentId: null,
  name: 'VNet',
  layer: 'region',
  provider: 'azure',
  resourceType: 'virtual_network',
  position: { x: 0, y: 0, z: 0 },
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
};

const baseBlock: ArchNode = {
  id: 'block-1',
  kind: 'resource',
  parentId: 'plate-1',
  name: 'VM',
  layer: 'resource',
  category: 'compute',
  provider: 'azure',
  resourceType: 'web_compute',
  position: { x: 3, y: 0, z: 6 },
  metadata: {},
};

function mockStores(uiState: UIState, nodes: ArchNode[], externalActors: Array<{ id: string; position: { x: number; y: number; z: number } }> = []) {
  vi.mocked(useUIStore).mockImplementation(((selector: unknown) => {
    return (selector as (s: UIState) => unknown)(uiState);
  }) as typeof useUIStore);

  vi.mocked(useArchitectureStore).mockImplementation(((selector: unknown) => {
    const state = { workspace: { architecture: { nodes, externalActors } } };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useArchitectureStore);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConnectionPreview additional branches', () => {
  it('returns null when source block parent plate is missing', () => {
    mockStores(
      { interactionState: 'connecting', connectionSource: 'block-1' },
      [{ ...baseBlock, parentId: 'missing-plate' }],
    );

    const { container } = render(
      <svg>
        <ConnectionPreview originX={0} originY={0} />
      </svg>,
    );

    expect(container.querySelector('[data-testid="connection-preview-path"]')).toBeNull();
  });

  it('returns null when source is neither block nor external actor', () => {
    mockStores(
      { interactionState: 'connecting', connectionSource: 'unknown-source' },
      [basePlate, baseBlock],
      [{ id: 'actor-1', position: { x: -3, y: 0, z: 5 } }],
    );

    const { container } = render(
      <svg>
        <ConnectionPreview originX={0} originY={0} />
      </svg>,
    );

    expect(container.querySelector('[data-testid="connection-preview-path"]')).toBeNull();
  });

  it('keeps path unchanged when getScreenCTM is unavailable', () => {
    mockStores(
      { interactionState: 'connecting', connectionSource: 'block-1' },
      [basePlate, baseBlock],
    );

    Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
      configurable: true,
      value: () => null,
    });

    const { container } = render(
      <svg>
        <ConnectionPreview originX={0} originY={0} />
      </svg>,
    );

    const path = container.querySelector('[data-testid="connection-preview-path"]') as SVGPathElement;
    const before = path.getAttribute('d');
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 120 }));
    const after = path.getAttribute('d');

    expect(before).toBe(after);
  });

  it('updates preview target when pointer coordinates are transformed', () => {
    mockStores(
      { interactionState: 'connecting', connectionSource: 'block-1' },
      [basePlate, baseBlock],
    );

    Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({}) }),
    });
    Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: 10, y: 20 }),
      }),
    });

    let pointerMoveHandler: ((event: PointerEvent) => void) | null = null;
    const addListenerSpy = vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'pointermove') {
        pointerMoveHandler = listener as (event: PointerEvent) => void;
      }
      return EventTarget.prototype.addEventListener.call(document, type, listener as EventListener, options);
    });

    const { container } = render(
      <svg>
        <ConnectionPreview originX={0} originY={0} />
      </svg>,
    );

    const path = container.querySelector('[data-testid="connection-preview-path"]') as SVGPathElement;
    const before = path.getAttribute('d');

    act(() => {
      pointerMoveHandler?.({ clientX: 10, clientY: 20 } as PointerEvent);
    });

    expect(path.getAttribute('d')).not.toBe(before);
    addListenerSpy.mockRestore();
  });
});
