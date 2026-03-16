import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConnectionPath } from './ConnectionPath';
import { getEndpointWorldPosition } from '../../shared/utils/position';
import { worldToScreen } from '../../shared/utils/isometric';
import type { Connection } from '../../shared/types/index';

vi.mock('../../shared/utils/position', () => ({
  getEndpointWorldPosition: vi.fn(),
}));

vi.mock('../../shared/utils/isometric', () => ({
  worldToScreen: vi.fn(),
}));

const connection: Connection = {
  id: 'conn-1',
  sourceId: 'source-1',
  targetId: 'target-1',
  type: 'dataflow',
  metadata: {},
};

describe('ConnectionPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when source endpoint position is missing', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce([3, 0, 4]);

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
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce(null);

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
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);

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
    expect(container.querySelectorAll('path')).toHaveLength(2);
    expect(container.querySelector('path')?.getAttribute('d')).toBe('M 120 220 Q 200 180 280 320');
  });

  it('renders arrow markers with connection-based ids', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);

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
    expect(paths[0]?.getAttribute('marker-end')).toBe('url(#arrow-conn-1-bg)');
    expect(paths[1]?.getAttribute('marker-end')).toBe('url(#arrow-conn-1)');
  });

  it('uses userSpaceOnUse markerUnits for consistent arrow sizing', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);

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
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce([3, 0, 4]);

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
    expect(paths[0]?.getAttribute('stroke-width')).toBe('4');
    expect(paths[1]?.getAttribute('stroke-width')).toBe('2');
  });
});
