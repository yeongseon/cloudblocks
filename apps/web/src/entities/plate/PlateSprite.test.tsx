import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import interact from 'interactjs';
import { PlateSprite } from './PlateSprite';
import { useUIStore } from '../store/uiStore';
import { screenDeltaToWorld, worldSizeToScreen } from '../../shared/utils/isometric';
import { useArchitectureStore } from '../store/architectureStore';
import type { Plate } from '../../shared/types/index';

const interactMocks = vi.hoisted(() => ({
  interactFn: vi.fn(),
  draggableFn: vi.fn(),
  unsetFn: vi.fn(),
}));

vi.mock('interactjs', () => ({
  default: interactMocks.interactFn,
}));

vi.mock('./PlateSvg', () => ({
  PlateSvg: (props: Record<string, unknown>) => (
    <div
      data-testid="plate-svg"
      data-label={props.label}
      data-emoji={props.emoji}
      data-top-face-color={props.topFaceColor}
    />
  ),
}));
vi.mock('./plateFaceColors', () => ({
  getPlateFaceColors: (plate: { type: string; subnetAccess?: string }) => {
    if (plate.type === 'network') {
      return { topFaceColor: '#2563EB', topFaceStroke: '#60A5FA', leftSideColor: '#1D4ED8', rightSideColor: '#1E40AF' };
    }
    if (plate.subnetAccess === 'public') {
      return { topFaceColor: '#22C55E', topFaceStroke: '#4ADE80', leftSideColor: '#16A34A', rightSideColor: '#15803D' };
    }
    return { topFaceColor: '#6366F1', topFaceStroke: '#818CF8', leftSideColor: '#4F46E5', rightSideColor: '#4338CA' };
  },
}));
vi.mock('./PlateSprite.css', () => ({}));

vi.mock('../../shared/utils/isometric', () => ({
  screenDeltaToWorld: vi.fn(() => ({ dWorldX: 0, dWorldZ: 0 })),
  worldSizeToScreen: vi.fn(() => ({ screenWidth: 320, screenHeight: 180 })),
}));

const makeNetworkPlate = (): Plate => ({
  id: 'plate-network',
  name: 'Network Plate',
  type: 'network',
  parentId: null,
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
});

