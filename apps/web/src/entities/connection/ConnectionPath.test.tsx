import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { ConnectionPath } from './ConnectionPath';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getConnectionEndpointWorldAnchors } from './endpointAnchors';
import { worldToScreen } from '../../shared/utils/isometric';
import { getDiffState } from '../../features/diff/engine';
import type { Connection } from '@cloudblocks/schema';
import type { DiffDelta } from '../../shared/types/diff';
import { endpointId } from '@cloudblocks/schema';

vi.mock('./endpointAnchors', () => ({
  getConnectionEndpointWorldAnchors: vi.fn(),
}));

vi.mock('../../shared/utils/isometric', () => ({
  worldToScreen: vi.fn(),
}));

vi.mock('../../features/diff/engine', () => ({
  getDiffState: vi.fn(),
}));

const connection: Connection = {
  id: 'conn-1',
  from: endpointId('source-1', 'output', 'data'),
  to: endpointId('target-1', 'input', 'data'),
  metadata: {},
};

function setupAnchors(
  src: [number, number, number] = [1, 0, 2],
  tgt: [number, number, number] = [3, 0, 4],
) {
  vi.mocked(getConnectionEndpointWorldAnchors).mockReturnValue({ src, tgt });
}

function setupAnchorsNull() {
  vi.mocked(getConnectionEndpointWorldAnchors).mockReturnValue(null);
}

describe('ConnectionPath', () => {
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
    setupAnchorsNull();

    const { container } = render(
      <svg aria-label="connection-path">
        <title>Connection path</title>
        <ConnectionPath
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
    setupAnchorsNull();

    const { container } = render(
      <svg aria-label="connection-path">
        <title>Connection path</title>
        <ConnectionPath
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

  it('renders svg group and paths when source and target positions exist', () => {
    setupAnchors([1, 0, 2], [3, 0, 4]);

    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 120, y: 220 })
      .mockReturnValueOnce({ x: 280, y: 320 });

    const { container } = render(
      <svg aria-label="connection-path">
        <title>Connection path</title>
        <ConnectionPath
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
    expect(container.querySelectorAll('path')).toHaveLength(3);
    expect(container.querySelector('path')?.getAttribute('d')).toBe('M 120 220 Q 200 180 280 320');
  });

  it('renders arrow markers with connection-based ids', () => {
    setupAnchors([1, 0, 2], [3, 0, 4]);

    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg aria-label="connection-path">
        <title>Connection path</title>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    expect(container.querySelector('marker#arrow-conn-1')).toBeInTheDocument();
    expect(container.querySelector('marker#arrow-conn-1-bg')).toBeInTheDocument();

    const paths = container.querySelectorAll('path');
    expect(paths[1]?.getAttribute('marker-end')).toBe('url(#arrow-conn-1-bg)');
    expect(paths[2]?.getAttribute('marker-end')).toBe('url(#arrow-conn-1)');
  });

  it('uses userSpaceOnUse markerUnits for consistent arrow sizing', () => {
    setupAnchors([1, 0, 2], [3, 0, 4]);

    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg aria-label="connection-path">
        <title>Connection path</title>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    const bgMarker = container.querySelector('marker#arrow-conn-1-bg');
    const fgMarker = container.querySelector('marker#arrow-conn-1');

    expect(bgMarker?.getAttribute('markerUnits')).toBe('userSpaceOnUse');
    expect(fgMarker?.getAttribute('markerUnits')).toBe('userSpaceOnUse');
  });

  it('renders proportional stroke widths for connection lines', () => {
    setupAnchors([1, 0, 2], [3, 0, 4]);

    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg aria-label="connection-path">
        <title>Connection path</title>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    const paths = container.querySelectorAll('path');
    expect(paths[1]?.getAttribute('stroke-width')).toBe('4');
    expect(paths[2]?.getAttribute('stroke-width')).toBe('2');
  });

  it('uses added diff colors when diff state is added', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('added');
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    const paths = container.querySelectorAll('path');
    expect(paths[1]?.getAttribute('stroke')).toBe('#166534');
    expect(paths[2]?.getAttribute('stroke')).toBe('#22c55e');
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('1');
  });

  it('uses removed diff colors and reduced opacity when diff state is removed', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('removed');
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    const paths = container.querySelectorAll('path');
    expect(paths[1]?.getAttribute('stroke')).toBe('#991b1b');
    expect(paths[2]?.getAttribute('stroke')).toBe('#ef4444');
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('0.4');
  });

  it('uses modified diff colors when diff state is modified', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('modified');
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    const paths = container.querySelectorAll('path');
    expect(paths[1]?.getAttribute('stroke')).toBe('#854d0e');
    expect(paths[2]?.getAttribute('stroke')).toBe('#eab308');
  });

  it('uses unchanged colors by default in diff mode without delta', () => {
    useUIStore.setState({ diffMode: true, diffDelta: null });
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    const paths = container.querySelectorAll('path');
    expect(paths[1]?.getAttribute('stroke')).toBe('#3A6670');
    expect(paths[2]?.getAttribute('stroke')).toBe('#5C97A3');
    expect(vi.mocked(getDiffState)).not.toHaveBeenCalled();
  });

  it('click in select mode sets selectedId to connection id', () => {
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen).mockImplementation((x) =>
      x === 1 ? { x: 100, y: 100 } : { x: 200, y: 200 },
    );

    const { container } = render(
      <svg>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    fireEvent.click(container.querySelector('g') as SVGGElement);

    expect(useUIStore.getState().selectedId).toBe(connection.id);
  });

  it('click in delete mode removes the connection', () => {
    const removeConnectionMock = vi.fn();
    useUIStore.setState({ toolMode: 'delete' });
    useArchitectureStore.setState({ removeConnection: removeConnectionMock });
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    fireEvent.click(container.querySelector('g') as SVGGElement);

    expect(removeConnectionMock).toHaveBeenCalledWith(connection.id);
  });

  it('hovering connection highlights the stroke widths', () => {
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen).mockImplementation((x) =>
      x === 1 ? { x: 100, y: 100 } : { x: 200, y: 200 },
    );

    const { container } = render(
      <svg>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    const hitArea = container.querySelector(
      '[data-testid="connection-hit-area"]',
    ) as SVGPathElement;

    fireEvent.mouseEnter(hitArea);
    expect(container.querySelectorAll('path')[1]?.getAttribute('stroke-width')).toBe('6');
    expect(container.querySelectorAll('path')[2]?.getAttribute('stroke-width')).toBe('4');

    fireEvent.mouseLeave(hitArea);
    expect(container.querySelectorAll('path')[1]?.getAttribute('stroke-width')).toBe('4');
    expect(container.querySelectorAll('path')[2]?.getAttribute('stroke-width')).toBe('2');
  });

  it('selected connection renders highlighted stroke widths', () => {
    useUIStore.setState({ selectedId: connection.id });
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    const paths = container.querySelectorAll('path');
    expect(paths[1]?.getAttribute('stroke-width')).toBe('6');
    expect(paths[2]?.getAttribute('stroke-width')).toBe('4');
  });

  it('stops propagation when clicking a connection', () => {
    const parentClick = vi.fn();
    setupAnchors([1, 0, 2], [3, 0, 4]);
    vi.mocked(worldToScreen)
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 });

    const { container } = render(
      <svg onClick={parentClick}>
        <ConnectionPath
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    fireEvent.click(container.querySelector('g') as SVGGElement);

    expect(parentClick).not.toHaveBeenCalled();
  });
});
