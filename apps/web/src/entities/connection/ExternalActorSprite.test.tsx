import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import interact from 'interactjs';
import { toast } from 'react-hot-toast';

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

import { ExternalActorSprite } from './ExternalActorSprite';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import type { Block, ExternalActor, ResourceBlock } from '@cloudblocks/schema';
import * as connectionValidation from '../validation/connection';
import * as isometric from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';

const interactMocks = vi.hoisted(() => ({
  interactFn: vi.fn(),
  draggableFn: vi.fn(),
  unsetFn: vi.fn(),
}));

vi.mock('interactjs', () => ({
  default: interactMocks.interactFn,
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: toastMocks.error,
  },
}));

vi.mock('../../shared/assets/actor-sprites/internet.svg', () => ({ default: 'internet.svg' }));
vi.mock('./ExternalActorSprite.css', () => ({}));

const actor: ExternalActor = {
  id: 'actor-1',
  type: 'internet',
  name: 'Internet',
  position: { x: -3, y: 0, z: 5 },
};

const gatewayNode: ResourceBlock = {
  id: 'gateway-1',
  name: 'Gateway',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'load_balancer',
  category: 'delivery',
  provider: 'azure',
  parentId: 'container-1',
  position: { x: 0, y: 0, z: 0 },
  metadata: {},
};

const databaseNode: ResourceBlock = {
  id: 'database-1',
  name: 'Database',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'relational_database',
  category: 'data',
  provider: 'azure',
  parentId: 'container-1',
  position: { x: 1, y: 0, z: 1 },
  metadata: {},
};

