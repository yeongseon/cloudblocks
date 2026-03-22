import { describe, expect, it } from 'vitest';
import { getBlockIconUrl, getPlateIconUrl } from './iconResolver';
import type { LayerType, ProviderType, ResourceCategory } from '@cloudblocks/schema';

describe('getBlockIconUrl', () => {
  const ALL_CATEGORIES: ResourceCategory[] = [
    'compute', 'data', 'edge', 'messaging', 'operations', 'security',
  ];
  const ALL_PROVIDERS: ProviderType[] = ['azure', 'aws', 'gcp'];

  it.each(ALL_CATEGORIES)(
    'returns a non-empty string for category %s with azure provider',
    (category) => {
      const url = getBlockIconUrl('azure', category);
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    },
  );

  it.each(ALL_PROVIDERS)(
    'returns a valid icon URL for provider %s',
    (provider) => {
      const url = getBlockIconUrl(provider, 'compute');
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    },
  );

  it('aws and gcp fall back to azure icons', () => {
    ALL_CATEGORIES.forEach((category) => {
      const azure = getBlockIconUrl('azure', category);
      const aws = getBlockIconUrl('aws', category);
      const gcp = getBlockIconUrl('gcp', category);
      expect(aws).toBe(azure);
      expect(gcp).toBe(azure);
    });
  });

  it('ignores unknown subtype and still returns category icon', () => {
    const url = getBlockIconUrl('azure', 'compute', 'unknown-service');
    const baseline = getBlockIconUrl('azure', 'compute');
    expect(url).toBe(baseline);
  });
});

describe('getPlateIconUrl', () => {
  const ALL_PLATE_TYPES: LayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];

  it.each(ALL_PLATE_TYPES)(
    'returns a non-empty string for plate type %s',
    (plateType) => {
      const url = getPlateIconUrl(plateType);
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    },
  );

  it('subnet uses a different icon than network-layer plates', () => {
    const subnetUrl = getPlateIconUrl('subnet');
    const regionUrl = getPlateIconUrl('region');
    expect(subnetUrl).not.toBe(regionUrl);
  });

  it('all network-layer plates share the same icon', () => {
    const networkTypes: LayerType[] = ['global', 'edge', 'region', 'zone'];
    const urls = networkTypes.map((t) => getPlateIconUrl(t));
    const unique = new Set(urls);
    expect(unique.size).toBe(1);
  });

});
