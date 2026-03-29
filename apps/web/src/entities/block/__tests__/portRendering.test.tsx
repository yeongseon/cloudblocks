import { describe, expect, it } from 'vitest';
import { portIndexToSemantic } from '../blockGeometry';
import {
  PORT_COLOR_HTTP,
  PORT_COLOR_EVENT,
  PORT_COLOR_DATA,
  PORT_COLOR_OCCUPIED,
} from '../../../shared/tokens/designTokens';

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
