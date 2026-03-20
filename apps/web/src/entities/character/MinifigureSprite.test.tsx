import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MinifigureSprite } from './MinifigureSprite';
import { useUIStore } from '../store/uiStore';
import { useWorkerStore } from '../store/workerStore';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import { screenDeltaToWorld } from '../../shared/utils/isometric';
import * as isometric from '../../shared/utils/isometric';

const interactMocks = vi.hoisted(() => ({
  interactFn: vi.fn(),
  draggableFn: vi.fn(),
  unsetFn: vi.fn(),
}));

vi.mock('interactjs', () => ({
  default: interactMocks.interactFn,
}));

vi.mock('./MinifigureSvg', () => ({
  MinifigureSvg: ({ provider }: { provider: string }) => <div data-testid="mock-svg">{provider}</div>,
}));

vi.mock('./MinifigureSprite.css', () => ({}));

type DraggableConfig = {
  listeners: {
    start: (event: { target: HTMLElement }) => void;
    move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
    end: () => void;
  };
};

function getDraggableConfig(): DraggableConfig {
  return interactMocks.draggableFn.mock.calls[0]?.[0] as DraggableConfig;
}

describe('MinifigureSprite', () => {
  const initialUIState = useUIStore.getState();
  const initialWorkerState = useWorkerStore.getState();
  const setWorkerPositionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    interactMocks.draggableFn.mockReturnValue({ unset: interactMocks.unsetFn });
    interactMocks.interactFn.mockReturnValue({ draggable: interactMocks.draggableFn });
    useUIStore.setState(initialUIState, true);
    useWorkerStore.setState(initialWorkerState, true);
    useUIStore.setState({
      selectedId: null,
      toolMode: 'select',
      isSoundMuted: true,
    });
    useWorkerStore.setState({
      workerState: 'idle',
      workerPosition: [-3, 0, -6],
      setWorkerPosition: setWorkerPositionMock,
    });
  });

  it('renders without errors and positions correctly', () => {
    const { container } = render(<MinifigureSprite provider="azure" screenX={100} screenY={200} zIndex={5} />);

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('minifigure-sprite');
    expect(root).toHaveStyle({ left: '100px', top: '200px', zIndex: '5' });
    expect(screen.getByTestId('mock-svg')).toHaveTextContent('azure');
  });

  it('click sets selectedId to worker-default', async () => {
    const user = userEvent.setup();
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    await user.pointer([{ target: container.firstElementChild as HTMLElement, keys: '[MouseLeft]' }]);

    expect(useUIStore.getState().selectedId).toBe('worker-default');
  });

  it('drag move updates position from workerStore current coordinates', () => {
    useWorkerStore.setState({ workerPosition: [5, 0, -2] });
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    const sprite = container.firstElementChild as HTMLElement;
    const draggableConfig = getDraggableConfig();

    const dx = 24;
    const dy = 12;
    const { dWorldX, dWorldZ } = screenDeltaToWorld(dx, dy);

    act(() => {
      draggableConfig.listeners.start({ target: sprite });
      draggableConfig.listeners.move({ target: sprite, dx, dy });
    });

    expect(setWorkerPositionMock).toHaveBeenCalledWith([5 + dWorldX, 0, -2 + dWorldZ]);
  });

  it('does not initialize interact in delete mode', () => {
    useUIStore.setState({ toolMode: 'delete' });
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    expect(interactMocks.interactFn).not.toHaveBeenCalled();
  });

  it('uses scene-world scale for drag zoom', () => {
    const { container } = render(
      <div className="scene-world" style={{ transform: 'scale(2)' }}>
        <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
      </div>,
    );

    const sprite = container.querySelector('.minifigure-sprite') as HTMLElement;
    const draggableConfig = getDraggableConfig();
    const { dWorldX, dWorldZ } = screenDeltaToWorld(10, 5);

    act(() => {
      draggableConfig.listeners.start({ target: sprite });
      draggableConfig.listeners.move({ dx: 20, dy: 10, target: sprite });
    });

    expect(setWorkerPositionMock).toHaveBeenCalledWith([-3 + dWorldX, 0, -6 + dWorldZ]);
  });

  it('uses zoom=1 when scene-world is missing', () => {
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    const sprite = container.querySelector('.minifigure-sprite') as HTMLElement;
    const draggableConfig = getDraggableConfig();
    const { dWorldX, dWorldZ } = screenDeltaToWorld(20, 10);

    act(() => {
      draggableConfig.listeners.start({ target: sprite });
      draggableConfig.listeners.move({ dx: 20, dy: 10, target: sprite });
    });

    expect(setWorkerPositionMock).toHaveBeenCalledWith([-3 + dWorldX, 0, -6 + dWorldZ]);
  });

  it('uses zoom=1 when scene-world transform has non-scale value', () => {
    const { container } = render(
      <div className="scene-world" style={{ transform: 'translate(10px)' }}>
        <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
      </div>,
    );

    const sprite = container.querySelector('.minifigure-sprite') as HTMLElement;
    const draggableConfig = getDraggableConfig();
    const { dWorldX, dWorldZ } = screenDeltaToWorld(20, 10);

    act(() => {
      draggableConfig.listeners.start({ target: sprite });
      draggableConfig.listeners.move({ dx: 20, dy: 10, target: sprite });
    });

    expect(setWorkerPositionMock).toHaveBeenCalledWith([-3 + dWorldX, 0, -6 + dWorldZ]);
  });

  it('uses zoom=1 when scene-world scale is zero', () => {
    const { container } = render(
      <div className="scene-world" style={{ transform: 'scale(0)' }}>
        <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
      </div>,
    );

    const sprite = container.querySelector('.minifigure-sprite') as HTMLElement;
    const draggableConfig = getDraggableConfig();
    const { dWorldX, dWorldZ } = screenDeltaToWorld(20, 10);

    act(() => {
      draggableConfig.listeners.start({ target: sprite });
      draggableConfig.listeners.move({ dx: 20, dy: 10, target: sprite });
    });

    expect(setWorkerPositionMock).toHaveBeenCalledWith([-3 + dWorldX, 0, -6 + dWorldZ]);
  });

  it('drag end snaps when position changes', () => {
    const snapSpy = vi.spyOn(isometric, 'snapToGrid').mockReturnValue({ x: 1, z: -4 });
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.move({ dx: 10, dy: 10, target: screen.getByTestId('mock-svg').parentElement as HTMLElement });
      draggableConfig.listeners.end();
    });

    expect(setWorkerPositionMock).toHaveBeenNthCalledWith(2, [1, 0, -4]);
    snapSpy.mockRestore();
  });

  it('drag end plays snap sound when unmuted', () => {
    const snapSpy = vi.spyOn(isometric, 'snapToGrid').mockReturnValue({ x: 2, z: -5 });
    const playSoundSpy = vi
      .spyOn(audioService, 'playSound')
      .mockImplementation(async (_name: SoundName) => undefined);
    useUIStore.setState({ isSoundMuted: false });
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.move({ dx: 10, dy: 10, target: screen.getByTestId('mock-svg').parentElement as HTMLElement });
      draggableConfig.listeners.end();
    });

    expect(playSoundSpy).toHaveBeenCalledWith('block-snap');
    playSoundSpy.mockRestore();
    snapSpy.mockRestore();
  });

  it('drag end does not play sound when muted', () => {
    const snapSpy = vi.spyOn(isometric, 'snapToGrid').mockReturnValue({ x: 4, z: -1 });
    const playSoundSpy = vi
      .spyOn(audioService, 'playSound')
      .mockImplementation(async (_name: SoundName) => undefined);
    useUIStore.setState({ isSoundMuted: true });
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.move({ dx: 10, dy: 10, target: screen.getByTestId('mock-svg').parentElement as HTMLElement });
      draggableConfig.listeners.end();
    });

    expect(playSoundSpy).not.toHaveBeenCalled();
    playSoundSpy.mockRestore();
    snapSpy.mockRestore();
  });

  it('drag end does not apply snap when already aligned', () => {
    const snapSpy = vi.spyOn(isometric, 'snapToGrid').mockReturnValue({ x: -3, z: -6 });
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.move({ dx: 10, dy: 10, target: screen.getByTestId('mock-svg').parentElement as HTMLElement });
      draggableConfig.listeners.end();
    });

    expect(setWorkerPositionMock).toHaveBeenCalledTimes(1);
    snapSpy.mockRestore();
  });

  it('drag end without drag does not add dropping class', () => {
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const sprite = container.querySelector('.minifigure-sprite') as HTMLElement;
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.end();
    });

    expect(sprite).not.toHaveClass('is-dropping');
  });

  it('ignores click while dragging', async () => {
    const user = userEvent.setup();
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const sprite = container.querySelector('.minifigure-sprite') as HTMLElement;
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.move({ dx: 2, dy: 2, target: sprite });
    });
    await user.pointer([{ target: sprite, keys: '[MouseLeft]' }]);

    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('click in delete mode does not select worker', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'delete' });
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    await user.pointer([{ target: container.firstElementChild as HTMLElement, keys: '[MouseLeft]' }]);

    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('click in connect mode does not select worker', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'connect' });
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    await user.pointer([{ target: container.firstElementChild as HTMLElement, keys: '[MouseLeft]' }]);

    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('selects worker on Enter key press', async () => {
    const user = userEvent.setup();
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    const sprite = screen.getByRole('button', { name: 'Select worker' });
    await user.type(sprite, '{Enter}');

    expect(useUIStore.getState().selectedId).toBe('worker-default');
  });

  it('selects worker on Space key press', async () => {
    const user = userEvent.setup();
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    const sprite = screen.getByRole('button', { name: 'Select worker' });
    await user.type(sprite, ' ');

    expect(useUIStore.getState().selectedId).toBe('worker-default');
  });

  it('does not select worker on Enter in delete mode', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'delete' });
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    const sprite = screen.getByRole('button', { name: 'Select worker' });
    await user.type(sprite, '{Enter}');

    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('applies is-selected class when selectedId is worker-default', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    expect(container.firstElementChild).toHaveClass('is-selected');
  });

  it('applies worker state class', () => {
    useWorkerStore.setState({ workerState: 'moving' });
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    expect(container.firstElementChild).toHaveClass('is-moving');
  });

  it('clears pending drag timer during cleanup', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.end();
    });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('clears previous timer when drag end fires twice', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.end();
      draggableConfig.listeners.end();
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('removes dropping class after animationend', () => {
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);
    const sprite = container.querySelector('.minifigure-sprite') as HTMLElement;
    const draggableConfig = getDraggableConfig();

    act(() => {
      draggableConfig.listeners.move({ dx: 2, dy: 2, target: sprite });
      draggableConfig.listeners.end();
    });

    expect(sprite).toHaveClass('is-dropping');
    fireEvent.animationEnd(sprite);
    expect(sprite).not.toHaveClass('is-dropping');
  });

  it('calls interactable.unset on unmount cleanup', () => {
    const { unmount } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    unmount();
    expect(interactMocks.unsetFn).toHaveBeenCalledOnce();
  });
});
