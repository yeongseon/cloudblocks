import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awsProvider,
  awsProviderDefinition,
  gcpProvider,
  gcpProviderDefinition,
  azureProvider,
  azureProviderDefinition,
  getProvider,
  getProviderDefinition,
} from './provider';

describe('azureProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes azure provider identity', () => {
    expect(azureProvider.name).toBe('azure');
    expect(azureProvider.displayName).toBe('Azure');
  });

  it('defines all block mappings', () => {
    expect(azureProvider.blockMappings.compute).toEqual({
      resourceType: 'azurerm_linux_web_app',
      namePrefix: 'webapp',
    });
    expect(azureProvider.blockMappings.database).toEqual({
      resourceType: 'azurerm_postgresql_flexible_server',
      namePrefix: 'pgserver',
    });
    expect(azureProvider.blockMappings.storage).toEqual({
      resourceType: 'azurerm_storage_account',
      namePrefix: 'storage',
    });
    expect(azureProvider.blockMappings.gateway).toEqual({
      resourceType: 'azurerm_application_gateway',
      namePrefix: 'appgw',
    });
    expect(azureProvider.blockMappings.function).toEqual({
      resourceType: 'azurerm_linux_function_app',
      namePrefix: 'func',
    });
    expect(azureProvider.blockMappings.queue).toEqual({
      resourceType: 'azurerm_storage_queue',
      namePrefix: 'queue',
    });
    expect(azureProvider.blockMappings.event).toEqual({
      resourceType: 'azurerm_eventgrid_topic',
      namePrefix: 'evtopic',
    });
    expect(azureProvider.blockMappings.analytics).toEqual({
      resourceType: 'azurerm_log_analytics_workspace',
      namePrefix: 'analytics',
    });
    expect(azureProvider.blockMappings.identity).toEqual({
      resourceType: 'azurerm_user_assigned_identity',
      namePrefix: 'identity',
    });
    expect(azureProvider.blockMappings.observability).toEqual({
      resourceType: 'azurerm_monitor_workspace',
      namePrefix: 'monitor',
    });
  });

  it('defines all plate mappings', () => {
    expect(azureProvider.plateMappings.region).toEqual({
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'vnet',
    });
    expect(azureProvider.plateMappings.subnet).toEqual({
      resourceType: 'azurerm_subnet',
      namePrefix: 'subnet',
    });
  });

  it('builds provider block hcl', () => {
    const block = azureProvider.providerBlock('eastus');

    expect(block).toContain('provider "azurerm" {');
    expect(block).toContain('features {}');
    expect(block).toContain('# region: eastus');
    expect(block).toContain('}');
  });

  it('builds required_providers hcl', () => {
    const requiredProviders = azureProvider.requiredProviders();

    expect(requiredProviders).toContain('terraform {');
    expect(requiredProviders).toContain('required_providers {');
    expect(requiredProviders).toContain('azurerm = {');
    expect(requiredProviders).toContain('source  = "hashicorp/azurerm"');
    expect(requiredProviders).toContain('version = "~> 3.0"');
  });
});

describe('getProvider', () => {
  it('returns azure provider for azure name', () => {
    expect(getProvider('azure')).toBe(azureProvider);
  });

  it('returns aws provider for aws name', () => {
    expect(getProvider('aws')).toBe(awsProvider);
  });

  it('returns undefined for unknown name', () => {
    expect(getProvider('unknown')).toBeUndefined();
  });

  it('returns gcp provider for gcp name', () => {
    expect(getProvider('gcp')).toBe(gcpProvider);
  });
});

describe('getProviderDefinition', () => {
  it('returns azure provider definition for azure name', () => {
    expect(getProviderDefinition('azure')).toBe(azureProviderDefinition);
  });

  it('returns aws provider definition for aws name', () => {
    expect(getProviderDefinition('aws')).toBe(awsProviderDefinition);
  });

  it('returns gcp provider definition for gcp name', () => {
    expect(getProviderDefinition('gcp')).toBe(gcpProviderDefinition);
  });

  it('returns undefined for unknown name', () => {
    expect(getProviderDefinition('unknown' as 'azure')).toBeUndefined();
  });
});

describe('awsProvider', () => {
  it('uses ECS service mapping for compute category and includes new category mappings', () => {
    expect(awsProvider.blockMappings.compute).toEqual({
      resourceType: 'aws_ecs_service',
      namePrefix: 'ecs',
    });
    expect(awsProvider.blockMappings.analytics).toEqual({
      resourceType: 'aws_athena_workgroup',
      namePrefix: 'analytics',
    });
    expect(awsProvider.blockMappings.identity).toEqual({
      resourceType: 'aws_iam_role',
      namePrefix: 'role',
    });
    expect(awsProvider.blockMappings.observability).toEqual({
      resourceType: 'aws_cloudwatch_dashboard',
      namePrefix: 'dashboard',
    });
  });

  it('keeps expected network and subnet plate mappings', () => {
    expect(awsProvider.plateMappings.region).toEqual({
      resourceType: 'aws_vpc',
      namePrefix: 'vpc',
    });
    expect(awsProvider.plateMappings.subnet).toEqual({
      resourceType: 'aws_subnet',
      namePrefix: 'subnet',
    });
  });
});

describe('gcpProvider', () => {
  it('uses Cloud Run/backend mappings and includes new category mappings', () => {
    expect(gcpProvider.blockMappings.compute).toEqual({
      resourceType: 'google_cloud_run_v2_service',
      namePrefix: 'run',
    });
    expect(gcpProvider.blockMappings.gateway).toEqual({
      resourceType: 'google_compute_backend_service',
      namePrefix: 'backend',
    });
    expect(gcpProvider.blockMappings.analytics).toEqual({
      resourceType: 'google_bigquery_dataset',
      namePrefix: 'analytics',
    });
    expect(gcpProvider.blockMappings.identity).toEqual({
      resourceType: 'google_service_account',
      namePrefix: 'sa',
    });
    expect(gcpProvider.blockMappings.observability).toEqual({
      resourceType: 'google_monitoring_dashboard',
      namePrefix: 'dashboard',
    });
  });

  it('keeps expected network and subnet plate mappings', () => {
    expect(gcpProvider.plateMappings.region).toEqual({
      resourceType: 'google_compute_network',
      namePrefix: 'network',
    });
    expect(gcpProvider.plateMappings.subnet).toEqual({
      resourceType: 'google_compute_subnetwork',
      namePrefix: 'subnet',
    });
  });
});
