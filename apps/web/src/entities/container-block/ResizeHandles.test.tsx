import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResizeHandles } from './ResizeHandles';
import { useArchitectureStore } from '../store/architectureStore';
import { TILE_W, TILE_H, TILE_Z } from '../../shared/tokens/designTokens';

vi.mock('./ContainerBlockSprite.css', () => ({}));

// Mock screenDeltaToWorld to return controlled world deltas
vi.mock('../../shared/utils/isometric', () => ({
  screenDeltaToWorld: vi.fn((_dx: number, _dy: number) => ({ dWorldX: 0, dWorldZ: 0 })),
}));

import { screenDeltaToWorld } from '../../shared/utils/isometric';

const mockResizePlate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Polyfill Pointer Capture for jsdom
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  mockResizePlate.mockClear();
  useArchitectureStore.setState({
    resizePlate: mockResizePlate,
    workspace: {
      ...useArchitectureStore.getState().workspace,
      architecture: {
        ...useArchitectureStore.getState().workspace.architecture,
        nodes: [
          {
            id: 'test-container',
            name: 'VNet',
            kind: 'container' as const,
            layer: 'region' as const,
            resourceType: 'virtual_network' as const,
            category: 'network' as const,
            provider: 'azure' as const,
            parentId: null,
            position: { x: 10, y: 0, z: 10 },
            frame: { width: 12, height: 0.7, depth: 16 },
            metadata: {},
          },
        ],
      },
    },
  });
});