const makeSubnetPlate = (access: 'public' | 'private'): Plate => ({
  id: `plate-${access}`,
  name: `${access} subnet`,
  type: 'subnet',
  subnetAccess: access,
  parentId: 'plate-network',
  children: [],
  position: { x: 1, y: 0, z: 2 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
});

describe('PlateSprite', () => {
  const movePlatePositionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    interactMocks.draggableFn.mockReturnValue({ unset: interactMocks.unsetFn });
    interactMocks.interactFn.mockReturnValue({ draggable: interactMocks.draggableFn });
    useUIStore.setState({ selectedId: null, toolMode: 'select', connectionSource: null });
    useArchitectureStore.setState({ movePlatePosition: movePlatePositionMock });
  });

  it('renders with correct position styles', () => {
    const plate = makeNetworkPlate();
    const { container } = render(
      <PlateSprite plate={plate} screenX={111} screenY={222} zIndex={3} />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveStyle({ left: '111px', top: '222px', zIndex: '3' });
  });

  it.each([
    ['network', makeNetworkPlate(), 'Virtual Network', '#2563EB'],
    ['public-subnet', makeSubnetPlate('public'), 'Public Subnet', '#22C55E'],
    ['private-subnet', makeSubnetPlate('private'), 'Private Subnet', '#6366F1'],
  ] as const)('renders correct PlateSvg for %s', (_, plate, expectedLabel, expectedTopColor) => {
    render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    const svg = screen.getByTestId('plate-svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('data-label', expectedLabel);
    expect(svg).toHaveAttribute('data-top-face-color', expectedTopColor);
  });

  it('falls back to default PlateSvg for unknown plate type values', () => {
    const strangePlate: Plate = {
      ...makeNetworkPlate(),
      id: 'plate-weird',
      name: 'weird plate',
      type: 'mystery' as Plate['type'],
      profileId: 'network-platform',
    };

    render(<PlateSprite plate={strangePlate} screenX={0} screenY={0} zIndex={1} />);
    const svg = screen.getByTestId('plate-svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('data-top-face-color', '#6366F1');
  });

  it('click selects the plate', async () => {
    const user = userEvent.setup();
    const plate = makeNetworkPlate();
    render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    await user.click(screen.getByRole('button', { name: `Plate: ${plate.name}` }));
    expect(useUIStore.getState().selectedId).toBe(plate.id);
  });

  it('adds is-selected class when selected', () => {
    const plate = makeSubnetPlate('public');
    useUIStore.setState({ selectedId: plate.id });
    const { container } = render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    expect(container.firstElementChild).toHaveClass('is-selected');
  });

  it('uses worldSizeToScreen for button dimensions', () => {
    const plate = makeSubnetPlate('private');
    render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    expect(vi.mocked(worldSizeToScreen)).toHaveBeenCalledWith(
      plate.size.width,
      plate.size.height,
      plate.size.depth,
    );

    const button = screen.getByRole('button', { name: `Plate: ${plate.name}` });
    expect(button).toHaveStyle({ width: '320px', height: '180px', left: '-160px', top: '-90px' });
  });

  it('initializes draggable interaction', () => {
    const plate = makeNetworkPlate();
    render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    expect(vi.mocked(interact)).toHaveBeenCalled();
  });

  it('moves plate position from drag deltas and scene zoom', () => {
    const plate = makeNetworkPlate();
    const { container } = render(
      <div className="scene-world" style={{ transform: 'scale(4)' }}>
        <PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />
      </div>,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        start: () => void;
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = container.querySelector('.plate-sprite') as HTMLElement;
    draggableConfig.listeners.start();
    draggableConfig.listeners.move({ dx: 20, dy: 12, target });

    expect(vi.mocked(screenDeltaToWorld)).toHaveBeenCalledWith(5, 3);
    expect(movePlatePositionMock).toHaveBeenCalledWith(plate.id, 0, 0);
  });

  it('ignores click while dragging', async () => {
    const user = userEvent.setup();
    const plate = makeNetworkPlate();
    render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = screen.getByRole('button', { name: `Plate: ${plate.name}` }).closest('.plate-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 1, dy: 1, target });

    await user.click(screen.getByRole('button', { name: `Plate: ${plate.name}` }));
    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('cleans up draggable on unmount', () => {
    const plate = makeNetworkPlate();
    const { unmount } = render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    unmount();
    expect(interactMocks.unsetFn).toHaveBeenCalledOnce();
  });

  it('resets dragging after end timeout and allows click selection', () => {
    vi.useFakeTimers();
    const plate = makeNetworkPlate();
    render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const button = screen.getByRole('button', { name: `Plate: ${plate.name}` });
    const target = button.closest('.plate-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 2, dy: 2, target });
    draggableConfig.listeners.end();

    vi.runAllTimers();
    fireEvent.click(button);
    expect(useUIStore.getState().selectedId).toBe(plate.id);

    vi.useRealTimers();
  });

  it('clears pending drag timeout on unmount', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const plate = makeNetworkPlate();
    const { unmount } = render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

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
    const plate = makeNetworkPlate();
    render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: { end: () => void };
    };

    draggableConfig.listeners.end();
    draggableConfig.listeners.end();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('adds is-drop-target class when dragging valid block category', () => {
    const plate = makeSubnetPlate('public');
    useUIStore.setState({ draggedBlockCategory: 'compute' });
    const { container } = render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    expect(container.firstElementChild).toHaveClass('is-drop-target');
    expect(container.firstElementChild).not.toHaveClass('is-drop-target-invalid');
  });

  it('adds is-drop-target-invalid class when dragging invalid block category', () => {
    const plate = makeSubnetPlate('private');
    useUIStore.setState({ draggedBlockCategory: 'gateway' });
    const { container } = render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    expect(container.firstElementChild).toHaveClass('is-drop-target-invalid');
    expect(container.firstElementChild).not.toHaveClass('is-drop-target');
  });

  it('does not add drop-target classes when draggedBlockCategory is null', () => {
    const plate = makeSubnetPlate('public');
    useUIStore.setState({ draggedBlockCategory: null });
    const { container } = render(<PlateSprite plate={plate} screenX={0} screenY={0} zIndex={1} />);

    expect(container.firstElementChild).not.toHaveClass('is-drop-target');
    expect(container.firstElementChild).not.toHaveClass('is-drop-target-invalid');
  });
});
