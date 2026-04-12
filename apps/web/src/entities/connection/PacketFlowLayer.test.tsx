import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PacketFlowLayer } from './PacketFlowLayer';
import { PACKET_SPEED_MS } from './packetFlowTokens';

const useAnimationClockMock = vi.fn(() => ({ elapsed: 0, reducedMotion: false }));

vi.mock('../../shared/hooks/useAnimationClock', () => ({
  useAnimationClock: () => useAnimationClockMock(),
}));

const hitPoints = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
];

function renderLayer(mode: 'static' | 'hover' | 'selected' | 'creation') {
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
});
