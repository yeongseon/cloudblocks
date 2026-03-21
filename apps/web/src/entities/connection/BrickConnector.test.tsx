import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { BrickConnector } from './BrickConnector';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getEndpointWorldPosition } from '../../shared/utils/position';
import { worldToScreen } from '../../shared/utils/isometric';
import { getDiffState } from '../../features/diff/engine';
import type { Connection } from '@cloudblocks/schema';
import type { DiffDelta } from '../../shared/types/diff';

vi.mock('../../shared/utils/position', () => ({
  getEndpointWorldPosition: vi.fn(),
}));

vi.mock('../../shared/utils/isometric', () => ({
  worldToScreen: vi.fn(),
}));

vi.mock('../../features/diff/engine', () => ({
  getDiffState: vi.fn(),
}));

const connection: Connection = {
  id: 'conn-1',
  sourceId: 'source-1',
  targetId: 'target-1',
  type: 'dataflow',
  metadata: {},
};

describe('BrickConnector', () => {
  const initialUIState = useUIStore.getState();
  const initialArchitectureState = useArchitectureStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState(initialUIState, true);
    useArchitectureStore.setState(initialArchitectureState, true);
    useUIStore.setState({
      diffMode: false,
      diffDelta: null,
      selectedId: null,
      toolMode: 'select',
    });
  });

  it('returns null when source endpoint position is missing', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce([3, 0, 4]);

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={100}
          originY={200}
        />
      </svg>,
    );

    expect(container.querySelector('g')).toBeNull();
  });

  it('returns null when target endpoint position is missing', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce(null);

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={100}
          originY={200}
        />
      </svg>,
    );

    expect(container.querySelector('g')).toBeNull();
  });

  it('renders svg group with polygons and ellipses when endpoints exist', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 120, y: 220 })
      .mockReturnValueOnce({ x: 280, y: 320 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={100}
          originY={200}
        />
      </svg>,
    );

    expect(container.querySelector('g')).toBeInTheDocument();
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(4);
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses.length).toBe(6);
  });

  it('renders hit area with data-testid', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={connection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    expect(container.querySelector('[data-testid="connection-hit-area"]')).toBeInTheDocument();
  });

  it('click in select mode sets selectedId to connection id', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={connection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    fireEvent.click(container.querySelector('g') as SVGGElement);
    expect(useUIStore.getState().selectedId).toBe(connection.id);
  });

  it('click in delete mode removes the connection', () => {
    const removeConnectionMock = vi.fn();
    useUIStore.setState({ toolMode: 'delete' });
    useArchitectureStore.setState({ removeConnection: removeConnectionMock });
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={connection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    fireEvent.click(container.querySelector('g') as SVGGElement);
    expect(removeConnectionMock).toHaveBeenCalledWith(connection.id);
  });

  it('stops propagation when clicking a connection', () => {
    const parentClick = vi.fn();
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg onClick={parentClick}><title>Test</title>
        <BrickConnector connection={connection} blocks={[]} plates={[]} externalActors={[]} originX={0} originY={0} />
      </svg>,
    );

    fireEvent.click(container.querySelector('g') as SVGGElement);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('uses diff colors when diff state is added', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('added');
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={connection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    const topFace = container.querySelectorAll('polygon')[2];
    expect(topFace?.getAttribute('fill')).toBe('#22c55e');
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('1');
  });

  it('uses removed diff opacity when diff state is removed', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('removed');
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={connection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('0.4');
  });

  it('renders selection glow when connection is selected', () => {
    useUIStore.setState({ selectedId: connection.id });
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={connection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    const glowPath = container.querySelectorAll('path')[0];
    expect(glowPath?.getAttribute('stroke')).toBe('#ffffff');
    expect(glowPath?.getAttribute('stroke-opacity')).toBe('0.5');
  });

  it('renders studs at source and target endpoints', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={connection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses).toHaveLength(6);

    expect(ellipses[0]?.getAttribute('rx')).toBe('12');
    expect(ellipses[0]?.getAttribute('ry')).toBe('6');
    expect(ellipses[2]?.getAttribute('rx')).toBe('7.2');
    expect(ellipses[2]?.getAttribute('ry')).toBe('3.6');
  });

  it('renders different pattern for http connection type', () => {
    const httpConnection: Connection = {
      ...connection,
      id: 'conn-http',
      type: 'http',
    };

    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 250, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={httpConnection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('renders dashed pattern for internal connection type', () => {
    const internalConnection: Connection = {
      ...connection,
      id: 'conn-int',
      type: 'internal',
    };

    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 250, y: 200 });

    const { container } = render(
      <svg><title>Test</title>
        <BrickConnector connection={internalConnection} blocks={[]} plates={[]} externalActors={[]} originX={100} originY={200} />
      </svg>,
    );

    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]?.getAttribute('stroke-dasharray')).toBe('4 3');
  });
});
