import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PacketFlowLayer } from './PacketFlowLayer';
import { getPacketCount, getPositionAtDistance } from './packetFlowHelpers';
import {
  MEDIUM_PATH_THRESHOLD,
  PACKET_SELECTED_SCALE,
  PACKET_SPEED_HOVER_MS,
  PACKET_SPEED_INVALID_MS,
  PACKET_SPEED_MS,
  PACKET_SPEED_SELECTED_MS,
  SHORT_PATH_THRESHOLD,
} from './packetFlowTokens';
import type { ScreenPoint } from '../../shared/utils/isometric';

const useAnimationClockMock = vi.fn(() => ({ elapsed: 0, reducedMotion: false }));

vi.mock('../../shared/hooks/useAnimationClock', () => ({
  useAnimationClock: () => useAnimationClockMock(),
}));

const hitPoints = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
];

const straightLine: ScreenPoint[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
];

function renderLayer(mode: 'static' | 'idle' | 'hover' | 'selected' | 'creation' | 'invalid') {
  return render(
    <svg aria-label="packet-flow-test">
      <title>packet-flow-test</title>
      <PacketFlowLayer hitPoints={hitPoints} mode={mode} connectionType="dataflow" />
    </svg>,
  );
}

function extractTranslateX(transform: string): number {
  const match = /translate\(([-\d.]+)\s+([-\d.]+)\)/.exec(transform);
  if (!match) {
    throw new Error(`Unexpected transform: ${transform}`);
  }
  return Number(match[1]);
}

