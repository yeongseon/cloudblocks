import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MinifigureSprite } from './MinifigureSprite';
import { useUIStore } from '../store/uiStore';
import { useWorkerStore } from '../store/workerStore';

// Mock MinifigureSvg to simplify testing
vi.mock('./MinifigureSvg', () => ({
  MinifigureSvg: ({ provider }: { provider: string }) => <div data-testid="mock-svg">{provider}</div>
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
    });
    useWorkerStore.setState({
      workerState: 'idle',
    });
  });

  it('renders without errors and positions correctly', () => {
    const { container } = render(
      <MinifigureSprite provider="azure" screenX={100} screenY={200} zIndex={5} />
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('minifigure-sprite');
    expect(root).toHaveStyle({ left: '100px', top: '200px', zIndex: '5' });
  });

  it('renders MinifigureSvg with correct provider', () => {
    render(<MinifigureSprite provider="aws" screenX={0} screenY={0} zIndex={1} />);
    
    const svgMock = screen.getByTestId('mock-svg');
    expect(svgMock).toBeInTheDocument();
    expect(svgMock).toHaveTextContent('aws');
  });

  it('click sets selectedId to worker-default', async () => {
    const user = userEvent.setup();
    const { container } = render(<MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />);

    await user.click(container.firstElementChild as HTMLElement);

    expect(useUIStore.getState().selectedId).toBe('worker-default');
  });

  it('shows is-selected class when selected', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    const { container } = render(
      <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
    );

    expect(container.firstElementChild).toHaveClass('is-selected');
  });

  it('shows worker state class is-idle', () => {
    useWorkerStore.setState({ workerState: 'idle' });
    const { container } = render(
      <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
    );

    expect(container.firstElementChild).toHaveClass('is-idle');
  });

  it('shows worker state class is-moving', () => {
    useWorkerStore.setState({ workerState: 'moving' });
    const { container } = render(
      <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
    );

    expect(container.firstElementChild).toHaveClass('is-moving');
  });

  it('has correct base CSS classes', () => {
    const { container } = render(
      <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
    );

    expect(container.firstElementChild).toHaveClass('minifigure-sprite');
  });

  it('shows worker state class is-building', () => {
    useWorkerStore.setState({ workerState: 'building' });
    const { container } = render(
      <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
    );

    expect(container.firstElementChild).toHaveClass('is-building');
  });

  it('does not respond to click in delete mode', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'delete' });
    const { container } = render(
      <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
    );

    await user.click(container.firstElementChild as HTMLElement);

    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('does not respond to click in connect mode', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'connect' });
    const { container } = render(
      <MinifigureSprite provider="azure" screenX={0} screenY={0} zIndex={1} />
    );

    await user.click(container.firstElementChild as HTMLElement);

    expect(useUIStore.getState().selectedId).toBeNull();
  });
});