describe('ResizeHandles', () => {
  const defaultProps = {
    containerId: 'test-container',
    frameWidth: 12,
    frameDepth: 16,
    frameHeight: 0.7,
    containerLayer: 'region',
  };

  it('renders 4 resize handles (N, S, E, W)', () => {
    render(<ResizeHandles {...defaultProps} />);
    expect(screen.getByTestId('resize-handle-n')).toBeInTheDocument();
    expect(screen.getByTestId('resize-handle-s')).toBeInTheDocument();
    expect(screen.getByTestId('resize-handle-e')).toBeInTheDocument();
    expect(screen.getByTestId('resize-handle-w')).toBeInTheDocument();
  });

  it('renders the container resize overlay', () => {
    render(<ResizeHandles {...defaultProps} />);
    expect(screen.getByTestId('resize-handles')).toBeInTheDocument();
  });

  it('positions N handle at correct screen offset', () => {
    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-n');

    // N corner: dWorldX=+w/2, dWorldY=+h, dWorldZ=0
    // dSX = (w/2) * TILE_W/2 = 12/2 * 32 = 192
    // dSY = (w/2) * TILE_H/2 - h * TILE_Z = 6*16 - 0.7*32 = 96 - 22.4 = 73.6
    const expectedSx = (defaultProps.frameWidth / 2) * (TILE_W / 2);
    const expectedSy =
      (defaultProps.frameWidth / 2) * (TILE_H / 2) - defaultProps.frameHeight * TILE_Z;

    expect(handle.style.left).toBe(`${expectedSx}px`);
    expect(handle.style.top).toBe(`${expectedSy}px`);
  });

  it('positions S handle at correct screen offset', () => {
    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-s');

    // S corner: dWorldX=-w/2
    const expectedSx = (-defaultProps.frameWidth / 2) * (TILE_W / 2);
    const expectedSy =
      (-defaultProps.frameWidth / 2) * (TILE_H / 2) - defaultProps.frameHeight * TILE_Z;

    expect(handle.style.left).toBe(`${expectedSx}px`);
    expect(handle.style.top).toBe(`${expectedSy}px`);
  });

  it('positions E handle at correct screen offset', () => {
    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-e');

    // E corner: dWorldZ=+d/2
    const expectedSx = (-defaultProps.frameDepth / 2) * (TILE_W / 2);
    const expectedSy =
      (defaultProps.frameDepth / 2) * (TILE_H / 2) - defaultProps.frameHeight * TILE_Z;

    expect(handle.style.left).toBe(`${expectedSx}px`);
    expect(handle.style.top).toBe(`${expectedSy}px`);
  });

  it('positions W handle at correct screen offset', () => {
    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-w');

    // W corner: dWorldZ=-d/2
    const expectedSx = (defaultProps.frameDepth / 2) * (TILE_W / 2);
    const expectedSy =
      (-defaultProps.frameDepth / 2) * (TILE_H / 2) - defaultProps.frameHeight * TILE_Z;

    expect(handle.style.left).toBe(`${expectedSx}px`);
    expect(handle.style.top).toBe(`${expectedSy}px`);
  });

  it('has data-edge attribute on each handle', () => {
    render(<ResizeHandles {...defaultProps} />);
    for (const edge of ['n', 's', 'e', 'w']) {
      const handle = screen.getByTestId(`resize-handle-${edge}`);
      expect(handle).toHaveAttribute('data-edge', edge);
    }
  });

  it('calls resizePlate on pointer move after pointer down on N handle', () => {
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: 4, dWorldZ: 0 });

    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-n');

    // Simulate pointer down
    fireEvent.pointerDown(handle, { pointerId: 1 });

    // Simulate pointer move with movementX/Y
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: 64, movementY: 32 });

    // N handle drag → new width = 12 + 4 = 16 (already even)
    // Anchor edge = 's' (opposite of N)
    expect(mockResizePlate).toHaveBeenCalledWith('test-container', 16, 16, 's');
  });

  it('calls resizePlate on pointer move after pointer down on S handle', () => {
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: -4, dWorldZ: 0 });

    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-s');

    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: -64, movementY: -32 });

    // S handle drag → width = 12 - (-4) = 16
    // Anchor edge = 'n' (opposite of S)
    expect(mockResizePlate).toHaveBeenCalledWith('test-container', 16, 16, 'n');
  });

  it('calls resizePlate on pointer move after pointer down on E handle', () => {
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: 0, dWorldZ: 4 });

    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-e');

    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: -64, movementY: 32 });

    // E handle drag → depth = 16 + 4 = 20
    // Anchor edge = 'w' (opposite of E)
    expect(mockResizePlate).toHaveBeenCalledWith('test-container', 12, 20, 'w');
  });

  it('calls resizePlate on pointer move after pointer down on W handle', () => {
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: 0, dWorldZ: -4 });

    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-w');

    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: 64, movementY: -32 });

    // W handle drag → depth = 16 - (-4) = 20
    // Anchor edge = 'e' (opposite of W)
    expect(mockResizePlate).toHaveBeenCalledWith('test-container', 12, 20, 'e');
  });

  it('does not call resizePlate on pointer move without prior pointer down', () => {
    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-n');

    fireEvent.pointerMove(handle, { pointerId: 1, movementX: 64, movementY: 32 });
    expect(mockResizePlate).not.toHaveBeenCalled();
  });

  it('stops calling resizePlate after pointer up', () => {
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: 4, dWorldZ: 0 });

    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-n');

    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: 64, movementY: 32 });
    expect(mockResizePlate).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(handle, { pointerId: 1 });
    mockResizePlate.mockClear();

    fireEvent.pointerMove(handle, { pointerId: 1, movementX: 64, movementY: 32 });
    expect(mockResizePlate).not.toHaveBeenCalled();
  });

  it('enforces minimum size for network containers (4x4)', () => {
    // Return negative delta that would shrink below min
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: -20, dWorldZ: 0 });

    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-n');

    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: -200, movementY: -100 });

    // Width = 12 + (-20) = -8, should clamp to min 4
    expect(mockResizePlate).toHaveBeenCalledWith('test-container', 4, 16, 's');
  });

  it('enforces maximum size cap (40x40)', () => {
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: 100, dWorldZ: 0 });

    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-n');

    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: 1000, movementY: 500 });

    // Width = 12 + 100 = 112, should clamp to max 40
    expect(mockResizePlate).toHaveBeenCalledWith('test-container', 40, 16, 's');
  });

  it('snaps odd dimensions to nearest even integer', () => {
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: 3, dWorldZ: 0 });

    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-n');

    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: 48, movementY: 24 });

    // Width = 12 + 3 = 15 → snap to even → 14 or 16
    const [, , width] = mockResizePlate.mock.calls[0];
    expect(width % 2).toBe(0);
  });

  it('stops propagation on pointer down to prevent container drag', () => {
    render(<ResizeHandles {...defaultProps} />);
    const handle = screen.getByTestId('resize-handle-n');

    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 1,
    });
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    handle.dispatchEvent(event);
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('handles subnet containers with different min size (2x2)', () => {
    vi.mocked(screenDeltaToWorld).mockReturnValue({ dWorldX: -20, dWorldZ: 0 });

    // Override to subnet layer
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [
            {
              id: 'test-container',
              name: 'Subnet',
              kind: 'container' as const,
              layer: 'subnet' as const,
              resourceType: 'subnet' as const,
              category: 'network' as const,
              provider: 'azure' as const,
              parentId: null,
              position: { x: 5, y: 0, z: 5 },
              frame: { width: 6, height: 0.5, depth: 8 },
              metadata: {},
            },
          ],
        },
      },
    });

    render(
      <ResizeHandles
        containerId="test-container"
        frameWidth={6}
        frameDepth={8}
        frameHeight={0.5}
        containerLayer="subnet"
      />,
    );
    const handle = screen.getByTestId('resize-handle-n');

    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, movementX: -200, movementY: -100 });

    // Width = 6 + (-20) = -14, should clamp to subnet min 2
    expect(mockResizePlate).toHaveBeenCalledWith('test-container', 2, 8, 's');
  });
});
