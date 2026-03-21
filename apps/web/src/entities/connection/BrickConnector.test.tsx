import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { BrickConnector } from './BrickConnector';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getEndpointWorldPosition } from '../../shared/utils/position';
import { worldToScreen } from '../../shared/utils/isometric';
import { getDiffState } from '../../features/diff/engine';
import type { Connection, ConnectionType } from '@cloudblocks/schema';
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

function setupEndpoints(srcScreen = { x: 120, y: 220 }, tgtScreen = { x: 280, y: 320 }) {
  vi.mocked(getEndpointWorldPosition)
    .mockReturnValueOnce([1, 0, 2])
    .mockReturnValueOnce([3, 0, 4]);
  vi.mocked(worldToScreen)
    .mockReturnValueOnce(srcScreen)
    .mockReturnValueOnce(tgtScreen);
}

function renderConnector(conn: Connection = connection) {
  return render(
    <svg><title>Test</title>
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

    const { container } = renderConnector();
    expect(container.querySelector('g')).toBeNull();
  });

  it('returns null when target endpoint position is missing', () => {
    vi.mocked(getEndpointWorldPosition)
      .mockReturnValueOnce([1, 0, 2])
      .mockReturnValueOnce(null);

    const { container } = renderConnector();
    expect(container.querySelector('g')).toBeNull();
  });

  it('renders svg group with polygons and ellipses when endpoints exist', () => {
    setupEndpoints();

    const { container } = renderConnector();

    expect(container.querySelector('g')).toBeInTheDocument();
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(4);
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses).toHaveLength(6);
  });

  it('renders hit area with data-testid', () => {
    setupEndpoints({ x: 100, y: 100 }, { x: 200, y: 200 });

    const { container } = renderConnector();

    expect(container.querySelector('[data-testid="connection-hit-area"]')).toBeInTheDocument();
  });

  it('click in select mode sets selectedId to connection id', () => {
    setupEndpoints({ x: 100, y: 100 }, { x: 200, y: 200 });

    const { container } = renderConnector();

    fireEvent.click(container.querySelector('g') as SVGGElement);
    expect(useUIStore.getState().selectedId).toBe(connection.id);
  });

  it('click in delete mode removes the connection', () => {
    const removeConnectionMock = vi.fn();
    useUIStore.setState({ toolMode: 'delete' });
    useArchitectureStore.setState({ removeConnection: removeConnectionMock });
    setupEndpoints({ x: 100, y: 100 }, { x: 200, y: 200 });

    const { container } = renderConnector();

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
    setupEndpoints({ x: 100, y: 100 }, { x: 200, y: 200 });

    const { container } = renderConnector();

    const polygons = container.querySelectorAll('polygon');
    const topFace = polygons[2];
    expect(topFace?.getAttribute('fill')).toBe('#22c55e');
    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('1');
  });

  it('uses removed diff opacity when diff state is removed', () => {
    useUIStore.setState({ diffMode: true, diffDelta: {} as unknown as DiffDelta });
    vi.mocked(getDiffState).mockReturnValue('removed');
    setupEndpoints({ x: 100, y: 100 }, { x: 200, y: 200 });

    const { container } = renderConnector();

    expect(container.querySelector('g')?.getAttribute('opacity')).toBe('0.4');
  });

  it('renders selection glow when connection is selected', () => {
    useUIStore.setState({ selectedId: connection.id });
    setupEndpoints({ x: 100, y: 100 }, { x: 200, y: 200 });

    const { container } = renderConnector();

    const glowPath = container.querySelectorAll('path')[0];
    expect(glowPath?.getAttribute('stroke')).toBe('#ffffff');
    expect(glowPath?.getAttribute('stroke-opacity')).toBe('0.5');
  });

  it('renders studs at source and target endpoints', () => {
    setupEndpoints({ x: 100, y: 100 }, { x: 200, y: 200 });

    const { container } = renderConnector();

    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses).toHaveLength(6);

    expect(ellipses[0]?.getAttribute('rx')).toBe('12');
    expect(ellipses[0]?.getAttribute('ry')).toBe('6');
    expect(ellipses[2]?.getAttribute('rx')).toBe('7.2');
    expect(ellipses[2]?.getAttribute('ry')).toBe('3.6');
  });

  describe('beam shapes', () => {
    const beamShapeMap: Record<ConnectionType, string> = {
      dataflow: 'standard',
      http: 'doubleRail',
      internal: 'segmented',
      data: 'wide',
      async: 'zigzag',
    };

    for (const [type, beamShape] of Object.entries(beamShapeMap)) {
      it(`renders ${beamShape} beam for ${type} connection type`, () => {
        const conn: Connection = {
          ...connection,
          id: `conn-${type}`,
          type: type as ConnectionType,
        };
        setupEndpoints({ x: 100, y: 100 }, { x: 250, y: 200 });

        const { container } = renderConnector(conn);

        const rootGroup = container.querySelector('g');
        expect(rootGroup).toBeInTheDocument();
        expect(rootGroup?.getAttribute('data-beam-shape')).toBe(beamShape);
      });
    }

    it('standard beam renders 3 polygons per segment (top + 2 sides)', () => {
      setupEndpoints({ x: 100, y: 100 }, { x: 100, y: 250 });

      const { container } = renderConnector({
        ...connection,
        type: 'dataflow',
      });

      const standardBeam = container.querySelector('[data-beam="standard"]');
      expect(standardBeam).toBeInTheDocument();
      expect(standardBeam?.querySelectorAll('polygon')).toHaveLength(3);
    });

    it('doubleRail beam renders 6 polygons per segment (3 per rail × 2)', () => {
      const conn: Connection = { ...connection, id: 'conn-http', type: 'http' };
      setupEndpoints({ x: 100, y: 100 }, { x: 100, y: 250 });

      const { container } = renderConnector(conn);

      const railBeam = container.querySelector('[data-beam="doubleRail"]');
      expect(railBeam).toBeInTheDocument();
      expect(railBeam?.querySelectorAll('polygon')).toHaveLength(6);
    });

    it('segmented beam renders multiple chunks with gaps', () => {
      const conn: Connection = { ...connection, id: 'conn-int', type: 'internal' };
      setupEndpoints({ x: 100, y: 100 }, { x: 100, y: 300 });

      const { container } = renderConnector(conn);

      const segmentedBeam = container.querySelector('[data-beam="segmented"]');
      expect(segmentedBeam).toBeInTheDocument();
      const chunkGroups = segmentedBeam?.querySelectorAll('g');
      expect(chunkGroups?.length).toBeGreaterThanOrEqual(2);
    });

    it('wide beam renders wider polygons than standard', () => {
      const conn: Connection = { ...connection, id: 'conn-data', type: 'data' };
      setupEndpoints({ x: 100, y: 100 }, { x: 100, y: 250 });

      const { container } = renderConnector(conn);

      const wideBeam = container.querySelector('[data-beam="wide"]');
      expect(wideBeam).toBeInTheDocument();
      expect(wideBeam?.querySelectorAll('polygon')).toHaveLength(3);
    });

    it('zigzag beam renders multiple zig-zag sub-segments', () => {
      const conn: Connection = { ...connection, id: 'conn-async', type: 'async' };
      setupEndpoints({ x: 100, y: 100 }, { x: 100, y: 300 });

      const { container } = renderConnector(conn);

      const zigzagBeam = container.querySelector('[data-beam="zigzag"]');
      expect(zigzagBeam).toBeInTheDocument();
      const zigGroups = zigzagBeam?.querySelectorAll('g');
      expect(zigGroups?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('elbow joints', () => {
    it('renders 3D elbow with side faces at bend points', () => {
      setupEndpoints({ x: 100, y: 100 }, { x: 300, y: 250 });

      const { container } = renderConnector();

      const elbowGroups = container.querySelectorAll('[data-elbow]');
      const elbowPolygons = Array.from(elbowGroups).flatMap((g) =>
        Array.from(g.querySelectorAll('polygon')),
      );
      expect(elbowPolygons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('arrow tip', () => {
    it('renders arrow with side face for 3D effect', () => {
      setupEndpoints({ x: 100, y: 100 }, { x: 100, y: 250 });

      const { container } = renderConnector();

      const allPolygons = container.querySelectorAll('polygon');
      expect(allPolygons.length).toBeGreaterThanOrEqual(5);
    });
  });
});
