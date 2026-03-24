import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import interact from 'interactjs';
import { endpointId } from '@cloudblocks/schema';

vi.mock('../store/architectureStore', async () => {
  const actual = await vi.importActual<typeof import('../store/architectureStore')>(
    '../store/architectureStore',
  );
  const { useShallow } =
    await vi.importActual<typeof import('zustand/react/shallow')>('zustand/react/shallow');

  const useArchitectureStoreStable = ((
    selector: Parameters<typeof actual.useArchitectureStore>[0],
  ) => {
    const stableSelector = useShallow(selector);
    return actual.useArchitectureStore(stableSelector);
  }) as typeof actual.useArchitectureStore;

  Object.assign(useArchitectureStoreStable, actual.useArchitectureStore);

  return {
    ...actual,
    useArchitectureStore: useArchitectureStoreStable,
  };
});

import { BlockSprite } from './BlockSprite';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import type {
  ContainerBlock,
  ExternalActor,
  ResourceBlock,
  ResourceCategory,
  Block,
} from '@cloudblocks/schema';
import * as isometric from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import type { DiffDelta } from '../../shared/types/diff';

const interactMocks = vi.hoisted(() => ({
  interactFn: vi.fn(),
  draggableFn: vi.fn(),
  unsetFn: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('interactjs', () => ({
  default: interactMocks.interactFn,
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: toastMocks.error,
  },
}));

vi.mock('./BlockSprite.css', () => ({}));

const parentContainer: ContainerBlock = {
  id: 'container-1',
  name: 'Subnet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  parentId: 'net-1',
  position: { x: 0, y: 0, z: 0 },
  frame: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

type LegacyBlockCategory =
  | ResourceCategory
  | 'edge'
  | 'database'
  | 'storage'
  | 'gateway'
  | 'function'
  | 'queue'
  | 'event'
  | 'analytics'
  | 'identity'
  | 'observability';

const CATEGORY_MAP: Record<LegacyBlockCategory, ResourceCategory> = {
  compute: 'compute',
  data: 'data',
  edge: 'delivery',
  delivery: 'delivery',
  messaging: 'messaging',
  operations: 'operations',
  security: 'security',
  network: 'network',
  database: 'data',
  storage: 'data',
  gateway: 'delivery',
  function: 'compute',
  queue: 'messaging',
  event: 'messaging',
  analytics: 'operations',
  identity: 'identity',
  observability: 'operations',
};

const RESOURCE_TYPE_MAP: Record<ResourceCategory, string> = {
  compute: 'web_compute',
  data: 'relational_database',
  delivery: 'load_balancer',
  security: 'firewall_security',
  operations: 'monitoring',
  messaging: 'message_queue',
  network: 'virtual_network',
  identity: 'identity_service',
};

const makeBlock = (id: string, category: LegacyBlockCategory): ResourceBlock => {
  const normalizedCategory = CATEGORY_MAP[category];
  return {
    id,
    name: `${category}-block`,
    kind: 'resource',
    layer: 'resource',
    resourceType: RESOURCE_TYPE_MAP[normalizedCategory],
    category: normalizedCategory,
    provider: 'azure',
    parentId: parentContainer.id,
    position: { x: 1, y: 0, z: 2 },
    metadata: {},
  };
};

const internetActor: ExternalActor = {
  id: 'actor-internet',
  type: 'internet',
  name: 'Internet',
  position: { x: -3, y: 0, z: 5 },
};

describe('BlockSprite', () => {
  const addConnectionMock = vi.fn();
  const removeNodeMock = vi.fn();
  const moveNodePositionMock = vi.fn();
  const initialUIState = useUIStore.getState();
  const initialArchitectureState = useArchitectureStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState(initialUIState, true);
    useArchitectureStore.setState(initialArchitectureState, true);
    addConnectionMock.mockReturnValue(true);
    interactMocks.draggableFn.mockReturnValue({ unset: interactMocks.unsetFn });
    interactMocks.interactFn.mockReturnValue({ draggable: interactMocks.draggableFn });
    useUIStore.setState({ selectedId: null, toolMode: 'select', connectionSource: null });
    useArchitectureStore.setState({
      addConnection: addConnectionMock,
      removeNode: removeNodeMock,
      moveNodePosition: moveNodePositionMock,
    });
  });

  it('renders with correct screen position styles', () => {
    const block = makeBlock('block-1', 'compute');
    const { container } = render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={120}
        screenY={240}
        zIndex={7}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveStyle({ left: '120px', top: '240px', zIndex: '7' });
  });

  it.each([
    'delivery',
    'compute',
    'database',
    'data',
    'function',
    'queue',
    'event',
    'analytics',
    'identity',
    'operations',
  ] as const)('renders %s as inline SVG', (category) => {
    const block = makeBlock(`block-${category}`, category);
    const { container } = render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');

    const blockImgDiv = container.querySelector('.block-img');
    expect(blockImgDiv).toBeInTheDocument();
  });

  it('does not render provider badge (removed feature)', () => {
    const block = { ...makeBlock('block-provider', 'compute'), provider: 'gcp' as const };
    const { container } = render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    expect(container.querySelector('.block-provider-badge')).toBeNull();
  });

  it('click in select mode calls setSelectedId', async () => {
    const user = userEvent.setup();
    const block = makeBlock('block-select', 'compute');

    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Node: compute-block' }));

    expect(useUIStore.getState().selectedId).toBe('block-select');
  });

  it('click in delete mode calls removeBlock', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'delete' });
    const block = makeBlock('block-delete', 'storage');

    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Node: storage-block' }));

    expect(removeNodeMock).toHaveBeenCalledWith('block-delete');
  });

  it('click in connect mode sets source then creates connection on second click', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'connect' });

    const sourceBlock = makeBlock('block-source', 'gateway');
    const targetBlock = makeBlock('block-target', 'database');

    render(
      <>
        <BlockSprite
          block={sourceBlock}
          parentContainer={parentContainer}
          screenX={0}
          screenY={0}
          zIndex={1}
        />
        <BlockSprite
          block={targetBlock}
          parentContainer={parentContainer}
          screenX={10}
          screenY={20}
          zIndex={2}
        />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Node: gateway-block' }));
    expect(useUIStore.getState().connectionSource).toBe('block-source');

    await user.click(screen.getByRole('button', { name: 'Node: database-block' }));
    expect(addConnectionMock).toHaveBeenCalledWith('block-source', 'block-target');
    expect(useUIStore.getState().connectionSource).toBeNull();
  });

  it('does not create connection when connect mode clicks same source block twice', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'connect' });
    const block = makeBlock('block-same', 'gateway');

    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    const button = screen.getByRole('button', { name: 'Node: gateway-block' });
    await user.click(button);
    await user.click(button);

    expect(useUIStore.getState().connectionSource).toBe('block-same');
    expect(addConnectionMock).not.toHaveBeenCalled();
  });

  it('silently cancels when connect mode rejects an invalid connection', async () => {
    const user = userEvent.setup();
    addConnectionMock.mockReturnValue(false);
    useUIStore.setState({ toolMode: 'connect' });

    const sourceBlock = makeBlock('block-source', 'database');
    const targetBlock = makeBlock('block-target', 'compute');

    render(
      <>
        <BlockSprite
          block={sourceBlock}
          parentContainer={parentContainer}
          screenX={0}
          screenY={0}
          zIndex={1}
        />
        <BlockSprite
          block={targetBlock}
          parentContainer={parentContainer}
          screenX={10}
          screenY={20}
          zIndex={2}
        />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Node: database-block' }));
    await user.click(screen.getByRole('button', { name: 'Node: compute-block' }));

    expect(addConnectionMock).toHaveBeenCalledWith('block-source', 'block-target');
    // #1253: toast.error removed — invalid connections are silently cancelled
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(useUIStore.getState().connectionSource).toBeNull();
  });

  it('adds is-selected class when selected', () => {
    const block = makeBlock('block-selected', 'queue');
    useUIStore.setState({ selectedId: block.id });

    const { container } = render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-selected');
  });

  it('adds is-delete-mode class when in delete mode', () => {
    const block = makeBlock('block-delete-class', 'event');
    useUIStore.setState({ toolMode: 'delete' });

    const { container } = render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-delete-mode');
  });

  it('adds is-connection-source class when block is active source', () => {
    const block = makeBlock('block-conn-source', 'queue');
    useUIStore.setState({ toolMode: 'connect', connectionSource: block.id });

    const { container } = render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-connection-source');
  });

  it('initializes draggable interaction in select mode', () => {
    const block = makeBlock('block-drag', 'function');
    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(vi.mocked(interact)).toHaveBeenCalled();
  });

  it('moves block position from drag deltas and scene zoom', () => {
    const block = makeBlock('block-drag-move', 'compute');
    const { container } = render(
      <div className="scene-world" style={{ transform: 'scale(2)' }}>
        <BlockSprite
          block={block}
          parentContainer={parentContainer}
          screenX={0}
          screenY={0}
          zIndex={1}
        />
      </div>,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        start: (event: { target: HTMLElement }) => void;
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = container.querySelector('.block-sprite') as HTMLElement;
    draggableConfig.listeners.start({ target });
    draggableConfig.listeners.move({ dx: 20, dy: 10, target });

    expect(moveNodePositionMock).toHaveBeenCalledWith('block-drag-move', 0.3125, 0);
  });

  it('caches zoom value at drag start and reuses it during move', () => {
    const block = makeBlock('block-zoom-cache', 'compute');
    const { container } = render(
      <div className="scene-world" style={{ transform: 'scale(2)' }}>
        <BlockSprite
          block={block}
          parentContainer={parentContainer}
          screenX={0}
          screenY={0}
          zIndex={1}
        />
      </div>,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        start: (event: { target: HTMLElement }) => void;
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = container.querySelector('.block-sprite') as HTMLElement;
    draggableConfig.listeners.start({ target });

    const sceneWorld = container.querySelector('.scene-world') as HTMLElement;
    sceneWorld.style.transform = 'scale(4)';

    draggableConfig.listeners.move({ dx: 20, dy: 10, target });

    expect(moveNodePositionMock).toHaveBeenCalledWith('block-zoom-cache', 0.3125, 0);
  });

  it('ignores click while dragging', async () => {
    const user = userEvent.setup();
    const block = makeBlock('block-drag-click', 'compute');
    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = screen
      .getByRole('button', { name: 'Node: compute-block' })
      .closest('.block-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 5, dy: 5, target });

    await user.click(screen.getByRole('button', { name: 'Node: compute-block' }));
    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('cleans up draggable on unmount', () => {
    const block = makeBlock('block-cleanup', 'compute');
    const { unmount } = render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    unmount();
    expect(interactMocks.unsetFn).toHaveBeenCalledOnce();
  });

  it('resets dragging after end timeout and allows click selection', () => {
    vi.useFakeTimers();
    const block = makeBlock('block-drag-end', 'compute');
    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const button = screen.getByRole('button', { name: 'Node: compute-block' });
    const target = button.closest('.block-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 2, dy: 2, target });
    draggableConfig.listeners.end();

    vi.runAllTimers();
    fireEvent.click(button);

    expect(useUIStore.getState().selectedId).toBe('block-drag-end');
    vi.useRealTimers();
  });

  it('clears pending drag timeout on unmount', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const block = makeBlock('block-timeout-cleanup', 'compute');
    const { unmount } = render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: { end: () => void };
    };
    draggableConfig.listeners.end();

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('clears previous drag timer when drag end fires repeatedly', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const block = makeBlock('block-double-end', 'compute');
    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: { end: () => void };
    };

    draggableConfig.listeners.end();
    draggableConfig.listeners.end();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('removes dropping class after animation end on drag release', () => {
    const block = makeBlock('block-drop-anim', 'compute');
    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const sprite = screen
      .getByRole('button', { name: 'Node: compute-block' })
      .closest('.block-sprite') as HTMLElement;
    const image = sprite.querySelector('.block-img') as HTMLElement;
    draggableConfig.listeners.move({ dx: 1, dy: 1, target: sprite });
    draggableConfig.listeners.end();

    expect(image).toHaveClass('is-dropping');
    fireEvent.animationEnd(image);
    expect(image).not.toHaveClass('is-dropping');
  });

  it('does not initialize draggable interaction in connect or delete modes', () => {
    const block = makeBlock('block-no-drag', 'compute');
    useUIStore.setState({ toolMode: 'connect' });
    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    expect(vi.mocked(interact)).not.toHaveBeenCalled();

    useUIStore.setState({ toolMode: 'delete' });
    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    expect(vi.mocked(interact)).not.toHaveBeenCalled();
  });

  it('applies diff classes for added, modified, and removed states', () => {
    const makeDelta = (kind: 'added' | 'modified' | 'removed', id: string): DiffDelta => ({
      plates: { added: [], removed: [], modified: [] },
      blocks: {
        added: kind === 'added' ? [{ ...makeBlock(id, 'compute') }] : [],
        removed: kind === 'removed' ? [{ ...makeBlock(id, 'compute') }] : [],
        modified:
          kind === 'modified'
            ? [
                {
                  id,
                  before: makeBlock(id, 'compute'),
                  after: makeBlock(id, 'compute'),
                  changes: [],
                },
              ]
            : [],
      },
      connections: { added: [], removed: [], modified: [] },
      externalActors: { added: [], removed: [], modified: [] },
      rootChanges: [],
      summary: { totalChanges: 1, hasBreakingChanges: false },
    });

    useUIStore.setState({ diffMode: true, diffDelta: makeDelta('added', 'block-added') });
    const { container, rerender } = render(
      <BlockSprite
        block={makeBlock('block-added', 'compute')}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    expect(container.firstElementChild).toHaveClass('diff-added');

    useUIStore.setState({ diffMode: true, diffDelta: makeDelta('modified', 'block-modified') });
    rerender(
      <BlockSprite
        block={makeBlock('block-modified', 'compute')}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    expect(container.firstElementChild).toHaveClass('diff-modified');

    useUIStore.setState({ diffMode: true, diffDelta: makeDelta('removed', 'block-removed') });
    rerender(
      <BlockSprite
        block={makeBlock('block-removed', 'compute')}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    expect(container.firstElementChild).toHaveClass('diff-removed');
  });

  it('snaps on drag end and plays sound when unmuted', () => {
    const block = { ...makeBlock('block-snap', 'compute'), position: { x: 1.2, y: 0, z: 0.4 } };
    const playSoundSpy = vi
      .spyOn(audioService, 'playSound')
      .mockImplementation(async (_name: SoundName) => undefined);
    const snapSpy = vi.spyOn(isometric, 'snapToGrid').mockReturnValue({ x: 2, z: 1 });
    useUIStore.setState({ isSoundMuted: false });
    useArchitectureStore.setState({
      moveNodePosition: moveNodePositionMock,
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [block] as Block[],
          connections: [],
        },
      },
    });

    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const target = screen
      .getByRole('button', { name: 'Node: compute-block' })
      .closest('.block-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 2, dy: 2, target });
    draggableConfig.listeners.end();

    expect(moveNodePositionMock).toHaveBeenCalledWith('block-snap', 0.8, 0.6);
    expect(playSoundSpy).toHaveBeenCalledWith('block-snap');
    snapSpy.mockRestore();
    playSoundSpy.mockRestore();
  });

  it('snaps on drag end without sound when muted', () => {
    const block = {
      ...makeBlock('block-snap-muted', 'compute'),
      position: { x: 0.2, y: 0, z: 0.3 },
    };
    const playSoundSpy = vi
      .spyOn(audioService, 'playSound')
      .mockImplementation(async (_name: SoundName) => undefined);
    const snapSpy = vi.spyOn(isometric, 'snapToGrid').mockReturnValue({ x: 1, z: 1 });
    useUIStore.setState({ isSoundMuted: true });
    useArchitectureStore.setState({
      moveNodePosition: moveNodePositionMock,
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [block] as Block[],
          connections: [],
        },
      },
    });

    render(
      <BlockSprite
        block={block}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );
    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const target = screen
      .getByRole('button', { name: 'Node: compute-block' })
      .closest('.block-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 1, dy: 1, target });
    draggableConfig.listeners.end();

    expect(moveNodePositionMock).toHaveBeenCalledWith('block-snap-muted', 0.8, 0.7);
    expect(playSoundSpy).not.toHaveBeenCalled();
    snapSpy.mockRestore();
    playSoundSpy.mockRestore();
  });

  it('adds is-valid-target class when in connect mode with valid source→target pair (gateway→compute)', () => {
    const sourceBlock = makeBlock('block-gateway', 'delivery');
    const targetBlock = makeBlock('block-compute', 'compute');

    useUIStore.setState({ toolMode: 'connect', connectionSource: sourceBlock.id });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [sourceBlock, targetBlock] as Block[],
          connections: [],
        },
      },
    });

    const { container } = render(
      <BlockSprite
        block={targetBlock}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-valid-target');
  });

  it('adds is-invalid-target class when in connect mode with invalid pair (database→compute)', () => {
    const sourceBlock = makeBlock('block-database', 'database');
    const targetBlock = makeBlock('block-compute', 'compute');

    useUIStore.setState({ toolMode: 'connect', connectionSource: sourceBlock.id });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [sourceBlock, targetBlock] as Block[],
          connections: [],
        },
      },
    });

    const { container } = render(
      <BlockSprite
        block={targetBlock}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-invalid-target');
  });

  it('adds is-connected class when in connect mode and block has existing connections', () => {
    const blockWithConn = makeBlock('block-connected', 'compute');
    const otherBlock = makeBlock('block-other', 'database');

    useUIStore.setState({ toolMode: 'connect' });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [blockWithConn, otherBlock] as Block[],
          connections: [
            {
              id: 'conn-1',
              from: endpointId(blockWithConn.id, 'output', 'data'),
              to: endpointId(otherBlock.id, 'input', 'data'),
              metadata: {},
            },
          ],
        },
      },
    });

    const { container } = render(
      <BlockSprite
        block={blockWithConn}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-connected');
  });

  it('adds is-valid-target class when connect source is external actor and target is gateway', () => {
    const gatewayBlock = makeBlock('block-gateway', 'delivery');

    useUIStore.setState({ toolMode: 'connect', connectionSource: internetActor.id });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [gatewayBlock] as Block[],
          externalActors: [internetActor],
          connections: [],
        },
      },
    });

    const { container } = render(
      <BlockSprite
        block={gatewayBlock}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-valid-target');
  });

  it('adds is-invalid-target class when connect source is external actor and target is compute', () => {
    const computeBlock = makeBlock('block-compute', 'compute');

    useUIStore.setState({ toolMode: 'connect', connectionSource: internetActor.id });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [computeBlock] as Block[],
          externalActors: [internetActor],
          connections: [],
        },
      },
    });

    const { container } = render(
      <BlockSprite
        block={computeBlock}
        parentContainer={parentContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-invalid-target');
  });

  it('adds is-warning class when block has placement validation error (messaging on subnet)', () => {
    const subnetContainer: ContainerBlock = {
      id: 'container-subnet',
      name: 'Subnet',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: 'net-1',
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 6, height: 0.3, depth: 8 },
      metadata: {},
    };

    const messagingBlock = makeBlock('block-messaging-warn', 'messaging');

    const { container } = render(
      <BlockSprite
        block={messagingBlock}
        parentContainer={subnetContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).toHaveClass('is-warning');
  });

  it('does not add is-warning class when block is correctly placed (compute on public subnet)', () => {
    const publicContainer: ContainerBlock = {
      id: 'container-public',
      name: 'Subnet 1',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: 'net-1',
      position: { x: 0, y: 0, z: 0 },
      frame: { width: 6, height: 0.3, depth: 8 },
      metadata: {},
    };

    const computeBlock = makeBlock('block-compute-ok', 'compute');

    const { container } = render(
      <BlockSprite
        block={computeBlock}
        parentContainer={publicContainer}
        screenX={0}
        screenY={0}
        zIndex={1}
      />,
    );

    expect(container.firstElementChild).not.toHaveClass('is-warning');
  });
});
