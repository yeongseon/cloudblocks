import { describe, expect, it } from 'vitest';

import type { ProviderType, ResourceCategory } from '@cloudblocks/schema';
import {
  adjustColorHsl,
  darken,
  deriveContainerFaceColors,
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

// ─── HSL Adjustment ──────────────────────────────────────────

describe('adjustColorHsl', () => {
  it('returns the original color when scale=1 and boost=0', () => {
    // HSL round-trip can shift by ±1 per channel, so we allow close match
    const result = adjustColorHsl('#0078D4', { saturationScale: 1, lightnessBoost: 0 });
    expect(result).toMatch(hexColorPattern);
    // Verify each channel is within ±1 of the original
    const [origR, origG, origB] = parseHexTest('#0078D4');
    const [resR, resG, resB] = parseHexTest(result);
    expect(Math.abs(origR - resR)).toBeLessThanOrEqual(1);
    expect(Math.abs(origG - resG)).toBeLessThanOrEqual(1);
    expect(Math.abs(origB - resB)).toBeLessThanOrEqual(1);
  });

  it('fully desaturates to a gray when saturationScale=0', () => {
    const result = adjustColorHsl('#FF0000', { saturationScale: 0, lightnessBoost: 0 });
    expect(result).toMatch(hexColorPattern);
    // With 0 saturation, R=G=B (gray)
    const [r, g, b] = parseHexTest(result);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('increases lightness with positive boost', () => {
    const original = '#0078D4';
    const boosted = adjustColorHsl(original, { saturationScale: 1, lightnessBoost: 20 });
    const origLum = getLuminance(original);
    const boostedLum = getLuminance(boosted);
    expect(boostedLum).toBeGreaterThan(origLum);
  });

  it('reduces saturation with scale < 1', () => {
    const original = '#0078D4';
    const desaturated = adjustColorHsl(original, { saturationScale: 0.3, lightnessBoost: 0 });
    // Desaturated color should have channels closer together (less spread)
    const [origR, origG, origB] = parseHexTest(original);
    const [desR, desG, desB] = parseHexTest(desaturated);
    const origSpread = Math.max(origR, origG, origB) - Math.min(origR, origG, origB);
    const desSpread = Math.max(desR, desG, desB) - Math.min(desR, desG, desB);
    expect(desSpread).toBeLessThan(origSpread);
  });

  it('clamps lightness at 100 (no overflow)', () => {
    const result = adjustColorHsl('#FFFFFF', { saturationScale: 1, lightnessBoost: 50 });
    expect(result).toMatch(hexColorPattern);
    // Already white (L=100), +50 should clamp to white
    expect(result).toBe('#FFFFFF');
  });

  it('clamps saturation at 0 (no underflow)', () => {
    // Very low saturation color with scale that would push below 0
    const result = adjustColorHsl('#808080', { saturationScale: 0.5, lightnessBoost: 0 });
    expect(result).toMatch(hexColorPattern);
    // Gray has 0 saturation, 0 * 0.5 = 0, still gray
    const [r, g, b] = parseHexTest(result);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('returns valid hex for all provider brand colors with typical adjustments', () => {
    for (const provider of providers) {
      const brand = PROVIDER_BRAND_COLOR[provider];
      const result = adjustColorHsl(brand, { saturationScale: 0.38, lightnessBoost: 16 });
      expect(result).toMatch(hexColorPattern);
    }
  });

  it('produces deterministic Azure region base color', () => {
    // This is the intermediate desaturated color before face derivation
    const result = adjustColorHsl('#0078D4', { saturationScale: 0.38, lightnessBoost: 16 });
    expect(result).toMatch(hexColorPattern);
    // Should be a muted blue — verify it is blueish (B > R)
    const [r, , b] = parseHexTest(result);
    expect(b).toBeGreaterThan(r);
  });
});

// ─── Container Face Color Derivation ────────────────────────

describe('deriveContainerFaceColors', () => {
  it('returns all 4 face properties', () => {
    const derived = deriveContainerFaceColors('#6688AA');
    expect(Object.keys(derived)).toHaveLength(4);
    expect(derived).toHaveProperty('top');
    expect(derived).toHaveProperty('topStroke');
    expect(derived).toHaveProperty('right');
    expect(derived).toHaveProperty('left');
  });

  it('produces valid hex colors for all derived values', () => {
    const derived = deriveContainerFaceColors('#6688AA');
    for (const value of Object.values(derived)) {
      expect(value).toMatch(hexColorPattern);
    }
  });

  it('uses narrower deltas than resource deriveFaceColors', () => {
    const base = '#6688AA';
    const container = deriveContainerFaceColors(base);
    const resource = deriveFaceColors(base);

    // Container top lighten(2) should be darker than resource top lighten(4)
    const containerTopLum = getLuminance(container.top);
    const resourceTopLum = getLuminance(resource.top);
    expect(containerTopLum).toBeLessThanOrEqual(resourceTopLum);

    // Container left darken(6) should be lighter than resource left darken(12)
    const containerLeftLum = getLuminance(container.left);
    const resourceLeftLum = getLuminance(resource.left);
    expect(containerLeftLum).toBeGreaterThanOrEqual(resourceLeftLum);
  });

  it('maintains correct face ordering (top brightest, left darkest)', () => {
    const derived = deriveContainerFaceColors('#6688AA');
    const topLum = getLuminance(derived.top);
    const rightLum = getLuminance(derived.right);
    const leftLum = getLuminance(derived.left);

    expect(topLum).toBeGreaterThanOrEqual(rightLum);
    expect(rightLum).toBeGreaterThanOrEqual(leftLum);
  });

  it('top is close to base (narrow lighten of 2%)', () => {
    const base = '#6688AA';
    const derived = deriveContainerFaceColors(base);
    // top = lighten(base, 2) — should be very close to base
    expect(derived.top).toBe(lighten(base, 2));
  });

  it('topStroke = darken(base, 10)', () => {
    const base = '#6688AA';
    expect(deriveContainerFaceColors(base).topStroke).toBe(darken(base, 10));
  });

  it('right = darken(base, 3)', () => {
    const base = '#6688AA';
    expect(deriveContainerFaceColors(base).right).toBe(darken(base, 3));
  });

  it('left = darken(base, 6)', () => {
    const base = '#6688AA';
    expect(deriveContainerFaceColors(base).left).toBe(darken(base, 6));
  });

  it('produces valid results for all provider brand colors', () => {
    for (const provider of providers) {
      const brand = PROVIDER_BRAND_COLOR[provider];
      const derived = deriveContainerFaceColors(brand);
      for (const value of Object.values(derived)) {
        expect(value).toMatch(hexColorPattern);
      }
    }
  });
});

// ─── Test helper ─────────────────────────────────────────────

function parseHexTest(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = Number.parseInt(h, 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

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
