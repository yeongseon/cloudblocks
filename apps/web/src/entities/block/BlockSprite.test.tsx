import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import interact from 'interactjs';
import { BlockSprite } from './BlockSprite';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import type { Block, BlockCategory, Plate } from '../../shared/types/index';

const interactMocks = vi.hoisted(() => ({
  interactFn: vi.fn(),
  draggableFn: vi.fn(),
  unsetFn: vi.fn(),
}));

vi.mock('interactjs', () => ({
  default: interactMocks.interactFn,
}));

vi.mock('../../shared/assets/block-sprites/gateway.svg', () => ({ default: 'gateway.svg' }));
vi.mock('../../shared/assets/block-sprites/compute.svg', () => ({ default: 'compute.svg' }));
vi.mock('../../shared/assets/block-sprites/database.svg', () => ({ default: 'database.svg' }));
vi.mock('../../shared/assets/block-sprites/storage.svg', () => ({ default: 'storage.svg' }));
vi.mock('../../shared/assets/block-sprites/function.svg', () => ({ default: 'function.svg' }));
vi.mock('../../shared/assets/block-sprites/queue.svg', () => ({ default: 'queue.svg' }));
vi.mock('../../shared/assets/block-sprites/event.svg', () => ({ default: 'event.svg' }));
vi.mock('../../shared/assets/block-sprites/timer.svg', () => ({ default: 'timer.svg' }));
vi.mock('./BlockSprite.css', () => ({}));

