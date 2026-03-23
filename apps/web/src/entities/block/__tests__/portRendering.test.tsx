import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { BlockSvg } from '../BlockSvg';
import { stubIndexToSemantic } from '../blockGeometry';
import {
  PORT_COLOR_HTTP,
  PORT_COLOR_EVENT,
  PORT_COLOR_DATA,
  PORT_COLOR_OCCUPIED,
} from '../../../shared/tokens/designTokens';

// ---------------------------------------------------------------------------
// stubIndexToSemantic
// ---------------------------------------------------------------------------

describe('stubIndexToSemantic', () => {
  it('maps index 0 to http', () => {
    expect(stubIndexToSemantic(0)).toBe('http');
  });

  it('maps index 1 to event', () => {
    expect(stubIndexToSemantic(1)).toBe('event');
  });

  it('maps index 2 to data', () => {
    expect(stubIndexToSemantic(2)).toBe('data');
  });

  it('wraps around for index >= 3', () => {
    expect(stubIndexToSemantic(3)).toBe('http');
    expect(stubIndexToSemantic(4)).toBe('event');
    expect(stubIndexToSemantic(5)).toBe('data');
  });
});

// ---------------------------------------------------------------------------
// Port semantic colors (BlockSvg showStubs=true)
// ---------------------------------------------------------------------------

describe('BlockSvg port semantic colors', () => {
  it('renders stub dots with semantic colors when showStubs=true', () => {
    // compute: 2 inbound (http, event) + 2 outbound (http, event)
    const { container } = render(<BlockSvg category="compute" showStubs />);
    const stubDots = container.querySelector('[data-testid="stub-dots"]')!;

    const inDot0 = stubDots.querySelector('[data-testid="stub-dot-in-0"]')!;
    const inDot1 = stubDots.querySelector('[data-testid="stub-dot-in-1"]')!;
    const outDot0 = stubDots.querySelector('[data-testid="stub-dot-out-0"]')!;
    const outDot1 = stubDots.querySelector('[data-testid="stub-dot-out-1"]')!;

    // Index 0 → http (blue), index 1 → event (amber)
    expect(inDot0).toHaveAttribute('fill', PORT_COLOR_HTTP);
    expect(inDot0).toHaveAttribute('data-semantic', 'http');
    expect(inDot1).toHaveAttribute('fill', PORT_COLOR_EVENT);
    expect(inDot1).toHaveAttribute('data-semantic', 'event');
    expect(outDot0).toHaveAttribute('fill', PORT_COLOR_HTTP);
    expect(outDot1).toHaveAttribute('fill', PORT_COLOR_EVENT);
  });

  it('renders muted gray color when showStubs=false', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const inDot0 = container.querySelector('[data-testid="stub-dot-in-0"]')!;
    expect(inDot0).toHaveAttribute('fill', '#94a3b8');
  });

  it('renders all three semantic colors for data category (2 inbound: http + event)', () => {
    // data: 2 inbound, 1 outbound
    const { container } = render(<BlockSvg category="data" showStubs />);
    const inDot0 = container.querySelector('[data-testid="stub-dot-in-0"]')!;
    const inDot1 = container.querySelector('[data-testid="stub-dot-in-1"]')!;
    const outDot0 = container.querySelector('[data-testid="stub-dot-out-0"]')!;

    expect(inDot0).toHaveAttribute('fill', PORT_COLOR_HTTP);
    expect(inDot1).toHaveAttribute('fill', PORT_COLOR_EVENT);
    expect(outDot0).toHaveAttribute('fill', PORT_COLOR_HTTP);
  });

  it('sets data-semantic attribute on all stub dots', () => {
    const { container } = render(<BlockSvg category="compute" showStubs />);
    const dots = container.querySelectorAll('[data-semantic]');
    expect(dots.length).toBe(4); // 2 in + 2 out for compute
    expect(dots[0]).toHaveAttribute('data-semantic', 'http');
    expect(dots[1]).toHaveAttribute('data-semantic', 'event');
  });
});

// ---------------------------------------------------------------------------
// Occupied port dimming
// ---------------------------------------------------------------------------

