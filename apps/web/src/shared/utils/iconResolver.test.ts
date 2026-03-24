import { describe, expect, it } from 'vitest';
import { getBlockIconUrl, getPlateIconUrl } from './iconResolver';
import type { LayerType, ProviderType } from '@cloudblocks/schema';

describe('getBlockIconUrl', () => {
  it('returns null when no subtype is provided', () => {
    const url = getBlockIconUrl('azure', 'compute');
    expect(url).toBeNull();
  });

  it('returns null for unknown subtype', () => {
    const url = getBlockIconUrl('azure', 'compute', 'unknown-service');
    expect(url).toBeNull();
  });

  it('returns icon URL for registered Azure subtypes', () => {
    const vm = getBlockIconUrl('azure', 'compute', 'vm');
    expect(vm).toBe('/azure-icons/virtual-machine.svg');

    const appService = getBlockIconUrl('azure', 'compute', 'app-service');
    expect(appService).toBe('/azure-icons/app-service.svg');

    const sqlDb = getBlockIconUrl('azure', 'data', 'sql-database');
    expect(sqlDb).toBe('/azure-icons/sql-database.svg');

    const blob = getBlockIconUrl('azure', 'data', 'blob-storage');
    expect(blob).toBe('/azure-icons/storage-account.svg');

    const serviceBus = getBlockIconUrl('azure', 'messaging', 'service-bus');
    expect(serviceBus).toBe('/azure-icons/service-bus.svg');

    const eventHubs = getBlockIconUrl('azure', 'messaging', 'event-hubs');
    expect(eventHubs).toBe('/azure-icons/event-hub.svg');

    const vnet = getBlockIconUrl('azure', 'network', 'vnet');
    expect(vnet).toBe('/azure-icons/virtual-network.svg');

    const appGw = getBlockIconUrl('azure', 'network', 'application-gateway');
    expect(appGw).toBe('/azure-icons/application-gateway.svg');

    const functions = getBlockIconUrl('azure', 'compute', 'functions');
    expect(functions).toBe('/azure-icons/function-apps.svg');
  });

  it('returns null for AWS and GCP subtypes (not yet registered)', () => {
    expect(getBlockIconUrl('aws', 'compute', 'ec2')).toBeNull();
    expect(getBlockIconUrl('gcp', 'compute', 'compute-engine')).toBeNull();
  });

  it('returns null for unknown provider', () => {
    const url = getBlockIconUrl('unknown-provider' as ProviderType, 'compute', 'vm');
    expect(url).toBeNull();
  });

  it('category parameter does not affect resolution (only subtype matters)', () => {
    const fromCompute = getBlockIconUrl('azure', 'compute', 'vm');
    const fromData = getBlockIconUrl('azure', 'data', 'vm');
    expect(fromCompute).toBe(fromData);
  });
});

describe('getPlateIconUrl', () => {
  const ALL_PLATE_TYPES: LayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];

  it.each(ALL_PLATE_TYPES)('returns a non-empty string for plate type %s', (plateType) => {
    const url = getPlateIconUrl(plateType);
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });

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
