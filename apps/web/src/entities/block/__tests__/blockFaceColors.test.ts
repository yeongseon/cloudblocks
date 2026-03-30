import { describe, expect, it } from 'vitest';

import type { ProviderType, ResourceCategory } from '@cloudblocks/schema';
import {
  darken,
  deriveFaceColors,
  getBlockColor,
  getBlockFaceColors,
  lighten,
  PROVIDER_BRAND_COLOR,
} from '../blockFaceColors';

const providers: ProviderType[] = ['azure', 'aws', 'gcp'];
const categories: ResourceCategory[] = [
  'compute',
  'data',
  'delivery',
  'messaging',
  'identity',
  'operations',
  'security',
  'network',
];

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

// ─── Color Utilities ──────────────────────────────────────────

describe('lighten', () => {
  it('returns the original color at 0%', () => {
    expect(lighten('#000000', 0)).toBe('#000000');
    expect(lighten('#FF0000', 0)).toBe('#FF0000');
  });

  it('returns white at 100%', () => {
    expect(lighten('#000000', 100)).toBe('#FFFFFF');
    expect(lighten('#D86613', 100)).toBe('#FFFFFF');
  });

  it('lightens toward white by the given percent', () => {
    // lighten('#000000', 50) → each channel: 0 + (255-0)*0.5 = 127.5 → 128
    expect(lighten('#000000', 50)).toBe('#808080');
  });

  it('returns valid hex for arbitrary inputs', () => {
    expect(lighten('#D86613', 15)).toMatch(hexColorPattern);
    expect(lighten('#0078D4', 40)).toMatch(hexColorPattern);
  });

  it('handles already-bright colors without exceeding #FFFFFF', () => {
    const result = lighten('#FAFAFA', 50);
    expect(result).toMatch(hexColorPattern);
    // Each channel: 250 + (255-250)*0.5 = 252.5 → 253 → FD
    expect(result).toBe('#FDFDFD');
  });
});

describe('darken', () => {
  it('returns the original color at 0%', () => {
    expect(darken('#FFFFFF', 0)).toBe('#FFFFFF');
    expect(darken('#D86613', 0)).toBe('#D86613');
  });

  it('returns black at 100%', () => {
    expect(darken('#FFFFFF', 100)).toBe('#000000');
    expect(darken('#D86613', 100)).toBe('#000000');
  });

  it('darkens toward black by the given percent', () => {
    // darken('#FFFFFF', 50) → each channel: 255 * 0.5 = 127.5 → 128
    expect(darken('#FFFFFF', 50)).toBe('#808080');
  });

  it('returns valid hex for arbitrary inputs', () => {
    expect(darken('#D86613', 10)).toMatch(hexColorPattern);
    expect(darken('#0078D4', 20)).toMatch(hexColorPattern);
  });
});

// ─── Face Color Derivation (§7.7) ────────────────────────────

describe('deriveFaceColors', () => {
  it('derives matte face colors with expected hex values', () => {
    const base = '#0078D4';
    const derived = deriveFaceColors(base);

    expect(derived.top).toBe('#0A7DD6');
    expect(derived.topStroke).toBe('#006EC3');
    expect(derived.right).toBe('#0071C7');
    expect(derived.left).toBe('#006ABB');
  });

  it('returns all 4 derived properties', () => {
    const derived = deriveFaceColors('#4285F4');
    const keys = Object.keys(derived);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('top');
    expect(keys).toContain('topStroke');
    expect(keys).toContain('right');
    expect(keys).toContain('left');
  });

  it('produces valid hex colors for all derived values', () => {
    const derived = deriveFaceColors('#CD2264');
    for (const value of Object.values(derived)) {
      expect(value).toMatch(hexColorPattern);
    }
  });
});

// ─── Provider Brand Colors ─────────────────────────────────────

describe('PROVIDER_BRAND_COLOR', () => {
  it('contains brand colors for all three providers', () => {
    expect(PROVIDER_BRAND_COLOR).toHaveProperty('aws');
    expect(PROVIDER_BRAND_COLOR).toHaveProperty('azure');
    expect(PROVIDER_BRAND_COLOR).toHaveProperty('gcp');
  });

  it('has correct brand colors', () => {
    expect(PROVIDER_BRAND_COLOR.azure).toBe('#0078D4');
    expect(PROVIDER_BRAND_COLOR.aws).toBe('#D86613');
    expect(PROVIDER_BRAND_COLOR.gcp).toBe('#34A853');
  });

  it('contains only valid hex colors', () => {
    for (const provider of providers) {
      expect(PROVIDER_BRAND_COLOR[provider]).toMatch(hexColorPattern);
    }
  });
});

// ─── Color Lookup ─────────────────────────────────────────────

