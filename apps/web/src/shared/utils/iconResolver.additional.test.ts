import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LayerType, ProviderType, ResourceCategory } from '@cloudblocks/schema';
import { getBlockIconUrl, getPlateIconUrl } from './iconResolver';

describe('iconResolver additional branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns different icon URLs for distinct registered subtypes', () => {
    const appService = getBlockIconUrl('azure', 'compute', 'app-service');
    const functions = getBlockIconUrl('azure', 'compute', 'functions');
    const blobStorage = getBlockIconUrl('azure', 'data', 'blob-storage');

    expect(appService).not.toBe(functions);
    expect(appService).not.toBe(blobStorage);
    expect(functions).not.toBe(blobStorage);
  });

  it('returns null when no subtype provided (category-only lookup)', () => {
    expect(getBlockIconUrl('azure', 'compute')).toBeNull();
    expect(getBlockIconUrl('azure', 'data')).toBeNull();
  });

  it('returns resource plate icon when plate type is resource', () => {
    const resourceIcon = getPlateIconUrl('resource' as LayerType);
    const regionIcon = getPlateIconUrl('region');

    expect(resourceIcon).toBe(regionIcon);
  });

  it('returns null for unknown provider', () => {
    const fallback = getBlockIconUrl(
      'unknown-provider' as ProviderType,
      'unknown-category' as ResourceCategory,
    );

    expect(fallback).toBeNull();
  });
});
