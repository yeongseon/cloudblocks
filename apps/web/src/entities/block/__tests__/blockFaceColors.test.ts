import { describe, expect, it } from 'vitest';

import type { BlockCategory, ProviderType, StudColorSpec } from '../../../shared/types/index';
import {
  darken,
  deriveFaceColors,
  getBlockColor,
  getBlockFaceColors,
  getBlockStudColors,
  lighten,
  PROVIDER_COLORS,
} from '../blockFaceColors';

const providers: ProviderType[] = ['azure', 'aws', 'gcp'];
const categories: BlockCategory[] = [
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'analytics',
  'identity',
  'observability',
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
  it('sets top to the base color unchanged', () => {
    const base = '#D86613';
    const derived = deriveFaceColors(base);
    expect(derived.top).toBe(base);
  });

  it('derives topStroke as lighten(base, 15)', () => {
    const base = '#D86613';
    const derived = deriveFaceColors(base);
    expect(derived.topStroke).toBe(lighten(base, 15));
  });

  it('derives right face as darken(base, 10)', () => {
    const base = '#D86613';
    const derived = deriveFaceColors(base);
    expect(derived.right).toBe(darken(base, 10));
  });

  it('derives left face as darken(base, 20)', () => {
    const base = '#D86613';
    const derived = deriveFaceColors(base);
    expect(derived.left).toBe(darken(base, 20));
  });

  it('derives studMain as lighten(base, 15)', () => {
    const base = '#0078D4';
    const derived = deriveFaceColors(base);
    expect(derived.studMain).toBe(lighten(base, 15));
  });

  it('derives studShadow as darken(base, 15)', () => {
    const base = '#0078D4';
    const derived = deriveFaceColors(base);
    expect(derived.studShadow).toBe(darken(base, 15));
  });

  it('derives studHighlight as lighten(base, 40)', () => {
    const base = '#0078D4';
    const derived = deriveFaceColors(base);
    expect(derived.studHighlight).toBe(lighten(base, 40));
  });

  it('returns all 7 derived properties', () => {
    const derived = deriveFaceColors('#4285F4');
    const keys = Object.keys(derived);
    expect(keys).toHaveLength(7);
    expect(keys).toContain('top');
    expect(keys).toContain('topStroke');
    expect(keys).toContain('right');
    expect(keys).toContain('left');
    expect(keys).toContain('studMain');
    expect(keys).toContain('studShadow');
    expect(keys).toContain('studHighlight');
  });

  it('produces valid hex colors for all derived values', () => {
    const derived = deriveFaceColors('#CD2264');
    for (const value of Object.values(derived)) {
      expect(value).toMatch(hexColorPattern);
    }
  });
});

// ─── Provider Color Palettes (§7.2–§7.4) ─────────────────────

