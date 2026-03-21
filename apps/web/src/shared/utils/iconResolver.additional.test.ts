import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LayerType } from '@cloudblocks/schema';
import { getBlockIconUrl, getPlateIconUrl } from './iconResolver';

describe('iconResolver additional branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns subtype icon overrides for known compute/storage subtypes', () => {
    const appService = getBlockIconUrl('azure', 'compute', 'app-service');
    const functions = getBlockIconUrl('azure', 'compute', 'functions');
    const blobStorage = getBlockIconUrl('azure', 'data', 'blob-storage');
    const genericCompute = getBlockIconUrl('azure', 'compute');

    expect(appService).not.toBe(genericCompute);
    expect(functions).not.toBe(genericCompute);
    expect(blobStorage).not.toBe(getBlockIconUrl('azure', 'data'));
  });

  it('returns resource plate icon when plate type is resource', () => {
    const resourceIcon = getPlateIconUrl('resource' as LayerType);
    const regionIcon = getPlateIconUrl('region');

    expect(resourceIcon).toBe(regionIcon);
  });
});
