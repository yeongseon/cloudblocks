import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BlockSvg } from '../BlockSvg';
import type { PortInteraction } from '../BlockSvg';

describe('BlockSvg port interaction', () => {
  const mockPointerDown = vi.fn();
  const mockPointerEnter = vi.fn();
  const mockPointerLeave = vi.fn();

  beforeEach(() => {
    mockPointerDown.mockClear();
    mockPointerEnter.mockClear();
    mockPointerLeave.mockClear();
  });

  it('calls onPortPointerDown when port is pointer-downed', () => {
    const { container } = render(
      <BlockSvg category="compute" showStubs onPortPointerDown={mockPointerDown} />,
    );

    const outDot0 = container.querySelector('[data-testid="stub-dot-out-0"]')!;
    fireEvent.pointerDown(outDot0);

    expect(mockPointerDown).toHaveBeenCalledOnce();
    const [port] = mockPointerDown.mock.calls[0] as [PortInteraction, unknown];
    expect(port.side).toBe('outbound');
    expect(port.index).toBe(0);
    expect(port.semantic).toBe('http');
  });

  it('calls onPortPointerDown for inbound ports', () => {
    const { container } = render(
      <BlockSvg category="compute" showStubs onPortPointerDown={mockPointerDown} />,
    );

    const inDot1 = container.querySelector('[data-testid="stub-dot-in-1"]')!;
    fireEvent.pointerDown(inDot1);

    expect(mockPointerDown).toHaveBeenCalledOnce();
    const [port] = mockPointerDown.mock.calls[0] as [PortInteraction, unknown];
    expect(port.side).toBe('inbound');
    expect(port.index).toBe(1);
    expect(port.semantic).toBe('event');
  });

  it('calls onPortPointerEnter when port is hovered', () => {
    const { container } = render(
      <BlockSvg category="compute" onPortPointerEnter={mockPointerEnter} />,
    );

    const outDot0 = container.querySelector('[data-testid="stub-dot-out-0"]')!;
    fireEvent.pointerEnter(outDot0);

    expect(mockPointerEnter).toHaveBeenCalledOnce();
    const [port] = mockPointerEnter.mock.calls[0] as [PortInteraction];
    expect(port.side).toBe('outbound');
    expect(port.index).toBe(0);
    expect(port.semantic).toBe('http');
  });

  it('calls onPortPointerLeave when pointer leaves port', () => {
    const { container } = render(
      <BlockSvg category="compute" onPortPointerLeave={mockPointerLeave} />,
    );

    const inDot0 = container.querySelector('[data-testid="stub-dot-in-0"]')!;
    fireEvent.pointerLeave(inDot0);

    expect(mockPointerLeave).toHaveBeenCalledOnce();
  });

  it('applies hover glow scale when hoveredPort matches', () => {
    const { container } = render(<BlockSvg category="compute" hoveredPort="out-0" />);

    // When hovered, the glow polygon should be rendered even without showStubs
    const glow = container.querySelector('[data-testid="stub-glow-out-0"]');
    expect(glow).not.toBeNull();
    // Glow opacity should be 0.8 for hovered port
    expect(glow).toHaveAttribute('opacity', '0.8');
  });

  it('does not show glow for non-hovered ports without showStubs', () => {
    const { container } = render(<BlockSvg category="compute" hoveredPort="out-0" />);

    // Port out-1 is not hovered and showStubs is false, so no glow
    const glow1 = container.querySelector('[data-testid="stub-glow-out-1"]');
    expect(glow1).toBeNull();
  });

  it('port dots have crosshair cursor style', () => {
    const { container } = render(
      <BlockSvg category="compute" onPortPointerDown={mockPointerDown} />,
    );

    const outDot0 = container.querySelector('[data-testid="stub-dot-out-0"]') as SVGElement;
    expect(outDot0.style.cursor).toBe('crosshair');
  });

  it('port dots have pointer-events: all', () => {
    const { container } = render(
      <BlockSvg category="compute" onPortPointerDown={mockPointerDown} />,
    );

    const outDot0 = container.querySelector('[data-testid="stub-dot-out-0"]') as SVGElement;
    expect(outDot0.style.pointerEvents).toBe('all');
  });
});