describe('ExternalActorSprite', () => {
  const addConnectionMock = vi.fn();
  const moveActorPositionMock = vi.fn();
  const initialUIState = useUIStore.getState();
  const initialArchitectureState = useArchitectureStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    interactMocks.draggableFn.mockReturnValue({ unset: interactMocks.unsetFn });
    interactMocks.interactFn.mockReturnValue({ draggable: interactMocks.draggableFn });
    useUIStore.setState(initialUIState, true);
    useArchitectureStore.setState(initialArchitectureState, true);
    useUIStore.setState({
      selectedId: null,
      toolMode: 'select',
      connectionSource: null,
      interactionState: 'idle',
    });
    useArchitectureStore.setState({
      addConnection: addConnectionMock,
      moveActorPosition: moveActorPositionMock,
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [gatewayNode, databaseNode] as Block[],
          externalActors: [actor],
        },
      },
    });
  });

  it('renders without errors', () => {
    const { container } = render(
      <ExternalActorSprite actor={actor} screenX={135} screenY={246} zIndex={11} />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveStyle({ left: '135px', top: '246px', zIndex: '11' });
  });

  it('renders internet sprite image', () => {
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    const image = screen.getByAltText('Internet') as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toContain('internet.svg');
  });

  it('click in select mode sets selectedId to actor id', async () => {
    const user = userEvent.setup();
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    await user.click(screen.getByAltText('Internet'));

    expect(useUIStore.getState().selectedId).toBe(actor.id);
  });

  it('click in connect mode with no source calls startConnecting with actor id', async () => {
    const user = userEvent.setup();
    const startConnectingMock = vi.fn((sourceId: string) => {
      useUIStore.setState({
        interactionState: 'connecting',
        connectionSource: sourceId,
        toolMode: 'connect',
      });
    });
    useUIStore.setState({ toolMode: 'connect', startConnecting: startConnectingMock });

    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    await user.click(screen.getByAltText('Internet'));

    expect(startConnectingMock).toHaveBeenCalledWith(actor.id);
    expect(useUIStore.getState().connectionSource).toBe(actor.id);
  });

  it('click in connect mode with existing source calls addConnection and completeInteraction', async () => {
    const user = userEvent.setup();
    const completeInteractionMock = vi.fn(() => {
      useUIStore.setState({
        interactionState: 'idle',
        connectionSource: null,
        draggedBlockCategory: null,
        draggedResourceName: null,
      });
    });
    useUIStore.setState({
      toolMode: 'connect',
      connectionSource: 'gateway-1',
      completeInteraction: completeInteractionMock,
    });

    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    await user.click(screen.getByAltText('Internet'));

    expect(addConnectionMock).toHaveBeenCalledWith('gateway-1', actor.id);
    expect(completeInteractionMock).toHaveBeenCalledOnce();
    expect(useUIStore.getState().connectionSource).toBeNull();
  });

  it('shows is-selected class when selectedId matches actor id', () => {
    useUIStore.setState({ selectedId: actor.id });
    const { container } = render(
      <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />,
    );

    expect(container.firstElementChild).toHaveClass('is-selected');
  });

  it('shows connection source class when actor is active source', () => {
    useUIStore.setState({ toolMode: 'connect', connectionSource: actor.id });
    const { container } = render(
      <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />,
    );

    expect(container.firstElementChild).toHaveClass('is-connection-source');
  });

  it('shows valid connect-target class when canConnect returns true', () => {
    const canConnectSpy = vi
      .spyOn(connectionValidation, 'canConnect')
      .mockReturnValue({ valid: true });
    useUIStore.setState({ toolMode: 'connect', connectionSource: 'gateway-1' });

    const { container } = render(
      <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />,
    );

    expect(container.firstElementChild).toHaveClass('is-valid-connect-target');
    canConnectSpy.mockRestore();
  });

  it('shows invalid connect-target class when source cannot connect to actor', () => {
    useUIStore.setState({ toolMode: 'connect', connectionSource: 'database-1' });

    const { container } = render(
      <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />,
    );

    expect(container.firstElementChild).toHaveClass('is-invalid-connect-target');
  });

  it('initializes draggable interaction in select mode', () => {
    const { container } = render(
      <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />,
    );

    const root = container.querySelector('.external-actor-sprite') as HTMLElement;
    expect(vi.mocked(interact)).toHaveBeenCalledWith(root);
  });

  it('adds ref to root element', () => {
    const { container } = render(
      <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />,
    );

    const root = container.querySelector('.external-actor-sprite') as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(vi.mocked(interact)).toHaveBeenCalledWith(root);
  });

  it('does not set up interactjs in delete mode', () => {
    useUIStore.setState({ toolMode: 'delete' });
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    expect(vi.mocked(interact)).not.toHaveBeenCalled();
  });

  it('does not set up interactjs in connect mode', () => {
    useUIStore.setState({ toolMode: 'connect' });
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    expect(vi.mocked(interact)).not.toHaveBeenCalled();
  });

  it('moves actor position from drag deltas and scene zoom', () => {
    const { container } = render(
      <div className="scene-world" style={{ transform: 'scale(2)' }}>
        <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />
      </div>,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        start: (event: { target: HTMLElement }) => void;
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = container.querySelector('.external-actor-sprite') as HTMLElement;
    draggableConfig.listeners.start({ target });
    draggableConfig.listeners.move({ dx: 20, dy: 10, target });

    expect(moveActorPositionMock).toHaveBeenCalledWith('actor-1', 0.3125, 0);
  });

  it('uses default zoom when scene-world transform is missing', () => {
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        start: (event: { target: HTMLElement }) => void;
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = screen.getByAltText('Internet').closest('.external-actor-sprite') as HTMLElement;
    draggableConfig.listeners.start({ target });
    draggableConfig.listeners.move({ dx: 10, dy: 10, target });

    expect(moveActorPositionMock).toHaveBeenCalledWith('actor-1', 0.46875, 0.15625);
  });

  it('keeps zoom fallback when transform has no usable scale value', () => {
    const { container } = render(
      <div className="scene-world" style={{ transform: 'translate(10px, 10px)' }}>
        <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />
      </div>,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        start: (event: { target: HTMLElement }) => void;
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = container.querySelector('.external-actor-sprite') as HTMLElement;
    draggableConfig.listeners.start({ target });
    draggableConfig.listeners.move({ dx: 10, dy: 10, target });

    expect(moveActorPositionMock).toHaveBeenCalledWith('actor-1', 0.46875, 0.15625);
  });

  it('ignores click while dragging', async () => {
    const user = userEvent.setup();
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = screen.getByAltText('Internet').closest('.external-actor-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 5, dy: 5, target });

    await user.click(screen.getByAltText('Internet'));
    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('snaps actor to grid on drag end and plays sound when unmuted', () => {
    const actorWithOffset = { ...actor, position: { x: 1.2, y: 0, z: 0.4 } };
    const playSoundSpy = vi
      .spyOn(audioService, 'playSound')
      .mockImplementation(async (_name: SoundName) => undefined);
    const snapSpy = vi.spyOn(isometric, 'snapToGrid').mockReturnValue({ x: 2, z: 1 });
    useUIStore.setState({ isSoundMuted: false });
    useArchitectureStore.setState({
      moveActorPosition: moveActorPositionMock,
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          externalActors: [actorWithOffset],
        },
      },
    });

    render(<ExternalActorSprite actor={actorWithOffset} screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const target = screen.getByAltText('Internet').closest('.external-actor-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 2, dy: 2, target });
    draggableConfig.listeners.end();

    expect(moveActorPositionMock).toHaveBeenCalledWith('actor-1', 0.8, 0.6);
    expect(playSoundSpy).toHaveBeenCalledWith('block-snap');
    snapSpy.mockRestore();
    playSoundSpy.mockRestore();
  });

  it('does not snap when actor cannot be found in store', () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          externalActors: [],
        },
      },
    });

    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const target = screen.getByAltText('Internet').closest('.external-actor-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 2, dy: 2, target });
    draggableConfig.listeners.end();

    expect(moveActorPositionMock).toHaveBeenCalledTimes(1);
  });

  it('does not apply snap movement when already on grid', () => {
    const onGridActor = { ...actor, position: { x: 2, y: 0, z: 2 } };
    const snapSpy = vi.spyOn(isometric, 'snapToGrid').mockReturnValue({ x: 2, z: 2 });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          externalActors: [onGridActor],
        },
      },
    });

    render(<ExternalActorSprite actor={onGridActor} screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const target = screen.getByAltText('Internet').closest('.external-actor-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 2, dy: 2, target });
    draggableConfig.listeners.end();

    expect(moveActorPositionMock).toHaveBeenCalledTimes(1);
    snapSpy.mockRestore();
  });

  it('removes dropping class after animation end on drag release', () => {
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const sprite = screen.getByAltText('Internet').closest('.external-actor-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 1, dy: 1, target: sprite });
    draggableConfig.listeners.end();

    expect(sprite).toHaveClass('is-dropping');
    fireEvent.animationEnd(screen.getByAltText('Internet'));
    expect(sprite).not.toHaveClass('is-dropping');
  });

  it('cleans up draggable on unmount', () => {
    const { unmount } = render(
      <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />,
    );

    unmount();
    expect(interactMocks.unsetFn).toHaveBeenCalledOnce();
  });

  it('clears pending drag timeout on unmount', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(
      <ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />,
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
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: { end: () => void };
    };

    draggableConfig.listeners.end();
    draggableConfig.listeners.end();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('resets dragging after drag end timeout and allows click selection', () => {
    vi.useFakeTimers();
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const sprite = screen.getByAltText('Internet').closest('.external-actor-sprite') as HTMLElement;
    const button = sprite.querySelector('.external-actor-button') as HTMLButtonElement;

    draggableConfig.listeners.move({ dx: 1, dy: 1, target: sprite });
    draggableConfig.listeners.end();

    fireEvent.click(button);
    expect(useUIStore.getState().selectedId).toBeNull();

    vi.runAllTimers();
    fireEvent.click(button);
    expect(useUIStore.getState().selectedId).toBe(actor.id);

    vi.useRealTimers();
  });

  it('click in delete mode does not select actor', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'delete' });

    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    await user.click(screen.getByAltText('Internet'));

    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('click in connect mode ignores target when source is the same actor', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'connect', connectionSource: actor.id });

    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    await user.click(screen.getByAltText('Internet'));

    expect(addConnectionMock).not.toHaveBeenCalled();
    expect(useUIStore.getState().connectionSource).toBe(actor.id);
  });

  it('silently cancels when connect mode addConnection fails', async () => {
    const user = userEvent.setup();
    addConnectionMock.mockReturnValueOnce(false);
    useUIStore.setState({ toolMode: 'connect', connectionSource: 'gateway-1' });

    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    await user.click(screen.getByAltText('Internet'));

    // #1253: toast.error removed — invalid connections are silently cancelled
    expect(toast.error).not.toHaveBeenCalled();
    // Interaction completes regardless of success/failure
    expect(useUIStore.getState().connectionSource).toBeNull();
  });

  it('completes interaction when connect mode addConnection succeeds', async () => {
    const user = userEvent.setup();
    addConnectionMock.mockReturnValueOnce(true);
    useUIStore.setState({ toolMode: 'connect', connectionSource: 'gateway-1' });

    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    await user.click(screen.getByAltText('Internet'));

    expect(toast.error).not.toHaveBeenCalled();
    expect(useUIStore.getState().connectionSource).toBeNull();
  });

  it('does not initialize draggable interaction in connect or delete modes', () => {
    useUIStore.setState({ toolMode: 'connect' });
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    expect(vi.mocked(interact)).not.toHaveBeenCalled();

    useUIStore.setState({ toolMode: 'delete' });
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);
    expect(vi.mocked(interact)).not.toHaveBeenCalled();
  });
});
