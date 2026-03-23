import { describe, expect, it } from 'vitest';
import { lightenColor, CONNECTOR_THEMES, DIFF_THEMES } from './connectorTheme';

describe('lightenColor', () => {
  it('returns same color when amount is 0', () => {
    expect(lightenColor('#000000', 0)).toBe('#000000');
    expect(lightenColor('#ff0000', 0)).toBe('#ff0000');
  });

  it('returns white when amount is 1', () => {
    expect(lightenColor('#000000', 1)).toBe('#ffffff');
    expect(lightenColor('#334155', 1)).toBe('#ffffff');
  });

  it('lightens a color by partial amount', () => {
    expect(lightenColor('#000000', 0.5)).toBe('#808080');
  });

  it('lightens non-black color correctly', () => {
    const result = lightenColor('#64748b', 0.15);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    const r = parseInt(result.slice(1, 3), 16);
    expect(r).toBeGreaterThan(0x64);
  });

  it('clamps at 255', () => {
    const result = lightenColor('#fefefe', 0.5);
    expect(result).toBe('#ffffff');
  });
});

describe('CONNECTOR_THEMES', () => {
  it('defines themes for all 5 connection types', () => {
    expect(Object.keys(CONNECTOR_THEMES)).toEqual([
      'dataflow',
      'http',
      'internal',
      'data',
      'async',
    ]);
  });

  it('each theme has required properties', () => {
    for (const theme of Object.values(CONNECTOR_THEMES)) {
      expect(theme).toHaveProperty('tile');
      expect(theme).toHaveProperty('shadow');
      expect(theme).toHaveProperty('dark');
      expect(theme).toHaveProperty('accent');
      expect(theme).toHaveProperty('pinHoleStyle');
    }
  });

  it('each pinHoleStyle is unique across types', () => {
    const styles = Object.values(CONNECTOR_THEMES).map((t) => t.pinHoleStyle);
    expect(new Set(styles).size).toBe(5);
  });

  it('pinHoleStyle values are valid literals', () => {
    const validStyles = new Set(['open', 'filled', 'cross', 'double', 'dashed']);
    for (const theme of Object.values(CONNECTOR_THEMES)) {
      expect(validStyles.has(theme.pinHoleStyle)).toBe(true);
    }
  });
});

describe('DIFF_THEMES', () => {
  it('defines themes for added, removed, and modified', () => {
    expect(DIFF_THEMES).toHaveProperty('added');
    expect(DIFF_THEMES).toHaveProperty('removed');
    expect(DIFF_THEMES).toHaveProperty('modified');
  });

  it('removed state has reduced opacity', () => {
    expect(DIFF_THEMES.removed.opacity).toBeLessThan(1);
  });
});
