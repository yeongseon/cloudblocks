import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MinifigureSprite } from './MinifigureSprite';
import { useUIStore } from '../store/uiStore';
import { useWorkerStore } from '../store/workerStore';
import { screenDeltaToWorld } from '../../shared/utils/isometric';

type DragListeners = {
  start?: (event: { target: HTMLElement }) => void;
  move?: (event: { target: HTMLElement; dx: number; dy: number }) => void;
  end?: (event: { target: HTMLElement }) => void;
};

const draggableListeners = new WeakMap<HTMLElement, DragListeners>();

vi.mock('interactjs', () => ({
  default: (element: HTMLElement) => ({
    draggable: (options: { listeners: DragListeners }) => {
      draggableListeners.set(element, options.listeners);
      return { unset: vi.fn() };
    },
  }),
}));

vi.mock('./MinifigureSvg', () => ({
  MinifigureSvg: ({ provider }: { provider: string }) => <div data-testid="mock-svg">{provider}</div>,
}));

vi.mock('./MinifigureSprite.css', () => ({}));

describe('MinifigureSprite', () => {
  const initialUIState = useUIStore.getState();
  const initialWorkerState = useWorkerStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('uses workerStore position as drag move base', () => {
    useWorkerStore.setState({ workerPosition: [5, 0, -2] });
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    const sprite = container.firstElementChild as HTMLElement;
    const listeners = draggableListeners.get(sprite);
    expect(listeners).toBeDefined();

    const dx = 24;
    const dy = 12;
    const { dWorldX, dWorldZ } = screenDeltaToWorld(dx, dy);

    act(() => {
      listeners?.start?.({ target: sprite });
      listeners?.move?.({ target: sprite, dx, dy });
    });

    const [nextX, nextY, nextZ] = useWorkerStore.getState().workerPosition;
    expect(nextY).toBe(0);
    expect(nextX).toBeCloseTo(5 + dWorldX);
    expect(nextZ).toBeCloseTo(-2 + dWorldZ);
  });
});