describe('BlockSvg occupied port dimming', () => {
  it('renders occupied ports in dimmed color', () => {
    const occupied = new Set(['input-http']);
    const { container } = render(
      <BlockSvg category="compute" showStubs occupiedEndpointSemantics={occupied} />,
    );
    const inDot0 = container.querySelector('[data-testid="stub-dot-in-0"]')!;
    expect(inDot0).toHaveAttribute('fill', PORT_COLOR_OCCUPIED);
    expect(inDot0).toHaveAttribute('data-occupied', 'true');
  });

  it('does not dim unoccupied ports', () => {
    const occupied = new Set(['input-http']);
    const { container } = render(
      <BlockSvg category="compute" showStubs occupiedEndpointSemantics={occupied} />,
    );
    const inDot1 = container.querySelector('[data-testid="stub-dot-in-1"]')!;
    expect(inDot1).toHaveAttribute('fill', PORT_COLOR_EVENT);
    expect(inDot1).toHaveAttribute('data-occupied', 'false');
  });

  it('dims output ports when occupied', () => {
    const occupied = new Set(['output-http', 'output-event']);
    const { container } = render(
      <BlockSvg category="compute" showStubs occupiedEndpointSemantics={occupied} />,
    );
    const outDot0 = container.querySelector('[data-testid="stub-dot-out-0"]')!;
    const outDot1 = container.querySelector('[data-testid="stub-dot-out-1"]')!;
    expect(outDot0).toHaveAttribute('fill', PORT_COLOR_OCCUPIED);
    expect(outDot1).toHaveAttribute('fill', PORT_COLOR_OCCUPIED);
  });

  it('uses semantic color when no occupiedEndpointSemantics provided', () => {
    const { container } = render(<BlockSvg category="compute" showStubs />);
    const inDot0 = container.querySelector('[data-testid="stub-dot-in-0"]')!;
    expect(inDot0).toHaveAttribute('fill', PORT_COLOR_HTTP);
    expect(inDot0).toHaveAttribute('data-occupied', 'false');
  });
});

// ---------------------------------------------------------------------------
// Port glow filter (connect mode)
// ---------------------------------------------------------------------------

describe('BlockSvg port glow', () => {
  it('renders glow filter def when showStubs=true', () => {
    const { container } = render(<BlockSvg category="compute" showStubs />);
    const filters = container.querySelectorAll('filter');
    const glowFilter = Array.from(filters).find((f) => f.id.startsWith('port-glow-'));
    expect(glowFilter).not.toBeUndefined();
  });

  it('always renders glow filter def (needed for port hover glow)', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const filters = container.querySelectorAll('filter');
    const glowFilter = Array.from(filters).find((f) => f.id.startsWith('port-glow-'));
    expect(glowFilter).not.toBeUndefined();
  });

  it('renders glow polygons behind unoccupied stubs when showStubs=true', () => {
    const { container } = render(<BlockSvg category="compute" showStubs />);
    // compute: 2 inbound + 2 outbound unoccupied = 4 glow polygons
    const glowIn = container.querySelectorAll('[data-testid^="stub-glow-in-"]');
    const glowOut = container.querySelectorAll('[data-testid^="stub-glow-out-"]');
    expect(glowIn.length).toBe(2);
    expect(glowOut.length).toBe(2);
  });

  it('does not render glow for occupied ports', () => {
    const occupied = new Set(['input-http', 'output-http']);
    const { container } = render(
      <BlockSvg category="compute" showStubs occupiedEndpointSemantics={occupied} />,
    );
    // Only index 1 (event) should have glow, index 0 (http) is occupied
    const glowIn = container.querySelectorAll('[data-testid^="stub-glow-in-"]');
    const glowOut = container.querySelectorAll('[data-testid^="stub-glow-out-"]');
    expect(glowIn.length).toBe(1); // only event
    expect(glowOut.length).toBe(1); // only event
  });

  it('no glow polygons when showStubs=false', () => {
    const { container } = render(<BlockSvg category="compute" />);
    const glows = container.querySelectorAll('[data-testid^="stub-glow-"]');
    expect(glows.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Port color tokens exist
// ---------------------------------------------------------------------------

describe('Port color design tokens', () => {
  it('exports correct semantic color values', () => {
    expect(PORT_COLOR_HTTP).toBe('#3B82F6');
    expect(PORT_COLOR_EVENT).toBe('#F59E0B');
    expect(PORT_COLOR_DATA).toBe('#14B8A6');
    expect(PORT_COLOR_OCCUPIED).toBe('#475569');
  });
});
