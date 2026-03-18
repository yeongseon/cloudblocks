import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExternalActorSprite } from './ExternalActorSprite';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import type { ExternalActor } from '../../shared/types/index';
import * as connectionValidation from '../validation/connection';

vi.mock('../../shared/assets/actor-sprites/internet.svg', () => ({ default: 'internet.svg' }));
vi.mock('./ExternalActorSprite.css', () => ({}));

const actor: ExternalActor = {
  id: 'actor-1',
  type: 'internet',
  name: 'Internet',
};

describe('ExternalActorSprite', () => {
  const addConnectionMock = vi.fn();
  const initialUIState = useUIStore.getState();
  const initialArchitectureState = useArchitectureStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
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
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          blocks: [
            {
              id: 'gateway-1',
              name: 'Gateway',
              category: 'gateway',
              placementId: 'plate-1',
              position: { x: 0, y: 0, z: 0 },
              metadata: {},
            },
            {
              id: 'database-1',
              name: 'Database',
              category: 'database',
              placementId: 'plate-1',
              position: { x: 1, y: 0, z: 1 },
              metadata: {},
            },
          ],
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
    const canConnectSpy = vi.spyOn(connectionValidation, 'canConnect').mockReturnValue(true);
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
});
