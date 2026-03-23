import { describe, it, expect } from 'vitest';
import { blueprintTheme, workshopTheme, getThemeTokens } from './themeTokens';

describe('themeTokens', () => {
  it('both themes have identical keys', () => {
    const blueprintKeys = Object.keys(blueprintTheme).sort();
    const workshopKeys = Object.keys(workshopTheme).sort();
    expect(blueprintKeys).toEqual(workshopKeys);
  });

  it('no theme value is empty', () => {
    for (const [key, value] of Object.entries(blueprintTheme)) {
      expect(value, `blueprint.${key}`).toBeTruthy();
    }
    for (const [key, value] of Object.entries(workshopTheme)) {
      expect(value, `workshop.${key}`).toBeTruthy();
    }
  });

  it('getThemeTokens returns correct theme', () => {
    expect(getThemeTokens('blueprint')).toBe(blueprintTheme);
    expect(getThemeTokens('workshop')).toBe(workshopTheme);
  });

  it('category colors are shared across themes', () => {
    expect(blueprintTheme['cat-network']).toBe(workshopTheme['cat-network']);
    expect(blueprintTheme['cat-security']).toBe(workshopTheme['cat-security']);
    expect(blueprintTheme['cat-compute']).toBe(workshopTheme['cat-compute']);
    expect(blueprintTheme['cat-data']).toBe(workshopTheme['cat-data']);
    expect(blueprintTheme['cat-delivery']).toBe(workshopTheme['cat-delivery']);
    expect(blueprintTheme['cat-identity']).toBe(workshopTheme['cat-identity']);
    expect(blueprintTheme['cat-messaging']).toBe(workshopTheme['cat-messaging']);
    expect(blueprintTheme['cat-operations']).toBe(workshopTheme['cat-operations']);
  });
});
