import { describe, expect, it } from 'vitest';
import type { EndpointSemantic } from '@cloudblocks/schema';
import { portIndexToSemantic } from '../blockGeometry';
import {
  PORT_COLOR_HTTP,
  PORT_COLOR_EVENT,
  PORT_COLOR_DATA,
  PORT_COLOR_OCCUPIED,
  PORT_DOT_RX,
  PORT_DOT_RY,
  PORT_DOT_HEIGHT,
  PORT_DOT_OCCUPIED_OPACITY,
  PORT_DOT_OPACITY,
} from '../../../shared/tokens/designTokens';
import { semanticToPortIndex } from '../../connection/endpointAnchors';

// ---------------------------------------------------------------------------
// portIndexToSemantic
// ---------------------------------------------------------------------------

describe('portIndexToSemantic', () => {
  it('maps index 0 to http', () => {
    expect(portIndexToSemantic(0)).toBe('http');
  });

  it('maps index 1 to event', () => {
    expect(portIndexToSemantic(1)).toBe('event');
  });

  it('maps index 2 to data', () => {
    expect(portIndexToSemantic(2)).toBe('data');
  });

  it('wraps around for index >= 3', () => {
    expect(portIndexToSemantic(3)).toBe('http');
    expect(portIndexToSemantic(4)).toBe('event');
    expect(portIndexToSemantic(5)).toBe('data');
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

// ---------------------------------------------------------------------------
// semanticToPortIndex (exported from endpointAnchors)
// ---------------------------------------------------------------------------

describe('semanticToPortIndex', () => {
  it('maps http to index 0 when total >= 1', () => {
    expect(semanticToPortIndex('http', 3)).toBe(0);
    expect(semanticToPortIndex('http', 1)).toBe(0);
  });

  it('maps event to index 1 when total >= 2', () => {
    expect(semanticToPortIndex('event', 3)).toBe(1);
    expect(semanticToPortIndex('event', 2)).toBe(1);
  });

  it('maps data to index 2 when total >= 3', () => {
    expect(semanticToPortIndex('data', 3)).toBe(2);
  });

  it('wraps indices when total is small', () => {
    // With 1 port total, all semantics map to index 0
    expect(semanticToPortIndex('http', 1)).toBe(0);
    expect(semanticToPortIndex('event', 1)).toBe(0);
    expect(semanticToPortIndex('data', 1)).toBe(0);
  });

  it('returns null for unknown semantic', () => {
    expect(semanticToPortIndex('unknown' as unknown as EndpointSemantic, 3)).toBeNull();
  });

  it('returns null for total <= 0', () => {
    expect(semanticToPortIndex('http', 0)).toBeNull();
    expect(semanticToPortIndex('http', -1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Port glyph design tokens (3-layer spec)
// ---------------------------------------------------------------------------

describe('Port glyph design tokens', () => {
  it('PORT_DOT_RX=12 and PORT_DOT_RY=6 per Universal Port Standard', () => {
    expect(PORT_DOT_RX).toBe(12);
    expect(PORT_DOT_RY).toBe(6);
  });

  it('PORT_DOT_HEIGHT=5 for shadow offset', () => {
    expect(PORT_DOT_HEIGHT).toBe(5);
  });

  it('PORT_DOT_OCCUPIED_OPACITY < PORT_DOT_OPACITY (occupied dimmer)', () => {
    expect(PORT_DOT_OCCUPIED_OPACITY).toBeLessThan(PORT_DOT_OPACITY);
  });

  it('occupied opacity is 0.4 and normal opacity is 0.7', () => {
    expect(PORT_DOT_OCCUPIED_OPACITY).toBe(0.4);
    expect(PORT_DOT_OPACITY).toBe(0.7);
  });
});