describe('getBlockColor', () => {
  it('returns a valid hex color for every provider and category', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const color = getBlockColor(provider, undefined, category);
        expect(color).toMatch(hexColorPattern);
      }
    }
  });

  it('returns the same brand color regardless of subtype', () => {
    // All Azure blocks use the same brand color
    expect(getBlockColor('azure', 'functions', 'compute')).toBe('#0078D4');
    expect(getBlockColor('azure', 'cosmos-db', 'data')).toBe('#0078D4');
    expect(getBlockColor('azure', 'sql-database', 'data')).toBe('#0078D4');
    // All AWS blocks use the same brand color
    expect(getBlockColor('aws', 'ec2', 'compute')).toBe('#D86613');
    expect(getBlockColor('aws', 's3', 'data')).toBe('#D86613');
    // All GCP blocks use the same brand color
    expect(getBlockColor('gcp', 'compute-engine', 'compute')).toBe('#34A853');
  });

  it('returns the same color when subtype is undefined', () => {
    expect(getBlockColor('azure', undefined, 'compute')).toBe(PROVIDER_BRAND_COLOR.azure);
    expect(getBlockColor('aws', undefined, 'data')).toBe(PROVIDER_BRAND_COLOR.aws);
    expect(getBlockColor('gcp', undefined, 'network')).toBe(PROVIDER_BRAND_COLOR.gcp);
  });

  it('returns different colors for different providers', () => {
    const awsColor = getBlockColor('aws', undefined, 'compute');
    const azureColor = getBlockColor('azure', undefined, 'compute');
    const gcpColor = getBlockColor('gcp', undefined, 'compute');
    expect(new Set([awsColor, azureColor, gcpColor]).size).toBe(3);
  });
});

// ─── getBlockFaceColors (Backward-Compatible API) ─────────────

describe('getBlockFaceColors', () => {
  it('returns valid face colors for every provider and category pair', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const colors = getBlockFaceColors(category, provider);

        expect(colors).toBeDefined();
        expect(colors.topFaceColor).toMatch(hexColorPattern);
        expect(colors.topFaceStroke).toMatch(hexColorPattern);
        expect(colors.leftSideColor).toMatch(hexColorPattern);
        expect(colors.rightSideColor).toMatch(hexColorPattern);
      }
    }
  });

  it('defaults to azure colors when provider is omitted or undefined', () => {
    for (const category of categories) {
      const azure = getBlockFaceColors(category, 'azure');
      const omittedProvider = getBlockFaceColors(category);
      const undefinedProvider = getBlockFaceColors(category, undefined);

      expect(omittedProvider).toEqual(azure);
      expect(undefinedProvider).toEqual(azure);
    }
  });

  it('topFaceColor equals lighten(base, 4) for that category', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const faceColors = getBlockFaceColors(category, provider);
        const baseColor = getBlockColor(provider, undefined, category);
        expect(faceColors.topFaceColor).toBe(lighten(baseColor, 4));
      }
    }
  });

  it('all categories for a provider return the same face colors', () => {
    for (const provider of providers) {
      const firstColors = getBlockFaceColors(categories[0], provider);
      for (const category of categories.slice(1)) {
        const colors = getBlockFaceColors(category, provider);
        expect(colors).toEqual(firstColors);
      }
    }
  });

  it('subtype does not change colors (uniform brand color)', () => {
    const withSubtype = getBlockFaceColors('data', 'azure', 'cosmos-db');
    const withoutSubtype = getBlockFaceColors('data', 'azure');
    expect(withSubtype).toEqual(withoutSubtype);
  });

  it('side colors are darker than top face color', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const colors = getBlockFaceColors(category, provider);
        const topLuminance = getLuminance(colors.topFaceColor);
        const leftLuminance = getLuminance(colors.leftSideColor);
        const rightLuminance = getLuminance(colors.rightSideColor);

        // Darkened sides should have lower or equal luminance
        expect(leftLuminance).toBeLessThanOrEqual(topLuminance);
        expect(rightLuminance).toBeLessThanOrEqual(topLuminance);
        // Left (darken 12%) should be darker than right (darken 6%)
        expect(leftLuminance).toBeLessThanOrEqual(rightLuminance + 0.001);
      }
    }
  });
});

/**
 * Calculate relative luminance of a hex color for comparison purposes.
 * Standard formula from WCAG 2.0.
 */
function getLuminance(hex: string): number {
  const normalizedHex = hex.replace('#', '');
  const r = Number.parseInt(normalizedHex.substring(0, 2), 16) / 255;
  const g = Number.parseInt(normalizedHex.substring(2, 4), 16) / 255;
  const b = Number.parseInt(normalizedHex.substring(4, 6), 16) / 255;

  const [rs, gs, bs] = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
  );

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