const parentPlate: Plate = {
  id: 'plate-1',
  name: 'Subnet',
  type: 'subnet',
  subnetAccess: 'public',
  parentId: 'net-1',
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

const makeBlock = (id: string, category: BlockCategory): Block => ({
  id,
  name: `${category}-block`,
  category,
  placementId: parentPlate.id,
  position: { x: 1, y: 0, z: 2 },
  metadata: {},
});

describe('BlockSprite', () => {
  const addConnectionMock = vi.fn();
  const removeBlockMock = vi.fn();
  const moveBlockPositionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    interactMocks.draggableFn.mockReturnValue({ unset: interactMocks.unsetFn });
    interactMocks.interactFn.mockReturnValue({ draggable: interactMocks.draggableFn });
    useUIStore.setState({ selectedId: null, toolMode: 'select', connectionSource: null });
    useArchitectureStore.setState({
      addConnection: addConnectionMock,
      removeBlock: removeBlockMock,
      moveBlockPosition: moveBlockPositionMock,
    });
  });

  it('renders with correct screen position styles', () => {
    const block = makeBlock('block-1', 'compute');
    const { container } = render(
      <BlockSprite block={block} parentPlate={parentPlate} screenX={120} screenY={240} zIndex={7} />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveStyle({ left: '120px', top: '240px', zIndex: '7' });
  });

  it.each([
    ['gateway', 'gateway.svg'],
    ['compute', 'compute.svg'],
    ['database', 'database.svg'],
    ['storage', 'storage.svg'],
    ['function', 'function.svg'],
    ['queue', 'queue.svg'],
    ['event', 'event.svg'],
    ['timer', 'timer.svg'],
  ] as const)('renders %s sprite image', (category, spriteName) => {
    const block = makeBlock(`block-${category}`, category);
    render(<BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />);

    const image = screen.getByAltText(`${category}-block`) as HTMLImageElement;
    expect(image.src).toContain(spriteName);
  });

  it('click in select mode calls setSelectedId', async () => {
    const user = userEvent.setup();
    const block = makeBlock('block-select', 'compute');

    render(<BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />);
    await user.click(screen.getByRole('button', { name: 'Block: compute-block' }));

    expect(useUIStore.getState().selectedId).toBe('block-select');
  });

  it('click in delete mode calls removeBlock', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'delete' });
    const block = makeBlock('block-delete', 'storage');

    render(<BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />);
    await user.click(screen.getByRole('button', { name: 'Block: storage-block' }));

    expect(removeBlockMock).toHaveBeenCalledWith('block-delete');
  });

  it('click in connect mode sets source then creates connection on second click', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'connect' });

    const sourceBlock = makeBlock('block-source', 'gateway');
    const targetBlock = makeBlock('block-target', 'database');

    render(
      <>
        <BlockSprite block={sourceBlock} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />
        <BlockSprite block={targetBlock} parentPlate={parentPlate} screenX={10} screenY={20} zIndex={2} />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Block: gateway-block' }));
    expect(useUIStore.getState().connectionSource).toBe('block-source');

    await user.click(screen.getByRole('button', { name: 'Block: database-block' }));
    expect(addConnectionMock).toHaveBeenCalledWith('block-source', 'block-target');
    expect(useUIStore.getState().connectionSource).toBeNull();
  });

  it('does not create connection when connect mode clicks same source block twice', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'connect' });
    const block = makeBlock('block-same', 'gateway');

    render(<BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />);

    const button = screen.getByRole('button', { name: 'Block: gateway-block' });
    await user.click(button);
    await user.click(button);

    expect(useUIStore.getState().connectionSource).toBe('block-same');
    expect(addConnectionMock).not.toHaveBeenCalled();
  });

  it('adds is-selected class when selected', () => {
    const block = makeBlock('block-selected', 'queue');
    useUIStore.setState({ selectedId: block.id });

    const { container } = render(
      <BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />,
    );

    expect(container.firstElementChild).toHaveClass('is-selected');
  });

  it('adds is-delete-mode class when in delete mode', () => {
    const block = makeBlock('block-delete-class', 'event');
    useUIStore.setState({ toolMode: 'delete' });

    const { container } = render(
      <BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />,
    );

    expect(container.firstElementChild).toHaveClass('is-delete-mode');
  });

  it('adds is-connection-source class when block is active source', () => {
    const block = makeBlock('block-conn-source', 'queue');
    useUIStore.setState({ toolMode: 'connect', connectionSource: block.id });

    const { container } = render(
      <BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />,
    );

    expect(container.firstElementChild).toHaveClass('is-connection-source');
  });

  it('initializes draggable interaction in select mode', () => {
    const block = makeBlock('block-drag', 'function');
    render(<BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />);

    expect(vi.mocked(interact)).toHaveBeenCalled();
  });

  it('moves block position from drag deltas and scene zoom', () => {
    const block = makeBlock('block-drag-move', 'compute');
    const { container } = render(
      <div className="scene-world" style={{ transform: 'scale(2)' }}>
        <BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />
      </div>,
    );

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        start: () => void;
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = container.querySelector('.block-sprite') as HTMLElement;
    draggableConfig.listeners.start();
    draggableConfig.listeners.move({ dx: 20, dy: 10, target });

    expect(moveBlockPositionMock).toHaveBeenCalledWith('block-drag-move', 0.3125, 0);
  });

  it('ignores click while dragging', async () => {
    const user = userEvent.setup();
    const block = makeBlock('block-drag-click', 'compute');
    render(<BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
      };
    };

    const target = screen.getByRole('button', { name: 'Block: compute-block' }).closest('.block-sprite') as HTMLElement;
    draggableConfig.listeners.move({ dx: 5, dy: 5, target });

    await user.click(screen.getByRole('button', { name: 'Block: compute-block' }));
    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('cleans up draggable on unmount', () => {
    const block = makeBlock('block-cleanup', 'compute');
    const { unmount } = render(
      <BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />,
    );

    unmount();
    expect(interactMocks.unsetFn).toHaveBeenCalledOnce();
  });

  it('resets dragging after end timeout and allows click selection', () => {
    vi.useFakeTimers();
    const block = makeBlock('block-drag-end', 'compute');
    render(<BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: {
        move: (event: { dx: number; dy: number; target: HTMLElement }) => void;
        end: () => void;
      };
    };

    const button = screen.getByRole('button', { name: 'Block: compute-block' });
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
      <BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />,
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
    render(<BlockSprite block={block} parentPlate={parentPlate} screenX={0} screenY={0} zIndex={1} />);

    const draggableConfig = interactMocks.draggableFn.mock.calls[0]?.[0] as {
      listeners: { end: () => void };
    };

    draggableConfig.listeners.end();
    draggableConfig.listeners.end();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });
});
