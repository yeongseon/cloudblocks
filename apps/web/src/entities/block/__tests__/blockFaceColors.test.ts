import { describe, expect, it } from 'vitest';

import type { ProviderType, ResourceCategory } from '@cloudblocks/schema';
import {
  darken,
  deriveFaceColors,
  getBlockColor,
  getBlockFaceColors,
  lighten,
  PROVIDER_COLORS,
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
    expect(aws.analytics).toBe('#A166FF');
    expect(aws.ml).toBe('#1B7B67');
    expect(aws.management).toBe('#693BC5');
  });

  it('has correct Azure colors from spec §7.3', () => {
    const azure = PROVIDER_COLORS.azure;
    expect(azure.compute).toBe('#0078D4');
    expect(azure.serverless).toBe('#FEA11B');
    expect(azure.database).toBe('#005BA1');
    expect(azure['database-nosql']).toBe('#B25D08');
    expect(azure.storage).toBe('#258277');
    expect(azure.networking).toBe('#59B300');
    expect(azure.security).toBe('#E62323');
    expect(azure.messaging).toBe('#003F7C');
    expect(azure.identity).toBe('#EF7100');
    expect(azure.monitoring).toBe('#32BEDD');
    expect(azure.iot).toBe('#32D4F5');
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
    expect(getBlockColor('aws', 'ec2', 'compute')).toBe('#D86613');
    // AWS S3 → storage family → #3F8624
    expect(getBlockColor('aws', 's3', 'data')).toBe('#3F8624');
    // Azure Function App → serverless → #FEA11B
    expect(getBlockColor('azure', 'functions', 'compute')).toBe('#FEA11B');
    // Azure Cosmos DB → database-nosql → #B25D08
    expect(getBlockColor('azure', 'cosmos-db', 'data')).toBe('#B25D08');
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
    // Azure SQL Database → database → #005BA1
    const azureSql = getBlockColor('azure', 'sql-database', 'data');
    // Azure Cosmos DB → database-nosql → #B25D08
    const azureCosmos = getBlockColor('azure', 'cosmos-db', 'data');
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

  it('topFaceColor equals lighten(base, 4) for that category', () => {
    for (const provider of providers) {
      for (const category of categories) {
        const faceColors = getBlockFaceColors(category, provider);
        const baseColor = getBlockColor(provider, undefined, category);
        expect(faceColors.topFaceColor).toBe(lighten(baseColor, 4));
      }
    }
  });

  it('uses distinct top-face colors across providers for the same category', () => {
    for (const category of categories) {
      const providerTopColors = providers.map(
        (provider) => getBlockFaceColors(category, provider).topFaceColor,
      );

      expect(new Set(providerTopColors).size).toBe(providers.length);
    }
  });

  it('accepts optional subtype parameter for subtype-specific coloring', () => {
    const withSubtype = getBlockFaceColors('data', 'azure', 'cosmos-db');
    const withoutSubtype = getBlockFaceColors('data', 'azure');

    // Cosmos DB uses database-nosql (#B25D08), default database uses database (#005BA1)
    expect(withSubtype.topFaceColor).not.toBe(withoutSubtype.topFaceColor);
    expect(withSubtype.topFaceColor).toBe('#B56312');
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