describe('PROVIDER_COLORS', () => {
  it('contains palettes for all three providers', () => {
    expect(PROVIDER_COLORS).toHaveProperty('aws');
    expect(PROVIDER_COLORS).toHaveProperty('azure');
    expect(PROVIDER_COLORS).toHaveProperty('gcp');
  });

  it('has correct AWS colors from spec §7.2', () => {
    const aws = PROVIDER_COLORS.aws;
    expect(aws.compute).toBe('#D86613');
    expect(aws.database).toBe('#CD2264');
    expect(aws.storage).toBe('#3F8624');
    expect(aws.networking).toBe('#693BC5');
    expect(aws.security).toBe('#D6232C');
    expect(aws['app-integration']).toBe('#CD2264');
    expect(aws.analytics).toBe('#693BC5');
    expect(aws.ml).toBe('#1B7B67');
    expect(aws.management).toBe('#693BC5');
  });

  it('has correct Azure colors from spec §7.3', () => {
    const azure = PROVIDER_COLORS.azure;
    expect(azure.compute).toBe('#0078D4');
    expect(azure.serverless).toBe('#FF8C00');
    expect(azure.database).toBe('#0078D4');
    expect(azure['database-nosql']).toBe('#32D4F5');
    expect(azure.storage).toBe('#59B4D9');
    expect(azure.networking).toBe('#0078D4');
    expect(azure.security).toBe('#E0301E');
    expect(azure.messaging).toBe('#0078D4');
    expect(azure.identity).toBe('#0078D4');
    expect(azure.monitoring).toBe('#0078D4');
    expect(azure.iot).toBe('#B19AD7');
  });

  it('has correct GCP colors from spec §7.4', () => {
    const gcp = PROVIDER_COLORS.gcp;
    expect(gcp.compute).toBe('#4285F4');
    expect(gcp['storage-db']).toBe('#4285F4');
    expect(gcp.networking).toBe('#EA4335');
    expect(gcp['data-analytics']).toBe('#34A853');
    expect(gcp.operations).toBe('#FBBC05');
  });

  it('contains only valid hex colors', () => {
    for (const provider of providers) {
      for (const color of Object.values(PROVIDER_COLORS[provider])) {
        expect(color).toMatch(hexColorPattern);
      }
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

  it('uses subtype-specific mapping when available', () => {
    // AWS EC2 → compute family → #D86613
    expect(getBlockColor('aws', 'EC2', 'compute')).toBe('#D86613');
    // AWS S3 → storage family → #3F8624
    expect(getBlockColor('aws', 'S3', 'storage')).toBe('#3F8624');
    // Azure Function App → serverless → #FF8C00
    expect(getBlockColor('azure', 'Function App', 'function')).toBe('#FF8C00');
    // Azure Cosmos DB → database-nosql → #32D4F5
    expect(getBlockColor('azure', 'Cosmos DB', 'database')).toBe('#32D4F5');
  });

  it('falls back to category mapping when subtype is not in map', () => {
    // Unknown subtype for AWS compute → category fallback → compute → #D86613
    const color = getBlockColor('aws', 'UnknownService', 'compute');
    expect(color).toBe('#D86613');
  });

  it('falls back to category mapping when subtype is undefined', () => {
    const color = getBlockColor('azure', undefined, 'compute');
    expect(color).toBe(PROVIDER_COLORS.azure.compute);
  });

  it('returns different colors for different providers on the same category', () => {
    const awsCompute = getBlockColor('aws', undefined, 'compute');
    const azureCompute = getBlockColor('azure', undefined, 'compute');
    const gcpCompute = getBlockColor('gcp', undefined, 'compute');
    // At least AWS and Azure compute should differ
    expect(awsCompute).not.toBe(azureCompute);
    expect(new Set([awsCompute, azureCompute, gcpCompute]).size).toBeGreaterThan(1);
  });

  it('differentiates subtypes within the same category and provider', () => {
    // Azure SQL Database → database → #0078D4
    const azureSql = getBlockColor('azure', 'Azure SQL Database', 'database');
    // Azure Cosmos DB → database-nosql → #32D4F5
    const azureCosmos = getBlockColor('azure', 'Cosmos DB', 'database');
    expect(azureSql).not.toBe(azureCosmos);
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

  it('topFaceColor equals the provider base color for that category', () => {
    // The top face IS the base color (spec §7.7: top = BASE)
    for (const provider of providers) {
      for (const category of categories) {
        const faceColors = getBlockFaceColors(category, provider);
        const baseColor = getBlockColor(provider, undefined, category);
        expect(faceColors.topFaceColor).toBe(baseColor);
      }
    }
  });

  it('uses distinct top-face colors across providers for the same category', () => {
    for (const category of categories) {
      const providerTopColors = providers.map((provider) =>
        getBlockFaceColors(category, provider).topFaceColor
      );

      expect(new Set(providerTopColors).size).toBe(providers.length);
    }
  });

  it('accepts optional subtype parameter for subtype-specific coloring', () => {
    const withSubtype = getBlockFaceColors('database', 'azure', 'Cosmos DB');
    const withoutSubtype = getBlockFaceColors('database', 'azure');

    // Cosmos DB uses database-nosql (#32D4F5), default database uses database (#0078D4)
    expect(withSubtype.topFaceColor).not.toBe(withoutSubtype.topFaceColor);
    expect(withSubtype.topFaceColor).toBe('#32D4F5');
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
        // Left (darken 20%) should be darker than right (darken 10%)
        expect(leftLuminance).toBeLessThanOrEqual(rightLuminance + 0.001);
      }
    }
  });
});

// ─── getBlockStudColors (Backward-Compatible API) ─────────────

describe('getBlockStudColors', () => {
  it('returns valid StudColorSpec for every provider and category pair', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const studColors = getBlockStudColors(category, provider);

        expect(studColors).toBeDefined();
        expect(studColors).toHaveProperty('main');
        expect(studColors).toHaveProperty('shadow');
        expect(studColors).toHaveProperty('highlight');

        expect(studColors.main).toMatch(hexColorPattern);
        expect(studColors.shadow).toMatch(hexColorPattern);
        expect(studColors.highlight).toMatch(hexColorPattern);
      }
    }
  });

  it('defaults to azure stud colors when provider is omitted or undefined', () => {
    for (const category of categories) {
      const azure = getBlockStudColors(category, 'azure');
      const omittedProvider = getBlockStudColors(category);
      const undefinedProvider = getBlockStudColors(category, undefined);

      expect(omittedProvider).toEqual(azure);
      expect(undefinedProvider).toEqual(azure);
    }
  });

  it('stud main equals lighten(base, 15) per spec §7.7', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const studs = getBlockStudColors(category, provider);
        const base = getBlockColor(provider, undefined, category);
        expect(studs.main).toBe(lighten(base, 15));
      }
    }
  });

  it('stud shadow equals darken(base, 15) per spec §7.7', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const studs = getBlockStudColors(category, provider);
        const base = getBlockColor(provider, undefined, category);
        expect(studs.shadow).toBe(darken(base, 15));
      }
    }
  });

  it('stud highlight equals lighten(base, 40) per spec §7.7', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const studs = getBlockStudColors(category, provider);
        const base = getBlockColor(provider, undefined, category);
        expect(studs.highlight).toBe(lighten(base, 40));
      }
    }
  });

  it('provides different stud colors across providers for the same category', () => {
    for (const category of categories) {
      const providerMainColors = providers.map((provider) => getBlockStudColors(category, provider).main);

      // At least main color should differ across providers
      expect(new Set(providerMainColors).size).toBeGreaterThan(1);
    }
  });

  it('ensures highlight is lighter than main color for all providers', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const studColors = getBlockStudColors(category, provider);
        const mainLuminance = getLuminance(studColors.main);
        const highlightLuminance = getLuminance(studColors.highlight);

        expect(highlightLuminance).toBeGreaterThan(mainLuminance);
      }
    }
  });

  it('provides complete color coverage for all provider×category combinations', () => {
    const results: Array<{ provider: ProviderType; category: BlockCategory; spec: StudColorSpec }> = [];

    for (const provider of providers) {
      for (const category of categories) {
        results.push({
          provider,
          category,
          spec: getBlockStudColors(category, provider),
        });
      }
    }

    // Should have exactly 3 providers × 10 categories = 30 combinations
    expect(results).toHaveLength(3 * 10);

    for (const result of results) {
      expect(result.spec.main).toMatch(hexColorPattern);
      expect(result.spec.shadow).toMatch(hexColorPattern);
      expect(result.spec.highlight).toMatch(hexColorPattern);
    }
  });

  it('accepts optional subtype parameter for subtype-specific stud colors', () => {
    const withSubtype = getBlockStudColors('database', 'azure', 'Cosmos DB');
    const withoutSubtype = getBlockStudColors('database', 'azure');

    // Different base colors → different stud colors
    expect(withSubtype.main).not.toBe(withoutSubtype.main);
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
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
