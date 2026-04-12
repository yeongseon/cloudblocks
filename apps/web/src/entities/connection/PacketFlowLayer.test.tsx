import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PacketFlowLayer } from './PacketFlowLayer';
import { getPacketCount, getPositionAtDistance } from './packetFlowHelpers';
import {
  IDLE_CYCLE_MS,
  MEDIUM_PATH_THRESHOLD,
  PACKET_SPEED_MS,
  SHORT_PATH_THRESHOLD,
} from './packetFlowTokens';

const useAnimationClockMock = vi.fn(() => ({ elapsed: 0, reducedMotion: false }));

vi.mock('../../shared/hooks/useAnimationClock', () => ({
  useAnimationClock: () => useAnimationClockMock(),
}));

const hitPoints = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
];

function renderLayer(mode: 'static' | 'idle' | 'hover' | 'selected' | 'creation') {
  return render(
    <svg aria-label="packet-flow-test">
      <title>packet-flow-test</title>
      <PacketFlowLayer
        hitPoints={hitPoints}
        mode={mode}
        connectionType="dataflow"
        strokeColor="#22d3ee"
      />
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
  it('returns null in static mode', () => {
    const { container } = renderLayer('static');

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).not.toBeInTheDocument();
  });

  it('returns null when reduced motion is enabled', () => {
    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: true });

    const { container } = renderLayer('selected');

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).not.toBeInTheDocument();
    useAnimationClockMock.mockReturnValue({ elapsed: 0, reducedMotion: false });
  });

  it('renders fewer packets in hover mode than selected mode', () => {
    const hover = renderLayer('hover');
    const hoverPackets = hover.container.querySelectorAll('[data-testid="packet-flow-packet"]');
    expect(hoverPackets).toHaveLength(2);

    hover.unmount();

    const selected = renderLayer('selected');
    const selectedPackets = selected.container.querySelectorAll(
      '[data-testid="packet-flow-packet"]',
    );
    expect(selectedPackets).toHaveLength(3);
  });

  it('renders packets in idle mode', () => {
    const { container } = renderLayer('idle');

    const packets = container.querySelectorAll('[data-testid="packet-flow-packet"]');
    expect(packets).toHaveLength(2);

    const firstPacketGlow = packets[0]?.querySelector('path');
    expect(firstPacketGlow).toHaveAttribute('fill-opacity', '0.25');
  });

  it('idle mode uses slower speed', () => {
    useAnimationClockMock.mockReturnValue({ elapsed: PACKET_SPEED_MS / 2, reducedMotion: false });

    const idle = renderLayer('idle');
    const idlePacket = idle.container.querySelector('[data-testid="packet-flow-packet"]');
    expect(idlePacket).toBeInTheDocument();
    const idleTransform = idlePacket?.getAttribute('transform');
    expect(idleTransform).toBeTruthy();
    const idleX = extractTranslateX(idleTransform ?? '');

    idle.unmount();

    const hover = renderLayer('hover');
    const hoverPacket = hover.container.querySelector('[data-testid="packet-flow-packet"]');
    expect(hoverPacket).toBeInTheDocument();
    const hoverTransform = hoverPacket?.getAttribute('transform');
    expect(hoverTransform).toBeTruthy();
    const hoverX = extractTranslateX(hoverTransform ?? '');
    const expectedIdleProgress = PACKET_SPEED_MS / 2 / IDLE_CYCLE_MS;
    const expectedIdleX = expectedIdleProgress * 200;

    expect(idleX).toBeLessThan(hoverX);
    expect(idleX).toBeCloseTo(expectedIdleX, 1);
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
        <PacketFlowLayer
          hitPoints={[{ x: 0, y: 0 }]}
          mode="selected"
          connectionType="dataflow"
          strokeColor="#22d3ee"
        />
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
          strokeColor="#22d3ee"
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
          strokeColor="#22d3ee"
        />
      </svg>,
    );

    expect(container.querySelector('[data-testid="packet-flow-layer"]')).not.toBeInTheDocument();
  });

  describe('getPacketCount', () => {
    it('returns 0 for static mode', () => {
      expect(getPacketCount(100, 'static')).toBe(0);
      expect(getPacketCount(0, 'static')).toBe(0);
    });

    it('returns base count for selected mode (short path)', () => {
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'selected')).toBe(1);
    });

    it('returns base count for selected mode (medium path)', () => {
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD - 1, 'selected')).toBe(2);
    });

    it('returns base count for selected mode (long path)', () => {
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'selected')).toBe(3);
    });

    it('returns fewer packets for hover mode', () => {
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'hover')).toBe(2);
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'hover')).toBe(1);
    });

    it('returns fewer packets for idle mode', () => {
      expect(getPacketCount(SHORT_PATH_THRESHOLD, 'idle')).toBe(1);
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD, 'idle')).toBe(1);
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'idle')).toBe(2);
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'idle')).toBe(1);
    });

    it('returns more packets for creation mode', () => {
      expect(getPacketCount(MEDIUM_PATH_THRESHOLD + 1, 'creation')).toBe(4);
      expect(getPacketCount(SHORT_PATH_THRESHOLD - 1, 'creation')).toBe(2);
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
