import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import {
  endpointId,
  type Connection,
  type ContainerBlock,
  type ResourceBlock,
} from '@cloudblocks/schema';
import * as isometricUtils from '../../../shared/utils/isometric';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { MiniMap } from '../MiniMap';

vi.mock('../../../entities/store/architectureStore');

const baseContainer: ContainerBlock = {
  id: 'container-1',
  name: 'Region',
  kind: 'container',
  layer: 'region',
  resourceType: 'virtual_network',
  category: 'network',
  provider: 'aws',
  parentId: null,
  position: { x: 0, y: 0, z: 0 },
  frame: { width: 10, height: 1, depth: 10 },
  metadata: {},
};

const nestedBlock: ResourceBlock = {
  id: 'block-1',
  name: 'API',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'web_compute',
  category: 'compute',
  provider: 'aws',
  parentId: 'container-1',
  position: { x: 2, y: 0, z: 2 },
  metadata: {},
};

const externalBlock: ResourceBlock = {
  id: 'external-1',
  name: 'Browser',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'browser',
  category: 'delivery',
  provider: 'aws',
  parentId: null,
  position: { x: -4, y: 0, z: 3 },
  metadata: {},
  roles: ['external'],
};

interface MiniMapArchitecture {
  nodes: Array<ContainerBlock | ResourceBlock>;
  connections: Connection[];
}

let currentArchitecture: MiniMapArchitecture;

function renderMiniMap(overrides?: Partial<ComponentProps<typeof MiniMap>>) {
  const onRequestCenter = vi.fn();
  const view = render(
    <MiniMap
      pan={{ x: 0, y: 0 }}
      zoom={1}
      origin={{ x: 0, y: 0 }}
      containerWidth={1000}
      containerHeight={800}
      onRequestCenter={onRequestCenter}
      {...overrides}
    />,
  );
  return { ...view, onRequestCenter };
}

beforeEach(() => {
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(
    (tag: string, options?: ElementCreationOptions) => {
      if (tag === 'canvas') {
        const canvas = originalCreateElement(tag, options) as HTMLCanvasElement;
        Object.defineProperty(canvas, 'getContext', {
          value: vi.fn(),
          configurable: true,
        });
        return canvas;
      }
      return originalCreateElement(tag, options);
    },
  );

  currentArchitecture = {
    nodes: [baseContainer, nestedBlock, externalBlock],
    connections: [
      {
        id: 'connection-1',
        from: endpointId('block-1', 'output', 'data'),
        to: endpointId('external-1', 'input', 'data'),
        metadata: {},
      },
    ],
  };

  vi.mocked(useArchitectureStore).mockImplementation(((
    selector: (state: { workspace: { architecture: MiniMapArchitecture } }) => unknown,
  ) =>
    selector({ workspace: { architecture: currentArchitecture } })) as typeof useArchitectureStore);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MiniMap', () => {
  it('renders when enabled and does not render when disabled', () => {
    const MiniMapGate = ({ showMiniMap }: { showMiniMap: boolean }) =>
      showMiniMap ? (
        <MiniMap
          pan={{ x: 0, y: 0 }}
          zoom={1}
          origin={{ x: 0, y: 0 }}
          containerWidth={1000}
          containerHeight={800}
          onRequestCenter={vi.fn()}
        />
      ) : null;

    const { rerender } = render(<MiniMapGate showMiniMap={true} />);
    expect(screen.getByTestId('minimap-container')).toBeInTheDocument();

    rerender(<MiniMapGate showMiniMap={false} />);
    expect(screen.queryByTestId('minimap-container')).toBeNull();
  });

  it('renders container shapes as polygons', () => {
    renderMiniMap();
    expect(screen.getAllByTestId('minimap-container-shape').length).toBeGreaterThan(0);
  });

  it('renders block shapes as polygons', () => {
    renderMiniMap();
    expect(screen.getAllByTestId('minimap-block-shape').length).toBeGreaterThan(0);
  });

  it('renders connection lines', () => {
    renderMiniMap();
    expect(screen.getAllByTestId('minimap-connection').length).toBe(1);
  });

  it('renders viewport rectangle', () => {
    renderMiniMap();
    expect(screen.getByTestId('minimap-viewport')).toBeInTheDocument();
  });

  it('clicking minimap requests recenter pan values', () => {
    currentArchitecture = {
      nodes: [],
      connections: [],
    };
    const { onRequestCenter } = renderMiniMap({
      origin: { x: 100, y: 50 },
      zoom: 1,
      containerWidth: 1000,
      containerHeight: 800,
    });

    const svg = screen.getByTestId('minimap-svg');
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 200,
        height: 140,
        right: 200,
        bottom: 140,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      configurable: true,
    });

    fireEvent.click(screen.getByTestId('minimap-container'), { clientX: 100, clientY: 70 });
    expect(onRequestCenter).toHaveBeenCalledWith(400, 350);
  });

  it('uses default viewBox for empty architecture', () => {
    currentArchitecture = {
      nodes: [],
      connections: [],
    };
    renderMiniMap();
    expect(screen.getByTestId('minimap-svg')).toHaveAttribute('viewBox', '-400 -300 800 600');
  });

  it('updates viewport rectangle dimensions when zoom changes', () => {
    const { rerender } = renderMiniMap({
      pan: { x: 0, y: 0 },
      zoom: 1,
      containerWidth: 600,
      containerHeight: 300,
    });
    const viewport = screen.getByTestId('minimap-viewport');
    expect(viewport.getAttribute('width')).toBe('600');
    expect(viewport.getAttribute('height')).toBe('300');

    rerender(
      <MiniMap
        pan={{ x: 0, y: 0 }}
        zoom={2}
        origin={{ x: 0, y: 0 }}
        containerWidth={600}
        containerHeight={300}
        onRequestCenter={vi.fn()}
      />,
    );

    expect(screen.getByTestId('minimap-viewport').getAttribute('width')).toBe('300');
    expect(screen.getByTestId('minimap-viewport').getAttribute('height')).toBe('150');
  });

  it('handles no connections without errors', () => {
    currentArchitecture = {
      ...currentArchitecture,
      connections: [],
    };
    renderMiniMap();
    expect(screen.queryAllByTestId('minimap-connection')).toHaveLength(0);
    expect(screen.getByTestId('minimap-container')).toBeInTheDocument();
  });

  it('keeps static geometry memoized when pan changes', () => {
    const worldToScreenSpy = vi.spyOn(isometricUtils, 'worldToScreen');
    const { rerender } = renderMiniMap({ pan: { x: 0, y: 0 } });
    const initialCalls = worldToScreenSpy.mock.calls.length;

    rerender(
      <MiniMap
        pan={{ x: 120, y: -80 }}
        zoom={1}
        origin={{ x: 0, y: 0 }}
        containerWidth={1000}
        containerHeight={800}
        onRequestCenter={vi.fn()}
      />,
    );

    expect(worldToScreenSpy.mock.calls.length).toBe(initialCalls);
  });
});
