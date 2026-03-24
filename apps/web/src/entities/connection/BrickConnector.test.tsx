import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { BrickConnector } from './BrickConnector';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getConnectionEndpointWorldAnchors } from './endpointAnchors';
import { getDiffState } from '../../features/diff/engine';
import { getConnectionSurfaceRoute } from './surfaceRouting';
import {
  buildBrickFootprint,
  getVisibleSideFaces,
  projectFootprintToScreen,
  sampleStudPositions,
} from './connectionBrickGeometry';
import type { Connection, ConnectionType } from '@cloudblocks/schema';
import type { DiffDelta } from '../../shared/types/diff';
import type { SurfaceRoute, WorldPoint3 } from './surfaceRouting';
import { endpointId } from '@cloudblocks/schema';

vi.mock('./endpointAnchors', () => ({
  getConnectionEndpointWorldAnchors: vi.fn(),
}));

vi.mock('./surfaceRouting', () => ({
  getConnectionSurfaceRoute: vi.fn(),
}));

vi.mock('./connectionBrickGeometry', () => ({
  buildBrickFootprint: vi.fn(),
  getVisibleSideFaces: vi.fn(),
  projectFootprintToScreen: vi.fn(),
  sampleStudPositions: vi.fn(),
}));

vi.mock('../../shared/tokens/designTokens', () => ({
  TILE_W: 64,
  TILE_H: 32,
  TILE_Z: 32,
  RENDER_SCALE: 32,
  BEAM_WIDTH_CU: 0.5,
  BEAM_THICKNESS_CU: 1 / 3,
  BEAM_THICKNESS_PX: 32 * (1 / 3),
  PIN_HOLE_SPACING_CU: 1.0,
  PIN_HOLE_RX: (32 * 3) / 20,
  PIN_HOLE_RY: (32 * 3) / 20 / 2,
  STUD_RX: 12,
  STUD_RY: 6,
  STUD_HEIGHT: 5,
  STUD_INNER_RX: 7.2,
  STUD_INNER_RY: 3.6,
  STUD_INNER_OPACITY: 0.3,
  PORT_OUT_PX: 8,
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

function setupEndpoints(
  srcWorld: [number, number, number] = [1, 0, 2],
  tgtWorld: [number, number, number] = [3, 0, 4],
) {
  vi.mocked(getConnectionEndpointWorldAnchors).mockReturnValue({ src: srcWorld, tgt: tgtWorld });
}

function createSurfaceRoute(): SurfaceRoute {
  return {
    segments: [
      {
        start: [1, 3, 1],
        end: [3, 3, 1],
        kind: 'surface',
        surfaceId: 'plate-1',
      },
      {
        start: [3, 3, 1],
        end: [3, 3, 3],
        kind: 'surface',
        surfaceId: 'plate-1',
      },
    ],
    srcPort: {
      surfaceBase: [1, 3, 1],
      surfaceExit: [1, 3, 1],
      plateId: 'plate-1',
      surfaceY: 3,
      normal: 'neg-z',
    },
    tgtPort: {
      surfaceBase: [3, 3, 3],
      surfaceExit: [3, 3, 3],
      plateId: 'plate-1',
      surfaceY: 3,
      normal: 'neg-x',
    },
  };
}

function setupBrickRouteMocks() {
  const footprint: WorldPoint3[] = [
    [1, 3.333, 1],
    [3, 3.333, 1],
    [3, 3.333, 2],
    [1, 3.333, 2],
  ];
  vi.mocked(buildBrickFootprint).mockReturnValue(footprint);
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
  vi.mocked(sampleStudPositions).mockReturnValue([
    [1.5, 3.333, 1.5],
    [2.5, 3.333, 1.5],
  ]);
}

function renderConnector(conn: Connection = connection) {
  return render(
    <svg aria-label="Test SVG">
      <BrickConnector
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

describe('BrickConnector', () => {
  const initialUIState = useUIStore.getState();
  const initialArchitectureState = useArchitectureStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConnectionSurfaceRoute).mockReturnValue(null);
    setupBrickRouteMocks();
    useUIStore.setState(initialUIState, true);
    useArchitectureStore.setState(initialArchitectureState, true);
    useUIStore.setState({
      diffMode: false,
      diffDelta: null,
      selectedId: null,
      toolMode: 'select',
    });
  });

  it('returns null when endpoint resolution fails', () => {
    vi.mocked(getConnectionEndpointWorldAnchors).mockReturnValue(null);

    const { container } = renderConnector();
    expect(container.querySelector('g')).toBeNull();
  });

  it('renders svg group with polygons when endpoints exist', () => {
    setupEndpoints();

    const { container } = renderConnector();

    expect(container.querySelector('g')).toBeInTheDocument();
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders hit area with data-testid', () => {
    setupEndpoints();

    const { container } = renderConnector();

    expect(container.querySelector('[data-testid="connection-hit-area"]')).toBeInTheDocument();
  });

  it('click in select mode sets selectedId to connection id', () => {
    setupEndpoints();

    const { container } = renderConnector();

    fireEvent.click(container.querySelector('g') as SVGGElement);
    expect(useUIStore.getState().selectedId).toBe(connection.id);
  });

  it('click in delete mode removes the connection', () => {
    const removeConnectionMock = vi.fn();
    useUIStore.setState({ toolMode: 'delete' });
    useArchitectureStore.setState({ removeConnection: removeConnectionMock });
    setupEndpoints();

    const { container } = renderConnector();

    fireEvent.click(container.querySelector('g') as SVGGElement);
    expect(removeConnectionMock).toHaveBeenCalledWith(connection.id);
  });

  it('keydown Enter in select mode sets selectedId', () => {
    setupEndpoints();

    const { container } = renderConnector();
    fireEvent.keyDown(container.querySelector('g') as SVGGElement, { key: 'Enter' });

    expect(useUIStore.getState().selectedId).toBe(connection.id);
  });

  it('keydown Space in delete mode removes connection', () => {
    const removeConnectionMock = vi.fn();
    useUIStore.setState({ toolMode: 'delete' });
    useArchitectureStore.setState({ removeConnection: removeConnectionMock });
    setupEndpoints();

    const { container } = renderConnector();
    fireEvent.keyDown(container.querySelector('g') as SVGGElement, { key: ' ' });

    expect(removeConnectionMock).toHaveBeenCalledWith(connection.id);
  });

  it('ignores non-activation keys on connector root', () => {
    const removeConnectionMock = vi.fn();
    useArchitectureStore.setState({ removeConnection: removeConnectionMock });
    setupEndpoints();

    const { container } = renderConnector();
    fireEvent.keyDown(container.querySelector('g') as SVGGElement, { key: 'Escape' });

    expect(removeConnectionMock).not.toHaveBeenCalled();
    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('stops propagation when clicking a connection', () => {
    const parentClick = vi.fn();
    vi.mocked(getConnectionEndpointWorldAnchors).mockReturnValue({
      src: [1, 0, 2],
      tgt: [3, 0, 4],
    });

    const { container } = render(
      <svg onClick={parentClick} onKeyDown={() => {}} aria-label="Test SVG">
        <BrickConnector
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

  it('uses diff colors when diff state is added', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('added');
    setupEndpoints([1, 0, 1], [1, 0, 4]);

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
    setupEndpoints([1, 0, 1], [1, 0, 4]);

    const { container } = renderConnector();

    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('0.4');
  });

  it('renders selection outline when connection is selected', () => {
    useUIStore.setState({ selectedId: connection.id });
    setupEndpoints();

    const { container } = renderConnector();

    const selectionOutline = container.querySelector('[data-layer="selection-outline"]');
    expect(selectionOutline).toBeInTheDocument();
    expect(selectionOutline?.getAttribute('stroke')).toBe('#ffffff');
    expect(selectionOutline?.getAttribute('stroke-opacity')).toBe('0.5');
  });

  describe('studs visibility', () => {
    it('renders studs at source and target endpoints when showStuds is true', () => {
      useUIStore.setState({ showStuds: true });
      setupEndpoints();

      const { container } = renderConnector();

      const studLayer = container.querySelector('[data-layer="studs"]');
      expect(studLayer).toBeInTheDocument();

      const studUses = studLayer?.querySelectorAll('use') ?? [];
      expect(studUses.length).toBeGreaterThanOrEqual(2);
    });

    it('does not render studs when showStuds is false', () => {
      useUIStore.setState({ showStuds: false });
      setupEndpoints();

      const { container } = renderConnector();

      const studLayer = container.querySelector('[data-layer="studs"]');
      expect(studLayer).toBeNull();
    });
  });

  describe('brick render path', () => {
    it('renders top-face polygon from projected brick footprint', () => {
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());

      const { container } = renderConnector();

      const topFaceLayer = container.querySelector('[data-layer="top-face"]');
      const topFacePolygon = topFaceLayer?.querySelector('polygon');
      expect(topFacePolygon).toBeInTheDocument();
      expect(topFacePolygon?.getAttribute('points')).toBe('100,220 140,240 130,260 90,240');
      expect(vi.mocked(getConnectionEndpointWorldAnchors)).not.toHaveBeenCalled();
    });

    it('renders side-face polygons and skips legacy liftarm segments', () => {
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());

      const { container } = renderConnector();

      const sideFacesLayer = container.querySelector('[data-layer="side-faces"]');
      expect(sideFacesLayer?.querySelectorAll('polygon')).toHaveLength(2);
      expect(sideFacesLayer?.querySelectorAll('[data-connector-segment]')).toHaveLength(0);
      expect(sideFacesLayer?.querySelectorAll('[data-connector-elbow]')).toHaveLength(0);
    });

    it('uses polygon selection outline when brick route is active', () => {
      useUIStore.setState({ selectedId: connection.id });
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());

      const { container } = renderConnector();

      const selectionOutline = container.querySelector('[data-layer="selection-outline"]');
      expect(selectionOutline).toBeInTheDocument();
      expect(selectionOutline?.tagName.toLowerCase()).toBe('polygon');
    });

    it('renders studs from sampled brick positions when showStuds is true', () => {
      useUIStore.setState({ showStuds: true });
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());

      const { container } = renderConnector();

      const studLayer = container.querySelector('[data-layer="studs"]');
      expect(studLayer).toBeInTheDocument();
      expect(studLayer?.querySelectorAll('use').length).toBeGreaterThanOrEqual(2);
    });

    it('shows validation error label on hover for invalid brick route connections', () => {
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'brick-rule',
              message: 'Brick route is invalid',
              targetId: connection.id,
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());

      const { container } = renderConnector();

      fireEvent.mouseEnter(
        container.querySelector('[data-testid="connection-hit-area"]') as Element,
      );
      expect(container.querySelector('[data-testid="connection-error-label"]')).toBeInTheDocument();
      expect(vi.mocked(getConnectionEndpointWorldAnchors)).not.toHaveBeenCalled();
    });

    it('falls back to null render when brick footprint is degenerate and fallback anchors are missing', () => {
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());
      vi.mocked(buildBrickFootprint).mockReturnValue([]);
      vi.mocked(getConnectionEndpointWorldAnchors).mockReturnValue(null);

      const { container } = renderConnector();

      expect(container.querySelector('g')).toBeNull();
    });

    it('handles disjoint surface segments and still renders a hit area', () => {
      const disjointRoute: SurfaceRoute = {
        ...createSurfaceRoute(),
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
      };
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(disjointRoute);

      const { container } = renderConnector();

      const hitArea = container.querySelector('[data-testid="connection-hit-area"]');
      expect(hitArea).toBeInTheDocument();
      expect(hitArea?.getAttribute('d')).toContain('L');
    });

    it('does not show validation label when brick route has no centerline points', () => {
      useUIStore.setState({ selectedId: connection.id });
      useArchitectureStore.setState({
        validationResult: {
          valid: false,
          errors: [
            {
              ruleId: 'brick-route-empty',
              message: 'No route points',
              targetId: connection.id,
              severity: 'error',
            },
          ],
          warnings: [],
        },
      });
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue({
        ...createSurfaceRoute(),
        segments: [],
      });

      const { container } = renderConnector();

      expect(
        container.querySelector('[data-testid="connection-hit-area"]')?.getAttribute('d'),
      ).toBe('');
      expect(
        container.querySelector('[data-testid="connection-error-label"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe('fallback endpoint side offsets', () => {
    it('applies src outbound and tgt inbound port offsets', () => {
      vi.mocked(getConnectionEndpointWorldAnchors).mockReturnValue({
        src: [1, 0, 1],
        tgt: [3, 0, 3],
        srcSide: 'outbound',
        tgtSide: 'inbound',
      });

      const { container } = renderConnector();

      expect(container.querySelector('[data-testid="connection-hit-area"]')).toBeInTheDocument();
    });

    it('applies src inbound and tgt outbound port offsets', () => {
      vi.mocked(getConnectionEndpointWorldAnchors).mockReturnValue({
        src: [1, 0, 1],
        tgt: [3, 0, 3],
        srcSide: 'inbound',
        tgtSide: 'outbound',
      });

      const { container } = renderConnector();

      expect(container.querySelector('[data-testid="connection-hit-area"]')).toBeInTheDocument();
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
        setupEndpoints();

        const { container } = renderConnector(conn);

        const rootGroup = container.querySelector('g');
        expect(rootGroup).toBeInTheDocument();
        expect(rootGroup?.getAttribute('data-connector-type')).toBe(expected);
      });
    }
  });

  describe('liftarm segments', () => {
    it('renders segments with data-connector-segment attribute', () => {
      setupEndpoints([1, 0, 1], [1, 0, 5]);

      const { container } = renderConnector();

      const segments = container.querySelectorAll('[data-connector-segment]');
      expect(segments.length).toBeGreaterThanOrEqual(1);
    });

    it('segment has direction data attribute', () => {
      // src [1,0,1] → screen (100, 232), tgt [4,0,1] → screen (196, 280)
      // Different X and Y → L-route; first segment direction depends on routing
      setupEndpoints([1, 0, 1], [4, 0, 1]);

      const { container } = renderConnector();

      const segment = container.querySelector('[data-connector-segment]');
      expect(segment).toBeInTheDocument();
      const dir = segment?.getAttribute('data-direction');
      expect(dir === 'screen-v' || dir === 'screen-h').toBe(true);
    });

    it('renders at least 3 polygons per segment (top + side + front + optional pin markers)', () => {
      setupEndpoints([1, 0, 1], [1, 0, 4]);

      const { container } = renderConnector();

      const segment = container.querySelector('[data-connector-segment]');
      expect(segment).toBeInTheDocument();
      const polygons = segment?.querySelectorAll('polygon');
      expect(polygons?.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('elbow joints', () => {
    it('renders elbow with data-connector-elbow for L-shaped routes', () => {
      setupEndpoints([1, 0, 1], [4, 0, 5]);

      const { container } = renderConnector();

      const elbows = container.querySelectorAll('[data-connector-elbow]');
      expect(elbows).toHaveLength(1);
    });

    it('elbow has 3 polygons (square top + 2 side faces)', () => {
      setupEndpoints([1, 0, 1], [4, 0, 5]);

      const { container } = renderConnector();

      const elbow = container.querySelector('[data-connector-elbow]');
      expect(elbow).toBeInTheDocument();
      expect(elbow?.querySelectorAll('polygon')).toHaveLength(3);
    });

    it('does not render elbow for screen-aligned connections', () => {
      // [1,0,1] and [3,0,3]: worldX-worldZ=0 for both → same screenX → single segment, no elbow
      setupEndpoints([1, 0, 1], [3, 0, 3]);

      const { container } = renderConnector();

      const elbows = container.querySelectorAll('[data-connector-elbow]');
      expect(elbows).toHaveLength(0);
    });
  });

  describe('pin holes', () => {
    it('renders pin holes along segments for long enough connections', () => {
      setupEndpoints([0, 0, 0], [0, 0, 5]);

      const { container } = renderConnector();

      const segment = container.querySelector('[data-connector-segment]');
      expect(segment).toBeInTheDocument();
      const pinElements = segment?.querySelectorAll('ellipse, line, polygon');
      expect(pinElements?.length).toBeGreaterThanOrEqual(1);
    });
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
      setupEndpoints();

      const { container } = renderConnector();

      expect(container.querySelector('[data-testid="connection-invalid"]')).toBeInTheDocument();
    });

    it('does NOT render overlay when no validation errors target this connection', () => {
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
      setupEndpoints();

      const { container } = renderConnector();

      expect(container.querySelector('[data-testid="connection-invalid"]')).not.toBeInTheDocument();
    });

    it('does NOT render overlay when validationResult is null', () => {
      useArchitectureStore.setState({ validationResult: null });
      setupEndpoints();

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
      setupEndpoints();

      const { container } = renderConnector();

      fireEvent.mouseEnter(
        container.querySelector('[data-testid="connection-hit-area"]') as Element,
      );

      expect(container.querySelector('[data-testid="connection-error-label"]')).toBeInTheDocument();

      fireEvent.mouseLeave(container.querySelector('g') as Element);
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
      setupEndpoints();

      const { container } = renderConnector();

      expect(container.querySelector('[data-testid="connection-error-label"]')).toBeInTheDocument();
    });

    it('does NOT show error label when not hovered and not selected', () => {
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
      setupEndpoints();

      const { container } = renderConnector();

      expect(
        container.querySelector('[data-testid="connection-error-label"]'),
      ).not.toBeInTheDocument();
    });
  });
});
