import { describe, expect, it } from 'vitest';

import type { BlockCategory, ProviderType, StudColorSpec } from '../../../shared/types/index';
import { getBlockFaceColors, getBlockStudColors } from '../blockFaceColors';

const providers: ProviderType[] = ['azure', 'aws', 'gcp'];
const categories: BlockCategory[] = [
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'timer',
];

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

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

  it('uses distinct top-face colors across providers for the same category', () => {
    for (const category of categories) {
      const providerTopColors = providers.map((provider) =>
        getBlockFaceColors(category, provider).topFaceColor
      );

      expect(new Set(providerTopColors).size).toBe(providers.length);
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
});

describe('getBlockStudColors', () => {
  it('returns valid StudColorSpec for every provider and category pair', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const studColors = getBlockStudColors(category, provider);

        // Verify StudColorSpec structure and format
        expect(studColors).toBeDefined();
        expect(studColors).toHaveProperty('main');
        expect(studColors).toHaveProperty('shadow');
        expect(studColors).toHaveProperty('highlight');

        // Verify all colors are valid 7-char hex strings (#RRGGBB)
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

  it('provides different stud colors across providers for the same category', () => {
    for (const category of categories) {
      const providerMainColors = providers.map((provider) => getBlockStudColors(category, provider).main);

      // At least main color should differ across providers
      expect(new Set(providerMainColors).size).toBeGreaterThan(1);
    }
  });

  it('has hand-crafted azure stud colors with expected values', () => {
    // Verify a few known azure stud color values to ensure they are hand-crafted
    // not auto-generated
    const expectedAzureColors: Record<BlockCategory, Partial<StudColorSpec>> = {
      compute: { main: '#ff693b' },
      database: { main: '#33b8f5' },
      storage: { main: '#99d11a' },
      gateway: { main: '#3393de' },
      function: { main: '#ffca33' },
      queue: { main: '#8c8c8c' },
      event: { main: '#e16233' },
      timer: { main: '#7546aa' },
    };

    for (const category of categories) {
      const azure = getBlockStudColors(category, 'azure');
      const expected = expectedAzureColors[category];

      if (expected?.main) {
        expect(azure.main.toLowerCase()).toBe(expected.main.toLowerCase());
      }
    }
  });

  it('generates aws stud colors from face palette', () => {
    // AWS stud colors should be derived from face palette
    // This is ensured by the fact that aws is NOT in AZURE_BLOCK_STUD_COLORS
    // but should still return valid StudColorSpec

    for (const category of categories) {
      const aws = getBlockStudColors(category, 'aws');

      expect(aws).toBeDefined();
      expect(aws.main).toMatch(hexColorPattern);
      expect(aws.shadow).toMatch(hexColorPattern);
      expect(aws.highlight).toMatch(hexColorPattern);
    }
  });

  it('generates gcp stud colors from face palette', () => {
    // GCP stud colors should be derived from face palette
    // This is ensured by the fact that gcp is NOT in AZURE_BLOCK_STUD_COLORS
    // but should still return valid StudColorSpec

    for (const category of categories) {
      const gcp = getBlockStudColors(category, 'gcp');

      expect(gcp).toBeDefined();
      expect(gcp.main).toMatch(hexColorPattern);
      expect(gcp.shadow).toMatch(hexColorPattern);
      expect(gcp.highlight).toMatch(hexColorPattern);
    }
  });

  it('ensures highlight is lighter than main color (derived providers)', () => {
    // For AWS and GCP, highlight should be a lightened version of main
    const derivedProviders: ProviderType[] = ['aws', 'gcp'];

    for (const provider of derivedProviders) {
      for (const category of categories) {
        const studColors = getBlockStudColors(category, provider);
        const mainLuminance = getLuminance(studColors.main);
        const highlightLuminance = getLuminance(studColors.highlight);

        // Highlight should be lighter (higher luminance) than main
        expect(highlightLuminance).toBeGreaterThan(mainLuminance);
      }
    }
  });

  it('provides complete color coverage for all 24 provider×category combinations', () => {
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

    // Should have exactly 3 providers × 8 categories = 24 combinations
    expect(results).toHaveLength(3 * 8);

    // All results should be valid StudColorSpec
    for (const result of results) {
      expect(result.spec.main).toMatch(hexColorPattern);
      expect(result.spec.shadow).toMatch(hexColorPattern);
      expect(result.spec.highlight).toMatch(hexColorPattern);
    }
  });
});

/**
 * Calculate relative luminance of a hex color for comparison purposes
 * Used to verify that highlight colors are lighter than main colors
 */
function getLuminance(hex: string): number {
  const normalizedHex = hex.replace('#', '');
  const r = Number.parseInt(normalizedHex.substring(0, 2), 16) / 255;
  const g = Number.parseInt(normalizedHex.substring(2, 4), 16) / 255;
  const b = Number.parseInt(normalizedHex.substring(4, 6), 16) / 255;

  // Standard relative luminance formula from WCAG 2.0
  const [rs, gs, bs] = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
