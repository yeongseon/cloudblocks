import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LayerType, ProviderType, ResourceCategory } from '@cloudblocks/schema';
import {
  getBlockIconUrl,
  getContainerBlockIconUrl,
  getResourceIconUrl,
  getSubtypeDisplayLabel,
  getSubtypeShortLabel,
} from './iconResolver';

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

  it('returns resource container icon when container type is resource', () => {
    const resourceIcon = getContainerBlockIconUrl('resource' as LayerType);
    const regionIcon = getContainerBlockIconUrl('region');

    expect(resourceIcon).toBe(regionIcon);
  });

  it('returns null for unknown provider', () => {
    const fallback = getBlockIconUrl(
      'unknown-provider' as ProviderType,
      'unknown-category' as ResourceCategory,
    );

    expect(fallback).toBeNull();
  });

  it('resolves Azure resource icon URL and returns null for unsupported lookups', () => {
    expect(getResourceIconUrl('vm', 'azure')).toBe('/azure-icons/virtual-machine.svg');
    expect(getResourceIconUrl('vm', 'aws')).toBeNull();
    expect(getResourceIconUrl('definitely-unknown-resource', 'azure')).toBeNull();
  });

  it('returns subtype display label only when provider+subtype mapping exists', () => {
    expect(getSubtypeDisplayLabel('azure', 'vm')).toBe('Virtual Machine');
    expect(getSubtypeDisplayLabel('azure')).toBeNull();
    expect(getSubtypeDisplayLabel('azure', 'unknown-subtype')).toBeNull();
    expect(getSubtypeDisplayLabel('aws', 'vm')).toBeNull();
  });

  it('returns subtype short label only when subtype exists in mapping', () => {
    expect(getSubtypeShortLabel('azure', 'vm')).toBe('VM');
    expect(getSubtypeShortLabel('azure')).toBeNull();
    expect(getSubtypeShortLabel('azure', 'unknown-subtype')).toBeNull();
  });
});
