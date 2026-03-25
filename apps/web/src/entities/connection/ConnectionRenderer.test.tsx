import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { endpointId } from '@cloudblocks/schema';
import type { Connection, ConnectionType } from '@cloudblocks/schema';
import type { DiffDelta } from '../../shared/types/diff';
import { ConnectionRenderer } from './ConnectionRenderer';
import { getDiffState } from '../../features/diff/engine';
import { getConnectionSurfaceRoute } from './surfaceRouting';
import type { SurfaceRoute, WorldPoint3 } from './surfaceRouting';
import {
  buildConnectionFootprint,
  getVisibleSideFaces,
  projectFootprintToScreen,
} from './connectionGeometry';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';

vi.mock('./surfaceRouting', () => ({
  getConnectionSurfaceRoute: vi.fn(),
}));

vi.mock('./connectionGeometry', () => ({
  buildConnectionFootprint: vi.fn(),
  getVisibleSideFaces: vi.fn(),
  projectFootprintToScreen: vi.fn(),
}));

vi.mock('../../shared/tokens/designTokens', () => ({
  TILE_W: 64,
  TILE_H: 32,
  TILE_Z: 32,
  RENDER_SCALE: 32,
  BEAM_WIDTH_CU: 0.5,
  BEAM_THICKNESS_CU: 1 / 3,
  CONNECTION_WIDTH_CU: 1,
  CONNECTION_HEIGHT_CU: 1 / 3,
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

function createSurfaceRoute(overrides?: Partial<SurfaceRoute>): SurfaceRoute {
  return {
    segments: [
      {
        start: [1, 3, 1],
        end: [3, 3, 1],
        kind: 'surface',
        surfaceId: 'container-1',
      },
      {
        start: [3, 3, 1],
        end: [3, 3, 3],
        kind: 'surface',
        surfaceId: 'container-1',
      },
    ],
    srcPort: {
      surfaceBase: [1, 3, 1],
      surfaceExit: [1, 3, 1],
      containerId: 'container-1',
      surfaceY: 3,
      normal: 'neg-z',
    },
    tgtPort: {
      surfaceBase: [3, 3, 3],
      surfaceExit: [3, 3, 3],
      containerId: 'container-1',
      surfaceY: 3,
      normal: 'neg-x',
    },
    ...overrides,
  };
}

function setupSurfaceRouteMocks() {
  const footprint: WorldPoint3[] = [
    [1, 3.333, 1],
    [3, 3.333, 1],
    [3, 3.333, 2],
    [1, 3.333, 2],
  ];
  vi.mocked(buildConnectionFootprint).mockReturnValue(footprint);
  vi.mocked(projectFootprintToScreen).mockReturnValue([
    { x: 100, y: 220 },
    { x: 140, y: 240 },
    { x: 130, y: 260 },
    { x: 90, y: 240 },
  ]);
  vi.mocked(getVisibleSideFaces).mockReturnValue([
    {
      face: 'left',
      vertices: [
        [1, 3.333, 1],
        [3, 3.333, 1],
        [3, 3, 1],
        [1, 3, 1],
      ],
    },
    {
      face: 'right',
      vertices: [
        [3, 3.333, 1],
        [3, 3.333, 2],
        [3, 3, 2],
        [3, 3, 1],
      ],
    },
  ]);
}

function renderConnector(conn: Connection = connection) {
  return render(
    <svg aria-label="Test SVG">
      <title>Test SVG</title>
      <ConnectionRenderer
        connection={conn}
        blocks={[]}
        plates={[]}
        externalActors={[]}
        originX={100}
        originY={200}
      />
    </svg>,
  );
}

describe('ConnectionRenderer', () => {
  const initialUIState = useUIStore.getState();
  const initialArchitectureState = useArchitectureStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());
    setupSurfaceRouteMocks();
    useUIStore.setState(initialUIState, true);
    useArchitectureStore.setState(initialArchitectureState, true);
    useUIStore.setState({
      diffMode: false,
      diffDelta: null,
      selectedId: null,
      toolMode: 'select',
    });
  });

  it('returns null when surface route resolution fails', () => {
    vi.mocked(getConnectionSurfaceRoute).mockReturnValue(null);
    const { container } = renderConnector();
    expect(container.querySelector('g')).toBeNull();
  });

  it('renders svg group with polygons when surface route exists', () => {
    const { container } = renderConnector();
    expect(container.querySelector('g')).toBeInTheDocument();
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders hit area with data-testid', () => {
    const { container } = renderConnector();
    expect(container.querySelector('[data-testid="connection-hit-area"]')).toBeInTheDocument();
  });

  it('click in select mode sets selectedId to connection id', () => {
    const { container } = renderConnector();
    fireEvent.click(
      container.querySelector('[data-testid="connection-hit-area"]') as SVGPathElement,
    );
    expect(useUIStore.getState().selectedId).toBe(connection.id);
  });

  it('click in delete mode removes the connection', () => {
    const removeConnectionMock = vi.fn();
    useUIStore.setState({ toolMode: 'delete' });
    useArchitectureStore.setState({ removeConnection: removeConnectionMock });
    const { container } = renderConnector();
    fireEvent.click(
      container.querySelector('[data-testid="connection-hit-area"]') as SVGPathElement,
    );
    expect(removeConnectionMock).toHaveBeenCalledWith(connection.id);
  });

  it('stops propagation when clicking a connection', () => {
    const parentClick = vi.fn();
    const { container } = render(
      <svg onClick={parentClick} onKeyDown={() => {}} aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer
          connection={connection}
          blocks={[]}
          plates={[]}
          externalActors={[]}
          originX={0}
          originY={0}
        />
      </svg>,
    );

    fireEvent.click(
      container.querySelector('[data-testid="connection-hit-area"]') as SVGPathElement,
    );
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('uses diff colors when diff state is added', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('added');

    const { container } = renderConnector();
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(1);
    const topFaces = Array.from(polygons).filter((p) => p.getAttribute('fill') === '#22c55e');
    expect(topFaces.length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('1');
  });

  it('uses removed diff opacity when diff state is removed', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('removed');

    const { container } = renderConnector();
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('0.4');
  });

  it('renders selection outline when connection is selected', () => {
    useUIStore.setState({ selectedId: connection.id });
    const { container } = renderConnector();
    const selectionOutline = container.querySelector('[data-layer="selection-outline"]');
    expect(selectionOutline).toBeInTheDocument();
    expect(selectionOutline?.getAttribute('stroke')).toBe('#ffffff');
    expect(selectionOutline?.getAttribute('stroke-opacity')).toBe('0.5');
  });

  describe('surface render path', () => {
    it('renders top-face polygon from projected connection footprint', () => {
      const { container } = renderConnector();
      const topFaceLayer = container.querySelector('[data-layer="top-face"]');
      const topFacePolygon = topFaceLayer?.querySelector('polygon');
      expect(topFacePolygon).toBeInTheDocument();
      expect(topFacePolygon?.getAttribute('points')).toBe('100,220 140,240 130,260 90,240');
    });

    it('renders side-face polygons and no legacy liftarm artifacts', () => {
      const { container } = renderConnector();
      const sideFacesLayer = container.querySelector('[data-layer="side-faces"]');
      expect(sideFacesLayer?.querySelectorAll('polygon')).toHaveLength(2);
      expect(sideFacesLayer?.querySelectorAll('[data-connector-segment]')).toHaveLength(0);
      expect(sideFacesLayer?.querySelectorAll('[data-connector-elbow]')).toHaveLength(0);
    });

    it('shows validation error label on hover for invalid surface route connections', () => {
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'surface-rule',
              message: 'Surface route is invalid',
              targetId: connection.id,
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });

      const { container } = renderConnector();
      fireEvent.mouseEnter(
        container.querySelector('[data-testid="connection-hit-area"]') as Element,
      );
      expect(container.querySelector('[data-testid="connection-error-label"]')).toBeInTheDocument();
    });

    it('returns null when connection footprint is degenerate', () => {
      vi.mocked(buildConnectionFootprint).mockReturnValue([]);
      const { container } = renderConnector();
      expect(container.querySelector('g')).toBeNull();
    });

    it('handles disjoint surface segments and still renders a hit area', () => {
      const disjointRoute: SurfaceRoute = createSurfaceRoute({
        segments: [
          {
            start: [1, 3, 1],
            end: [2, 3, 1],
            kind: 'surface',
          },
          {
            start: [5, 3, 5],
            end: [6, 3, 5],
            kind: 'surface',
          },
        ],
      });
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(disjointRoute);

      const { container } = renderConnector();
      const hitArea = container.querySelector('[data-testid="connection-hit-area"]');
      expect(hitArea).toBeInTheDocument();
      expect(hitArea?.getAttribute('d')).toContain('L');
    });

    it('does not show validation label when surface route has no centerline points', () => {
      useUIStore.setState({ selectedId: connection.id });
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'surface-route-empty',
              message: 'No route points',
              targetId: connection.id,
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute({ segments: [] }));

      const { container } = renderConnector();
      expect(
        container.querySelector('[data-testid="connection-hit-area"]')?.getAttribute('d'),
      ).toBe('');
      expect(
        container.querySelector('[data-testid="connection-error-label"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe('connector types', () => {
    const typeMap: Record<ConnectionType, string> = {
      dataflow: 'dataflow',
      http: 'http',
      internal: 'internal',
      data: 'data',
      async: 'async',
    };

    for (const [type, expected] of Object.entries(typeMap)) {
      it(`renders ${type} connection type with correct data attribute`, () => {
        const conn: Connection = {
          ...connection,
          id: `conn-${type}`,
          metadata: { ...connection.metadata, type: type as ConnectionType },
        };

        const { container } = renderConnector(conn);
        const rootGroup = container.querySelector('g');
        expect(rootGroup).toBeInTheDocument();
        expect(rootGroup?.getAttribute('data-connector-type')).toBe(expected);
      });
    }
  });

  describe('validation overlay', () => {
    it('renders red dashed overlay when connection has validation errors', () => {
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'test-rule',
              message: 'Invalid connection',
              targetId: connection.id,
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });

      const { container } = renderConnector();
      expect(container.querySelector('[data-testid="connection-invalid"]')).toBeInTheDocument();
    });

    it('does not render overlay when no validation errors target this connection', () => {
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'test-rule',
              message: 'Some error',
              targetId: 'other-conn',
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });

      const { container } = renderConnector();
      expect(container.querySelector('[data-testid="connection-invalid"]')).not.toBeInTheDocument();
    });

    it('does not render overlay when validationResult is null', () => {
      useArchitectureStore.setState({ validationResult: null });
      const { container } = renderConnector();
      expect(container.querySelector('[data-testid="connection-invalid"]')).not.toBeInTheDocument();
    });

    it('shows error label on hover when connection is invalid', () => {
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'test-rule',
              message: 'Connection not allowed',
              targetId: connection.id,
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });

      const { container } = renderConnector();
      fireEvent.mouseEnter(
        container.querySelector('[data-testid="connection-hit-area"]') as Element,
      );
      expect(container.querySelector('[data-testid="connection-error-label"]')).toBeInTheDocument();

      fireEvent.mouseLeave(
        container.querySelector('[data-testid="connection-hit-area"]') as Element,
      );
      expect(
        container.querySelector('[data-testid="connection-error-label"]'),
      ).not.toBeInTheDocument();
    });

    it('shows error label when connection is selected and invalid', () => {
      useUIStore.setState({ selectedId: connection.id });
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'test-rule',
              message: 'Connection not allowed',
              targetId: connection.id,
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });

      const { container } = renderConnector();
      expect(container.querySelector('[data-testid="connection-error-label"]')).toBeInTheDocument();
    });

    it('does not show error label when not hovered and not selected', () => {
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'test-rule',
              message: 'Connection not allowed',
              targetId: connection.id,
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });

      const { container } = renderConnector();
      expect(
        container.querySelector('[data-testid="connection-error-label"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe('external actor surface path', () => {
    it('renders external actor connections using surface route when available', () => {
      const actorConnection: Connection = {
        ...connection,
        id: 'conn-external',
        from: endpointId('external-1', 'output', 'data'),
      };
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());

      const { container } = renderConnector(actorConnection);
      const topFaceLayer = container.querySelector('[data-layer="top-face"]');
      expect(topFaceLayer?.querySelector('polygon')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-connector-segment]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-connector-elbow]')).toHaveLength(0);
    });

    it('returns null when surface route resolution fails for external actor connection', () => {
      const actorConnection: Connection = {
        ...connection,
        id: 'conn-external-null',
        from: endpointId('external-1', 'output', 'data'),
      };
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(null);

      const { container } = renderConnector(actorConnection);
      expect(container.querySelector('g')).toBeNull();
    });
  });
});