describe('PacketFlowLayer', () => {
  describe('packet flow oracle findings coverage', () => {
    it('renders packet-flow-layer with data-connection-type in active mode', () => {
      const { container } = render(
        <svg aria-label="packet-flow-test">
          <title>packet-flow-test</title>
          <PacketFlowLayer hitPoints={straightLine} mode="idle" connectionType="http" />
        </svg>,
      );

      const layer = container.querySelector('[data-testid="packet-flow-layer"]');
      expect(layer).toBeInTheDocument();
      expect(layer?.getAttribute('data-connection-type')).toBe('http');
    });

    it('scales static chevron count by path length in reduced motion mode', () => {
      const shortPath: ScreenPoint[] = [
        { x: 0, y: 0 },
        { x: 120, y: 0 },
      ];
      const longPath: ScreenPoint[] = [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
      ];

      const shortRender = render(
        <svg aria-label="packet-flow-test">
          <title>packet-flow-test</title>
          <PacketFlowLayer
            hitPoints={shortPath}
            mode="selected"
            connectionType="dataflow"
            reducedMotion={true}
          />
        </svg>,
      );
      const shortCount = shortRender.container.querySelectorAll(
        '[data-testid="packet-direction-chevron"]',
      ).length;
      shortRender.unmount();

      const longRender = render(
        <svg aria-label="packet-flow-test">
          <title>packet-flow-test</title>
          <PacketFlowLayer
            hitPoints={longPath}
            mode="selected"
            connectionType="dataflow"
            reducedMotion={true}
          />
        </svg>,
      );
      const longCount = longRender.container.querySelectorAll(
        '[data-testid="packet-direction-chevron"]',
      ).length;

      expect(shortCount).toBe(1);
      expect(longCount).toBeGreaterThan(shortCount);
    });

    it('applies inverse zoom compensation scale when canvasZoom is below 1', () => {
      const { container } = render(
        <svg aria-label="packet-flow-test">
          <title>packet-flow-test</title>
          <PacketFlowLayer
            hitPoints={straightLine}
            mode="hover"
            connectionType="dataflow"
            elapsed={100}
            canvasZoom={0.5}
          />
        </svg>,
      );

      const packet = container.querySelector('[data-testid="packet-flow-packet"]');
      expect(packet).toBeInTheDocument();
      expect(packet?.getAttribute('transform')).toContain('scale(2)');
    });

    it('applies PACKET_SELECTED_SCALE when mode is selected', () => {
      const { container } = render(
        <svg aria-label="packet-flow-test">
          <title>packet-flow-test</title>
          <PacketFlowLayer
            hitPoints={straightLine}
            mode="selected"
            connectionType="dataflow"
            elapsed={100}
          />
        </svg>,
      );

      const packet = container.querySelector('[data-testid="packet-flow-packet"]');
      expect(packet).toBeInTheDocument();
      expect(packet?.getAttribute('transform')).toContain(`scale(${PACKET_SELECTED_SCALE})`);
    });

    it('caps combined packet scale at 3.0 when zoomed far out', () => {
      const { container } = render(
        <svg aria-label="packet-flow-test">
          <title>packet-flow-test</title>
          <PacketFlowLayer
            hitPoints={straightLine}
            mode="selected"
            connectionType="dataflow"
            elapsed={100}
            canvasZoom={0.1}
          />
        </svg>,
      );

      const packet = container.querySelector('[data-testid="packet-flow-packet"]');
      expect(packet).toBeInTheDocument();
      const transform = packet?.getAttribute('transform') ?? '';
      expect(transform).toContain('scale(3)');
    });
  });

  it('returns null in static mode', () => {
    const { container } = renderLayer('static');

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).not.toBeInTheDocument();
  });

  it('renders static chevrons when reduced motion is enabled', () => {
    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: true });

    const { container } = renderLayer('selected');

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-testid="packet-direction-chevron"]').length,
    ).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="packet-flow-packet"]')).not.toBeInTheDocument();
    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: false });
  });

  it('renders fewer packets in hover mode than selected mode', () => {
    const hover = renderLayer('hover');
    const hoverPackets = hover.container.querySelectorAll('[data-testid="packet-flow-packet"]');
    expect(hoverPackets).toHaveLength(3);

    hover.unmount();

    const selected = renderLayer('selected');
    const selectedPackets = selected.container.querySelectorAll(
      '[data-testid="packet-flow-packet"]',
    );
    expect(selectedPackets).toHaveLength(5);
  });

  it('does not render packets in idle mode', () => {
    const { container } = renderLayer('idle');

    const packets = container.querySelectorAll('[data-testid="packet-flow-packet"]');
    expect(packets).toHaveLength(0);
  });

  it('selected mode uses faster speed than hover mode', () => {
    useAnimationClockMock.mockReturnValue({
      elapsed: PACKET_SPEED_HOVER_MS / 2,
      reducedMotion: false,
    });
    const hover = renderLayer('hover');
    const hoverPacket = hover.container.querySelector('[data-testid="packet-flow-packet"]');
    expect(hoverPacket).toBeInTheDocument();
    const hoverTransform = hoverPacket?.getAttribute('transform');
    expect(hoverTransform).toBeTruthy();
    const hoverX = extractTranslateX(hoverTransform ?? '');

    hover.unmount();

    const selected = renderLayer('selected');
    const selectedPacket = selected.container.querySelector('[data-testid="packet-flow-packet"]');
    expect(selectedPacket).toBeInTheDocument();
    const selectedTransform = selectedPacket?.getAttribute('transform');
    expect(selectedTransform).toBeTruthy();
    const selectedX = extractTranslateX(selectedTransform ?? '');
    const expectedSelectedProgress = PACKET_SPEED_HOVER_MS / 2 / PACKET_SPEED_SELECTED_MS;
    const expectedSelectedX = (expectedSelectedProgress % 1) * 200;

    expect(selectedX).toBeGreaterThan(hoverX);
    expect(selectedX).toBeCloseTo(expectedSelectedX, 1);
    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: false });
  });

  it('invalid mode uses invalid color and fast invalid speed', () => {
    useAnimationClockMock.mockReturnValue({
      elapsed: PACKET_SPEED_INVALID_MS / 2,
      reducedMotion: false,
    });

    const { container } = renderLayer('invalid');
    const packet = container.querySelector('[data-testid="packet-flow-packet"]');
    expect(packet).toBeInTheDocument();

    const core = packet?.querySelector('[data-layer="packet-core"]');
    const halo = packet?.querySelector('[data-layer="packet-halo"]');
    expect(core?.getAttribute('fill')).toBe('#ef4444');
    expect(halo?.getAttribute('fill')).toBe('#DC2626');

    const transform = packet?.getAttribute('transform');
    expect(transform).toBeTruthy();
    const packetX = extractTranslateX(transform ?? '');
    expect(packetX).toBeCloseTo(100, 1);

    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: false });
  });

  it('renders the creation packet count for the path length', () => {
    const { container } = renderLayer('creation');

    const packets = container.querySelectorAll('[data-testid="packet-flow-packet"]');
    expect(packets).toHaveLength(4);
  });

  it('stops rendering creation packets after one pass', () => {
    useAnimationClockMock.mockReturnValue({ elapsed: PACKET_SPEED_MS + 1, reducedMotion: false });

    const { container } = renderLayer('creation');

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).not.toBeInTheDocument();
    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: false });
  });

  it('returns null when hitPoints has fewer than 2 points', () => {
    const { container } = render(
      <svg aria-label="packet-flow-test">
        <title>packet-flow-test</title>
        <PacketFlowLayer hitPoints={[{ x: 0, y: 0 }]} mode="selected" connectionType="dataflow" />
      </svg>,
    );

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).not.toBeInTheDocument();
  });

  it('renders null for individual creation packets that exceed one pass', () => {
    useAnimationClockMock.mockReturnValue({
      elapsed: PACKET_SPEED_MS * 0.8,
      reducedMotion: false,
    });

    const { container } = renderLayer('creation');

    const packets = container.querySelectorAll('[data-testid="packet-flow-packet"]');
    // With elapsed at 0.8 * PACKET_SPEED_MS and 4 packets total,
    // some packets will have rawProgress > 1 and return null
    expect(packets.length).toBeLessThan(4);

    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: false });
  });

  it('handles zero-length segments in hitPoints', () => {
    const { container } = render(
      <svg aria-label="packet-flow-test">
        <title>packet-flow-test</title>
        <PacketFlowLayer
          hitPoints={[
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ]}
          mode="selected"
          connectionType="dataflow"
        />
      </svg>,
    );

    // Verify that the layer renders (doesn't crash) even with zero-length segments
    const layer = container.querySelector('[data-testid="packet-flow-layer"]');
    expect(layer).toBeInTheDocument();
  });

  it('handles path where getPositionAtDistance falls through all segments', () => {
    useAnimationClockMock.mockReturnValue({
      elapsed: PACKET_SPEED_MS * 10,
      reducedMotion: false,
    });

    const { container } = renderLayer('selected');

    // Verify packets still render at the end position
    const packets = container.querySelectorAll('[data-testid="packet-flow-packet"]');
    expect(packets.length).toBeGreaterThan(0);

    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: false });
  });

  it('returns null when totalLength is zero', () => {
    const { container } = render(
      <svg aria-label="packet-flow-test">
        <title>packet-flow-test</title>
        <PacketFlowLayer
          hitPoints={[
            { x: 5, y: 5 },
            { x: 5, y: 5 },
          ]}
          mode="selected"
          connectionType="dataflow"
        />
      </svg>,
    );

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).not.toBeInTheDocument();
  });

  it('falls back to default color for prototype-chain keys like toString', () => {
    const { container } = render(
      <svg aria-label="packet-flow-test">
        <title>packet-flow-test</title>
        <PacketFlowLayer hitPoints={hitPoints} mode="hover" connectionType="toString" />
      </svg>,
    );

    const layer = container.querySelector('[data-testid="packet-flow-layer"]');
    expect(layer).toBeInTheDocument();

    // Should use the default PACKET_COLOR (#22d3ee) for both halo and core,
    // not crash or pick up Object.prototype.toString
    const packetCore = container.querySelector('[data-layer="packet-core"]');
    expect(packetCore).toBeInTheDocument();
    expect(packetCore?.getAttribute('fill')).toBe('#22d3ee');
  });

  describe('getPacketCount', () => {
    it('returns 0 for static mode', () => {
      expect(getPacketCount(100, 'static')).toBe(0);
      expect(getPacketCount(0, 'static')).toBe(0);
    });

    it('returns base count for selected mode (short path)', () => {
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'selected')).toBe(2);
    });

    it('returns base count for selected mode (medium path)', () => {
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD - 1, 'selected')).toBe(4);
    });

    it('returns base count for selected mode (long path)', () => {
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'selected')).toBe(4);
    });

    it('returns fewer packets for hover mode', () => {
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'hover')).toBe(3);
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'hover')).toBe(1);
    });

    it('returns zero packets for idle mode', () => {
      expect(getPacketCount(SHORT_PATH_THRESHOLD, 'idle')).toBe(0);
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD, 'idle')).toBe(0);
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'idle')).toBe(0);
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'idle')).toBe(0);
    });

    it('returns hover-equivalent packet counts for invalid mode', () => {
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'invalid')).toBe(1);
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD - 1, 'invalid')).toBe(2);
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'invalid')).toBe(3);
    });

    it('returns more packets for creation mode', () => {
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'creation')).toBe(4);
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'creation')).toBe(1);
    });

    it('applies spacing guard for very short paths', () => {
      expect(getPacketCount(20, 'selected')).toBe(2);
      expect(getPacketCount(20, 'creation')).toBe(1);
    });
  });

  describe('getPositionAtDistance', () => {
    const segments = [
      { start: { x: 0, y: 0 }, dx: 100, dy: 0, length: 100, cumulativeStart: 0 },
      { start: { x: 100, y: 0 }, dx: 0, dy: 100, length: 100, cumulativeStart: 100 },
    ];

    it('returns null for empty segments', () => {
      expect(getPositionAtDistance([], 0, 0)).toBeNull();
    });

    it('returns null when totalLength is zero', () => {
      expect(getPositionAtDistance(segments, 0, 50)).toBeNull();
    });

    it('returns position at the start of the path', () => {
      const pos = getPositionAtDistance(segments, 200, 0);
      expect(pos).toEqual({ x: 0, y: 0, angle: 0 });
    });

    it('returns position in the middle of first segment', () => {
      const pos = getPositionAtDistance(segments, 200, 50);
      expect(pos).not.toBeNull();
      expect(pos!.x).toBeCloseTo(50, 1);
      expect(pos!.y).toBeCloseTo(0, 1);
    });

    it('returns position in the second segment', () => {
      const pos = getPositionAtDistance(segments, 200, 150);
      expect(pos).not.toBeNull();
      expect(pos!.x).toBeCloseTo(100, 1);
      expect(pos!.y).toBeCloseTo(50, 1);
    });

    it('falls back to last segment end when distance exceeds all segments', () => {
      // Create segments where the loop won't match (distance beyond cumulativeEnd)
      const gapSegments = [
        { start: { x: 0, y: 0 }, dx: 10, dy: 0, length: 10, cumulativeStart: 0 },
      ];
      // totalLength > sum of segment lengths — forces fallthrough past the loop
      const pos = getPositionAtDistance(gapSegments, 100, 100);
      // Since clampedDistance=100 > segmentEnd=10, the loop exits, fallback returns last segment end
      expect(pos).not.toBeNull();
      expect(pos!.x).toBeCloseTo(10, 1);
      expect(pos!.y).toBeCloseTo(0, 1);
    });

    it('handles zero-length segment by using t=0', () => {
      const zeroSegments = [{ start: { x: 5, y: 5 }, dx: 0, dy: 0, length: 0, cumulativeStart: 0 }];
      // totalLength must be > 0 for the function to not bail early
      const pos = getPositionAtDistance(zeroSegments, 1, 0);
      // clamped=0 <= segmentEnd=0, so t = length > 0 ? ... : 0 → t=0
      expect(pos).not.toBeNull();
      expect(pos!.x).toBe(5);
      expect(pos!.y).toBe(5);
    });
  });
});
