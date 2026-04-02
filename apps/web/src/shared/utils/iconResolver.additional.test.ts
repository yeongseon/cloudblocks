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

  it('resolves resource icon URLs for all providers', () => {
    // Azure uses legacy resource-type mapping
    expect(getResourceIconUrl('vm', 'azure')).toBe('/azure-icons/virtual-machine.svg');
    // AWS/GCP now return vendor-specific icons instead of null
    expect(getResourceIconUrl('vm', 'aws')).toBe('/aws-icons/ec2.svg');
    expect(getResourceIconUrl('vm', 'gcp')).toBe('/gcp-icons/compute-engine.svg');
    expect(getResourceIconUrl('sql', 'aws')).toBe('/aws-icons/rds.svg');
    expect(getResourceIconUrl('sql', 'gcp')).toBe('/gcp-icons/cloud-sql.svg');
    // Unknown resource types still return null
    expect(getResourceIconUrl('definitely-unknown-resource', 'azure')).toBeNull();
    expect(getResourceIconUrl('definitely-unknown-resource', 'aws')).toBeNull();
    expect(getResourceIconUrl('definitely-unknown-resource', 'gcp')).toBeNull();
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

  it('returns null for unknown external resourceType', () => {
    // Cover the null branch of EXTERNAL_BLOCK_ICONS lookup (line 239)
    expect(getBlockIconUrl('azure', 'compute', undefined, 'unknown-actor')).toBeNull();
  });

  it('returns icon URL for known external resourceType (internet)', () => {
    const url = getBlockIconUrl('azure', 'compute', undefined, 'internet');
    expect(url).toBe('/actor-sprites/internet.svg');
  });

  it('returns icon URL for known external resourceType (browser)', () => {
    const url = getBlockIconUrl('azure', 'compute', undefined, 'browser');
    expect(url).toBe('/actor-sprites/browser.svg');
  });

  it('returns external icon even when subtype is also provided (bug fix: BlockSprite passes resolved subtype)', () => {
    // BlockSprite resolves pres.subtype='internet' and passes it along with resourceType='internet'.
    // getBlockIconUrl must still return the external actor-sprite icon.
    expect(getBlockIconUrl('azure', 'compute', 'internet', 'internet')).toBe(
      '/actor-sprites/internet.svg',
    );
    expect(getBlockIconUrl('azure', 'compute', 'browser', 'browser')).toBe(
      '/actor-sprites/browser.svg',
    );
  });

  it('does not return external icon for non-external resourceTypes', () => {
    // Normal resource blocks pass resourceType like 'virtual_machine' which is not in EXTERNAL_BLOCK_ICONS.
    expect(getBlockIconUrl('azure', 'compute', 'vm', 'virtual_machine')).toBe(
      '/azure-icons/virtual-machine.svg',
    );
    expect(getBlockIconUrl('aws', 'compute', 'ec2', 'compute')).toBe('/aws-icons/ec2.svg');
  });

  it('resolves new Azure subtypes (api-management, timer-trigger, azure-postgresql)', () => {
    expect(getBlockIconUrl('azure', 'compute', 'api-management')).toBe(
      '/azure-icons/application-gateway.svg',
    );
    expect(getBlockIconUrl('azure', 'compute', 'timer-trigger')).toBe(
      '/azure-icons/function-apps.svg',
    );
    expect(getBlockIconUrl('azure', 'data', 'azure-postgresql')).toBe(
      '/azure-icons/sql-database.svg',
    );
  });

  it('resolves new AWS subtypes (elastic-beanstalk, eventbridge-scheduler, app-runner)', () => {
    expect(getBlockIconUrl('aws', 'compute', 'elastic-beanstalk')).toBe(
      '/aws-icons/elastic-beanstalk.svg',
    );
    expect(getBlockIconUrl('aws', 'compute', 'eventbridge-scheduler')).toBe(
      '/aws-icons/eventbridge-scheduler.svg',
    );
    expect(getBlockIconUrl('aws', 'compute', 'app-runner')).toBe('/aws-icons/app-runner.svg');
  });

  it('resolves new GCP subtypes (app-engine, cloud-run, cloud-scheduler, api-gateway)', () => {
    expect(getBlockIconUrl('gcp', 'compute', 'app-engine')).toBe('/gcp-icons/app-engine.svg');
    expect(getBlockIconUrl('gcp', 'compute', 'cloud-run')).toBe('/gcp-icons/cloud-run.svg');
    expect(getBlockIconUrl('gcp', 'compute', 'cloud-scheduler')).toBe(
      '/gcp-icons/cloud-scheduler.svg',
    );
    expect(getBlockIconUrl('gcp', 'network', 'api-gateway')).toBe(
      '/gcp-icons/cloud-load-balancing.svg',
    );
  });

  it('returns display labels for new subtypes', () => {
    expect(getSubtypeDisplayLabel('azure', 'api-management')).toBe('API Management');
    expect(getSubtypeDisplayLabel('azure', 'timer-trigger')).toBe('Timer Trigger');
    expect(getSubtypeDisplayLabel('azure', 'azure-postgresql')).toBe('Database for PostgreSQL');
    expect(getSubtypeDisplayLabel('aws', 'elastic-beanstalk')).toBe('Elastic Beanstalk');
    expect(getSubtypeDisplayLabel('aws', 'eventbridge-scheduler')).toBe('EventBridge Scheduler');
    expect(getSubtypeDisplayLabel('gcp', 'app-engine')).toBe('App Engine');
    expect(getSubtypeDisplayLabel('gcp', 'cloud-run')).toBe('Cloud Run');
    expect(getSubtypeDisplayLabel('gcp', 'cloud-scheduler')).toBe('Cloud Scheduler');
    expect(getSubtypeDisplayLabel('gcp', 'api-gateway')).toBe('API Gateway');
  });

  it('returns short labels for new subtypes', () => {
    expect(getSubtypeShortLabel('azure', 'api-management')).toBe('APIM');
    expect(getSubtypeShortLabel('azure', 'timer-trigger')).toBe('Timer');
    expect(getSubtypeShortLabel('azure', 'azure-postgresql')).toBe('PgSQL');
    expect(getSubtypeShortLabel('aws', 'elastic-beanstalk')).toBe('EB');
    expect(getSubtypeShortLabel('aws', 'eventbridge-scheduler')).toBe('Sched');
    expect(getSubtypeShortLabel('aws', 'app-runner')).toBe('Runner');
    expect(getSubtypeShortLabel('gcp', 'app-engine')).toBe('GAE');
    expect(getSubtypeShortLabel('gcp', 'cloud-run')).toBe('Run');
    expect(getSubtypeShortLabel('gcp', 'cloud-scheduler')).toBe('Sched');
    expect(getSubtypeShortLabel('gcp', 'api-gateway')).toBe('APIGW');
  });
});
