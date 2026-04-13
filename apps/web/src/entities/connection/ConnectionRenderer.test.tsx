import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { endpointId } from '@cloudblocks/schema';
import type { Connection, ConnectionType } from '@cloudblocks/schema';
import type { DiffDelta } from '../../shared/types/diff';
import { ConnectionRenderer } from './ConnectionRenderer';
import { getDiffState } from '../../shared/utils/diff';
import { getConnectionSurfaceRoute } from './surfaceRouting';
import type { SurfaceRoute } from './surfaceRouting';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';

vi.mock('./surfaceRouting', () => ({
  getConnectionSurfaceRoute: vi.fn(),
}));

vi.mock('../../shared/tokens/designTokens', () => ({
  TILE_W: 64,
  TILE_H: 32,
  TILE_Z: 32,
  RENDER_SCALE: 32,
  TRACE_FLASH_PX: 2,
  ARROW_MARKER_W: 6,
  ARROW_MARKER_H: 6,
  ARROW_MARKER_REF_X: 5.5,
  PORT_DOT_RX: 4,
  PORT_DOT_RY: 2.5,
  PORT_DOT_STROKE_WIDTH: 1.5,
}));

vi.mock('../../shared/utils/diff', () => ({
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

function renderConnector(conn: Connection = connection) {
  return render(
    <svg aria-label="Test SVG">
      <title>Test SVG</title>
      <ConnectionRenderer connection={conn} blocks={[]} plates={[]} originX={100} originY={200} />
    </svg>,
  );
}

describe('ConnectionRenderer', () => {
  const initialUIState = useUIStore.getState();
  const initialArchitectureState = useArchitectureStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute());
    useUIStore.setState(initialUIState, true);
    useArchitectureStore.setState(initialArchitectureState, true);
    useUIStore.setState({
      diffMode: false,
      diffDelta: null,
      selectedId: null,
      selectedIds: new Set(),
      toolMode: 'select',
    });
  });

  it('returns null when surface route resolution fails', () => {
    vi.mocked(getConnectionSurfaceRoute).mockReturnValue(null);
    const { container } = renderConnector();
    expect(container.querySelector('g')).toBeNull();
  });

  it('renders svg group with casing and trace paths when surface route exists', () => {
    const { container } = renderConnector();
    expect(container.querySelector('g')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="connection-casing"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="connection-trace"]')).toBeInTheDocument();
  });

  it('renders hit area with data-testid', () => {
    const { container } = renderConnector();
    expect(container.querySelector('[data-testid="connection-hit-area"]')).toBeInTheDocument();
  });

  it('renders packet flow layer in default idle mode', () => {
    const { container } = renderConnector();
    expect(container.querySelector('[data-testid="packet-flow-layer"]')).toBeInTheDocument();
  });

  it('renders static direction chevrons when reducedMotion prop is true', () => {
    const { container } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer
          connection={connection}
          blocks={[]}
          plates={[]}
          originX={100}
          originY={200}
          elapsed={1000}
          reducedMotion={true}
        />
      </svg>,
    );
    expect(container.querySelector('[data-testid="packet-flow-layer"]')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-testid="packet-direction-chevron"]').length,
    ).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="packet-flow-packet"]')).not.toBeInTheDocument();
  });

  it('uses elapsed prop to determine packet position', () => {
    const { container: container1 } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer
          connection={connection}
          blocks={[]}
          plates={[]}
          originX={100}
          originY={200}
          elapsed={500}
          reducedMotion={false}
        />
      </svg>,
    );
    const packet1 = container1.querySelector('[data-testid="packet-flow-packet"]');
    const transform1 = packet1?.getAttribute('transform');

    const { container: container2 } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer
          connection={connection}
          blocks={[]}
          plates={[]}
          originX={100}
          originY={200}
          elapsed={2000}
          reducedMotion={false}
        />
      </svg>,
    );
    const packet2 = container2.querySelector('[data-testid="packet-flow-packet"]');
    const transform2 = packet2?.getAttribute('transform');

    expect(transform1).not.toBe(transform2);
  });

  it('does not render packet flow layer when connection has validation errors', () => {
    useArchitectureStore.setState({
      validationResult: {
        valid: false,
        errors: [
          {
            ruleId: 'invalid-connection',
            message: 'Connection has validation errors',
            targetId: connection.id,
            severity: 'error',
          },
        ],
        warnings: [],
      },
    });

    const { container } = renderConnector();

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).not.toBeInTheDocument();
  });

  it('renders hover packet visuals when connection is hovered', () => {
    const { container } = renderConnector();

    fireEvent.mouseEnter(container.querySelector('[data-testid="connection-hit-area"]') as Element);

    const packetEl = container.querySelector('[data-testid="packet-flow-packet"]');
    expect(
      packetEl?.querySelector('[data-layer="packet-core"]')?.getAttribute('fill-opacity'),
    ).toBe('0.5');
  });

  it('renders selected packet visuals when connection is selected', () => {
    useUIStore.setState({ selectedId: connection.id, selectedIds: new Set([connection.id]) });

    const { container } = renderConnector();

    const packetEl = container.querySelector('[data-testid="packet-flow-packet"]');
    expect(
      packetEl?.querySelector('[data-layer="packet-core"]')?.getAttribute('fill-opacity'),
    ).toBe('0.8');
  });

  it('selected mode takes precedence over hover when both are active', () => {
    useUIStore.setState({ selectedId: connection.id, selectedIds: new Set([connection.id]) });
    const { container } = renderConnector();

    fireEvent.mouseEnter(container.querySelector('[data-testid="connection-hit-area"]') as Element);

    const packetEl = container.querySelector('[data-testid="packet-flow-packet"]');
    expect(
      packetEl?.querySelector('[data-layer="packet-core"]')?.getAttribute('fill-opacity'),
    ).toBe('0.8');
  });

  it('creation mode takes precedence over selected and hover', () => {
    useUIStore.setState({
      selectedId: connection.id,
      selectedIds: new Set([connection.id]),
      connectionCreationBursts: new Map([[connection.id, Date.now() + 10000]]),
    });

    const { container } = renderConnector();

    fireEvent.mouseEnter(container.querySelector('[data-testid="connection-hit-area"]') as Element);

    const packetEl = container.querySelector('[data-testid="packet-flow-packet"]');
    expect(
      packetEl?.querySelector('[data-layer="packet-core"]')?.getAttribute('fill-opacity'),
    ).toBe('1');
  });

  it('creation mode renders packets even when external elapsed exceeds PACKET_SPEED_MS', () => {
    const burstExpiry = Date.now() + 2000;
    useUIStore.setState({
      connectionCreationBursts: new Map([[connection.id, burstExpiry]]),
    });

    // External elapsed is far beyond PACKET_SPEED_MS (2600ms), simulating a canvas
    // that has been open for a long time. Without the fix, this would cause the
    // creation burst to render as already completed.
    const { container } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer
          connection={connection}
          blocks={[]}
          plates={[]}
          originX={100}
          originY={200}
          elapsed={999999}
          reducedMotion={false}
        />
      </svg>,
    );

    // Packet flow layer should still render because creation elapsed is derived
    // from creationBurstExpiry, not the shared clock.
    expect(container.querySelector('[data-testid="packet-flow-layer"]')).toBeInTheDocument();
    const packetEl = container.querySelector('[data-testid="packet-flow-packet"]');
    expect(
      packetEl?.querySelector('[data-layer="packet-core"]')?.getAttribute('fill-opacity'),
    ).toBe('1');
  });

  it('creation mode uses burst-local elapsed instead of shared clock elapsed', () => {
    vi.useFakeTimers();
    const now = Date.now();
    const burstExpiry = now + 2600; // CREATION_BURST_DURATION_MS = PACKET_SPEED_MS = 2600
    useUIStore.setState({
      connectionCreationBursts: new Map([[connection.id, burstExpiry]]),
    });

    // Render with two different external elapsed values — both very large.
    // If creation mode correctly uses burst-local elapsed, both should produce
    // the same packet position (because burst-local elapsed is ~0 in both cases).
    const { container: container1 } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer
          connection={connection}
          blocks={[]}
          plates={[]}
          originX={100}
          originY={200}
          elapsed={50000}
          reducedMotion={false}
        />
      </svg>,
    );
    const packet1 = container1.querySelector('[data-testid="packet-flow-packet"]');
    const transform1 = packet1?.getAttribute('transform');

    const { container: container2 } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer
          connection={connection}
          blocks={[]}
          plates={[]}
          originX={100}
          originY={200}
          elapsed={100000}
          reducedMotion={false}
        />
      </svg>,
    );
    const packet2 = container2.querySelector('[data-testid="packet-flow-packet"]');
    const transform2 = packet2?.getAttribute('transform');

    // Both should render packets (not null) and at the same position
    // because burst-local elapsed is the same (~0) regardless of external elapsed.
    expect(packet1).toBeInTheDocument();
    expect(packet2).toBeInTheDocument();
    expect(transform1).toBe(transform2);

    vi.useRealTimers();
  });

  it('creation mode works without elapsed prop (standalone fallback clock)', () => {
    const burstExpiry = Date.now() + 2000;
    useUIStore.setState({
      connectionCreationBursts: new Map([[connection.id, burstExpiry]]),
    });

    // Render without elapsed prop — PacketFlowLayer should use its internal clock
    const { container } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer
          connection={connection}
          blocks={[]}
          plates={[]}
          originX={100}
          originY={200}
        />
      </svg>,
    );

    // Creation burst should still render — PacketFlowLayer falls back to internal clock
    expect(container.querySelector('[data-testid="packet-flow-layer"]')).toBeInTheDocument();
    const packetEl = container.querySelector('[data-testid="packet-flow-packet"]');
    expect(
      packetEl?.querySelector('[data-layer="packet-core"]')?.getAttribute('fill-opacity'),
    ).toBe('1');
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
    const casingPath = container.querySelector('[data-testid="connection-casing"]');
    expect(casingPath).toBeInTheDocument();
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('1');
  });

  it('uses removed diff opacity when diff state is removed', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('removed');

    const { container } = renderConnector();
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('0.4');
  });

  it('renders provider-accent glow outline when connection is selected', () => {
    useUIStore.setState({ selectedId: connection.id, selectedIds: new Set([connection.id]) });
    const { container } = renderConnector();
    const selectionOutline = container.querySelector('[data-layer="selection-outline"]');
    expect(selectionOutline).toBeInTheDocument();
    expect(selectionOutline?.tagName.toLowerCase()).toBe('path');
    expect(selectionOutline?.getAttribute('stroke')).toBe('var(--provider-accent-glow)');
    expect(selectionOutline?.getAttribute('stroke-opacity')).toBe('1');
  });

  it('renders provider-accent glow outline on hover with reduced opacity', () => {
    const { container } = renderConnector();
    fireEvent.mouseEnter(container.querySelector('[data-testid="connection-hit-area"]') as Element);
    const hoverOutline = container.querySelector('[data-layer="selection-outline"]');
    expect(hoverOutline).toBeInTheDocument();
    expect(hoverOutline?.getAttribute('stroke')).toBe('var(--provider-accent-glow)');
    expect(hoverOutline?.getAttribute('stroke-opacity')).toBe('0.7');
  });

  it('does not render glow outline when not hovered and not selected', () => {
    const { container } = renderConnector();
    expect(container.querySelector('[data-layer="selection-outline"]')).not.toBeInTheDocument();
  });

  it('renders hover-equivalent packet visuals on keyboard focus', () => {
    const { container } = renderConnector();
    const link = container.querySelector('a') as Element;

    fireEvent.focus(link);

    const packetEl = container.querySelector('[data-testid="packet-flow-packet"]');
    expect(
      packetEl?.querySelector('[data-layer="packet-core"]')?.getAttribute('fill-opacity'),
    ).toBe('0.5');
  });

  it('renders glow outline on keyboard focus with reduced opacity', () => {
    const { container } = renderConnector();
    const link = container.querySelector('a') as Element;

    fireEvent.focus(link);

    const focusOutline = container.querySelector('[data-layer="selection-outline"]');
    expect(focusOutline).toBeInTheDocument();
    expect(focusOutline?.getAttribute('stroke')).toBe('var(--provider-accent-glow)');
    expect(focusOutline?.getAttribute('stroke-opacity')).toBe('0.7');
  });

  it('removes highlight state on blur after keyboard focus', () => {
    const { container } = renderConnector();
    const link = container.querySelector('a') as Element;

    fireEvent.focus(link);
    expect(container.querySelector('[data-layer="selection-outline"]')).toBeInTheDocument();

    fireEvent.blur(link);
    expect(container.querySelector('[data-layer="selection-outline"]')).not.toBeInTheDocument();
  });

  it('maintains highlight when hover leaves but keyboard focus remains', () => {
    const { container } = renderConnector();
    const link = container.querySelector('a') as Element;
    const hitArea = container.querySelector('[data-testid="connection-hit-area"]') as Element;

    // Focus via keyboard first
    fireEvent.focus(link);
    expect(container.querySelector('[data-layer="selection-outline"]')).toBeInTheDocument();

    // Mouse enters then leaves while focus remains
    fireEvent.mouseEnter(hitArea);
    fireEvent.mouseLeave(hitArea);

    // Highlight should remain because focus is still active
    expect(container.querySelector('[data-layer="selection-outline"]')).toBeInTheDocument();
  });

  it('maintains highlight when blur fires but hover remains', () => {
    const { container } = renderConnector();
    const link = container.querySelector('a') as Element;
    const hitArea = container.querySelector('[data-testid="connection-hit-area"]') as Element;

    // Mouse enters first
    fireEvent.mouseEnter(hitArea);
    expect(container.querySelector('[data-layer="selection-outline"]')).toBeInTheDocument();

    // Focus then blur while hover remains
    fireEvent.focus(link);
    fireEvent.blur(link);

    // Highlight should remain because hover is still active
    expect(container.querySelector('[data-layer="selection-outline"]')).toBeInTheDocument();
  });

  it('removes highlight only when both hover and focus clear', () => {
    const { container } = renderConnector();
    const link = container.querySelector('a') as Element;
    const hitArea = container.querySelector('[data-testid="connection-hit-area"]') as Element;

    // Both hover and focus active
    fireEvent.mouseEnter(hitArea);
    fireEvent.focus(link);
    expect(container.querySelector('[data-layer="selection-outline"]')).toBeInTheDocument();

    // Remove hover — focus still keeps highlight
    fireEvent.mouseLeave(hitArea);
    expect(container.querySelector('[data-layer="selection-outline"]')).toBeInTheDocument();

    // Remove focus — now highlight should be gone
    fireEvent.blur(link);
    expect(container.querySelector('[data-layer="selection-outline"]')).not.toBeInTheDocument();
  });

  it('renders accessible label on SVG link', () => {
    const { container } = renderConnector();
    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    // Default connection has no blocks in store — fallback label
    expect(link?.getAttribute('aria-label')).toBe('Connection');
  });

  it('renders full accessible label with source and target block names', () => {
    useArchitectureStore.setState({
      nodeById: new Map([
        [
          'source-1',
          {
            id: 'source-1',
            name: 'Web Server',
            kind: 'resource' as const,
            layer: 'resource' as const,
            resourceType: 'web_compute',
            category: 'compute' as const,
            provider: 'azure' as const,
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            metadata: {},
          },
        ],
        [
          'target-1',
          {
            id: 'target-1',
            name: 'Database',
            kind: 'resource' as const,
            layer: 'resource' as const,
            resourceType: 'relational_database',
            category: 'data' as const,
            provider: 'azure' as const,
            parentId: null,
            position: { x: 1, y: 0, z: 1 },
            metadata: {},
          },
        ],
      ]),
    });

    const connWithType: Connection = {
      ...connection,
      metadata: { ...connection.metadata, type: 'http' },
    };
    const { container } = renderConnector(connWithType);
    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('aria-label')).toBe('Connection from Web Server to Database (http)');
  });

  it('renders arrow marker definition with correct attributes', () => {
    const { container } = renderConnector();
    const marker = container.querySelector('[data-testid="connection-arrow-marker"]');
    expect(marker).toBeInTheDocument();
    expect(marker?.getAttribute('markerWidth')).toBe('6');
    expect(marker?.getAttribute('markerHeight')).toBe('6');
    expect(marker?.getAttribute('refX')).toBe('5.5');
    expect(marker?.getAttribute('orient')).toBe('auto');
    // Marker contains a filled triangle path
    const arrowPath = marker?.querySelector('path');
    expect(arrowPath).toBeInTheDocument();
    expect(arrowPath?.getAttribute('d')).toBe('M0,0 L6,3 L0,6 Z');
  });

  it('trace path references arrow marker via marker-end', () => {
    const { container } = renderConnector();
    const trace = container.querySelector('[data-testid="connection-trace"]');
    expect(trace?.getAttribute('marker-end')).toBe(`url(#arrow-${connection.id})`);
  });

  it('hover increases casing and trace widths by +1 (dataflow default)', () => {
    const { container } = renderConnector();
    const casing = container.querySelector('[data-testid="connection-casing"]');
    const trace = container.querySelector('[data-testid="connection-trace"]');
    // Default state: dataflow strokeWidth=2.5, casing=2.5+2.5=5, trace=2.5
    expect(casing?.getAttribute('stroke-width')).toBe('5');
    expect(trace?.getAttribute('stroke-width')).toBe('2.5');
    // Hover: casing=2.5+2.5+1=6, trace=2.5+1=3.5
    fireEvent.mouseEnter(container.querySelector('[data-testid="connection-hit-area"]') as Element);
    expect(casing?.getAttribute('stroke-width')).toBe('6');
    expect(trace?.getAttribute('stroke-width')).toBe('3.5');
  });

  describe('surface render path', () => {
    it('renders casing and trace path layers from route centerline', () => {
      const { container } = renderConnector();
      const casingLayer = container.querySelector('[data-layer="casing"]');
      const traceLayer = container.querySelector('[data-layer="trace"]');
      expect(casingLayer).toBeInTheDocument();
      expect(casingLayer?.tagName.toLowerCase()).toBe('path');
      expect(traceLayer).toBeInTheDocument();
      expect(traceLayer?.tagName.toLowerCase()).toBe('path');
    });

    it('casing and trace paths share the same d attribute', () => {
      const { container } = renderConnector();
      const casing = container.querySelector('[data-layer="casing"]');
      const trace = container.querySelector('[data-layer="trace"]');
      expect(casing?.getAttribute('d')).toBe(trace?.getAttribute('d'));
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

    it('returns null when route has fewer than 2 centerline points', () => {
      vi.mocked(getConnectionSurfaceRoute).mockReturnValue(createSurfaceRoute({ segments: [] }));
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
      useUIStore.setState({ selectedId: connection.id, selectedIds: new Set([connection.id]) });
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
        container.querySelector('[data-testid="connection-hit-area"]'),
      ).not.toBeInTheDocument();
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

  describe('typed connection visuals', () => {
    const typedSpecs: Array<{
      type: ConnectionType;
      baseWidth: number;
      dash?: string;
    }> = [
      { type: 'dataflow', baseWidth: 2.5 },
      { type: 'http', baseWidth: 4 },
      { type: 'internal', baseWidth: 3 },
      { type: 'data', baseWidth: 2, dash: '6 3' },
      { type: 'async', baseWidth: 2.25, dash: '2 3' },
    ];

    for (const spec of typedSpecs) {
      it(`renders ${spec.type} with strokeWidth=${spec.baseWidth} and dash=${spec.dash ?? 'none'}`, () => {
        const conn: Connection = {
          ...connection,
          id: `conn-${spec.type}`,
          metadata: { ...connection.metadata, type: spec.type },
        };

        const { container } = renderConnector(conn);
        const trace = container.querySelector('[data-testid="connection-trace"]');
        const casing = container.querySelector('[data-testid="connection-casing"]');

        // Base stroke widths
        expect(trace?.getAttribute('stroke-width')).toBe(String(spec.baseWidth));
        expect(casing?.getAttribute('stroke-width')).toBe(String(spec.baseWidth + 2.5));

        // Dash pattern
        if (spec.dash) {
          expect(trace?.getAttribute('stroke-dasharray')).toBe(spec.dash);
          expect(casing?.getAttribute('stroke-dasharray')).toBe(spec.dash);
        } else {
          expect(trace?.getAttribute('stroke-dasharray')).toBeNull();
          expect(casing?.getAttribute('stroke-dasharray')).toBeNull();
        }
      });

      it(`hover on ${spec.type} increases widths proportionally`, () => {
        const conn: Connection = {
          ...connection,
          id: `conn-hover-${spec.type}`,
          metadata: { ...connection.metadata, type: spec.type },
        };

        const { container } = renderConnector(conn);
        fireEvent.mouseEnter(
          container.querySelector('[data-testid="connection-hit-area"]') as Element,
        );

        const trace = container.querySelector('[data-testid="connection-trace"]');
        const casing = container.querySelector('[data-testid="connection-casing"]');

        // Hover: trace = base + 1, casing = base + 2.5 + 1
        expect(trace?.getAttribute('stroke-width')).toBe(String(spec.baseWidth + 1));
        expect(casing?.getAttribute('stroke-width')).toBe(String(spec.baseWidth + 3.5));
      });
    }

    it('falls back to dataflow style when metadata.type is undefined', () => {
      const conn: Connection = {
        ...connection,
        id: 'conn-no-type',
        metadata: {},
      };

      const { container } = renderConnector(conn);
      const trace = container.querySelector('[data-testid="connection-trace"]');
      const casing = container.querySelector('[data-testid="connection-casing"]');

      // dataflow defaults: trace=2.5, casing=5
      expect(trace?.getAttribute('stroke-width')).toBe('2.5');
      expect(casing?.getAttribute('stroke-width')).toBe('5');
      expect(trace?.getAttribute('stroke-dasharray')).toBeNull();
      expect(casing?.getAttribute('stroke-dasharray')).toBeNull();
    });

    it('falls back to dataflow style when metadata is missing', () => {
      const conn: Connection = {
        ...connection,
        id: 'conn-no-metadata',
      };

      const { container } = renderConnector(conn);
      const trace = container.querySelector('[data-testid="connection-trace"]');

      expect(trace?.getAttribute('stroke-width')).toBe('2.5');
      expect(trace?.getAttribute('stroke-dasharray')).toBeNull();
    });

    it('falls back to dataflow for prototype-chain keys like toString/constructor', () => {
      const conn: Connection = {
        ...connection,
        id: 'conn-proto-key',
        metadata: { ...connection.metadata, type: 'toString' },
      };

      const { container } = renderConnector(conn);
      const trace = container.querySelector('[data-testid="connection-trace"]');
      const casing = container.querySelector('[data-testid="connection-casing"]');

      // Should fall back to dataflow (strokeWidth=2.5, casing=5), not crash
      expect(trace?.getAttribute('stroke-width')).toBe('2.5');
      expect(casing?.getAttribute('stroke-width')).toBe('5');
      expect(trace?.getAttribute('stroke-dasharray')).toBeNull();
    });

    it('uses consistent dataflow fallback across all visual layers for invalid type', () => {
      const conn: Connection = {
        ...connection,
        id: 'conn-invalid-type',
        metadata: { ...connection.metadata, type: 'toString' },
      };

      const { container } = renderConnector(conn);
      const rootGroup = container.querySelector('g');
      const trace = container.querySelector('[data-testid="connection-trace"]');
      const casing = container.querySelector('[data-testid="connection-casing"]');

      // data-connector-type falls back to canonical 'dataflow'
      const connectorType = rootGroup?.getAttribute('data-connector-type');
      expect(connectorType).toBe('dataflow');

      // Trace/casing widths match dataflow defaults (strokeWidth=2.5)
      expect(trace?.getAttribute('stroke-width')).toBe('2.5');
      expect(casing?.getAttribute('stroke-width')).toBe('5');
      expect(trace?.getAttribute('stroke-dasharray')).toBeNull();

      // Packet flow uses dataflow semantic color, not generic cyan
      const packetCore = container.querySelector('[data-layer="packet-core"]');
      expect(packetCore).toBeInTheDocument();
      // Dataflow core color is #FCD34D
      expect(packetCore?.getAttribute('fill')).toBe('#FCD34D');
    });

    it('selection outline width scales with type-specific casing width', () => {
      const conn: Connection = {
        ...connection,
        id: 'conn-http-selected',
        metadata: { ...connection.metadata, type: 'http' as ConnectionType },
      };
      useUIStore.setState({ selectedId: conn.id, selectedIds: new Set([conn.id]) });

      const { container } = renderConnector(conn);
      const selectionOutline = container.querySelector('[data-layer="selection-outline"]');
      expect(selectionOutline).toBeInTheDocument();
      // http: selected=highlighted, casing = 4+2.5+1 = 7.5, selection = 7.5+4 = 11.5
      expect(selectionOutline?.getAttribute('stroke-width')).toBe('11.5');
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

    it('renders idle packet flow even when connection has only validation warnings', () => {
      useArchitectureStore.setState({
        validationResult: {
          valid: true,
          errors: [],
          warnings: [
            {
              ruleId: 'suboptimal-connection',
              message: 'This connection pattern is suboptimal',
              targetId: connection.id,
              severity: 'warning',
            },
          ],
        },
      });

      const { container } = renderConnector();
      expect(container.querySelector('[data-testid="packet-flow-layer"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="connection-invalid"]')).not.toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="connection-error-label"]'),
      ).not.toBeInTheDocument();
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
      useUIStore.setState({ selectedId: connection.id, selectedIds: new Set([connection.id]) });
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
      const casingLayer = container.querySelector('[data-layer="casing"]');
      expect(casingLayer).toBeInTheDocument();
      const traceLayer = container.querySelector('[data-layer="trace"]');
      expect(traceLayer).toBeInTheDocument();
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

  it('resolves the connection from store when only connectionId is provided', () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [
            {
              id: 'source-1',
              name: 'Source',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'web_compute',
              category: 'compute',
              provider: 'azure',
              parentId: 'container-1',
              position: { x: 0, y: 0, z: 0 },
              metadata: {},
            },
            {
              id: 'target-1',
              name: 'Target',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'relational_database',
              category: 'data',
              provider: 'azure',
              parentId: 'container-1',
              position: { x: 2, y: 0, z: 2 },
              metadata: {},
            },
          ],
          connections: [connection],
          endpoints: [
            { id: connection.from, blockId: 'source-1', direction: 'output', semantic: 'data' },
            { id: connection.to, blockId: 'target-1', direction: 'input', semantic: 'data' },
          ],
        },
      },
    });

    const { container } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer connectionId={connection.id} originX={100} originY={200} />
      </svg>,
    );

    expect(container.querySelector('[data-testid="connection-trace"]')).toBeInTheDocument();
  });

  it('falls back to parsed endpoint ids when store endpoints are missing', () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          nodes: [
            {
              id: 'source-1',
              name: 'Source',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'web_compute',
              category: 'compute',
              provider: 'azure',
              parentId: 'container-1',
              position: { x: 0, y: 0, z: 0 },
              metadata: {},
            },
            {
              id: 'target-1',
              name: 'Target',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'relational_database',
              category: 'data',
              provider: 'azure',
              parentId: 'container-1',
              position: { x: 2, y: 0, z: 2 },
              metadata: {},
            },
          ],
          connections: [connection],
          endpoints: [],
        },
      },
    });

    const { container } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer connectionId={connection.id} originX={100} originY={200} />
      </svg>,
    );

    expect(container.querySelector('[data-testid="connection-trace"]')).toBeInTheDocument();
  });

  it('returns null when connectionId does not resolve and no connection prop is provided', () => {
    const { container } = render(
      <svg aria-label="Test SVG">
        <title>Test SVG</title>
        <ConnectionRenderer connectionId="missing-connection" originX={100} originY={200} />
      </svg>,
    );

    expect(container.querySelector('g')).toBeNull();
  });
});
