import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awsProviderDefinition,
  gcpProviderDefinition,
  azureProviderDefinition,
  getProviderDefinition,
} from './provider';

describe('azureProviderDefinition', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes azure provider identity', () => {
    expect(azureProviderDefinition.name).toBe('azure');
    expect(azureProviderDefinition.displayName).toBe('Azure');
  });

  it('defines all block mappings', () => {
    expect(azureProviderDefinition.blockMappings.compute).toEqual({
      resourceType: 'azurerm_linux_web_app',
      namePrefix: 'webapp',
    });
    expect(azureProviderDefinition.blockMappings.data).toEqual({
      resourceType: 'azurerm_postgresql_flexible_server',
      namePrefix: 'pgserver',
    });
    expect(azureProviderDefinition.blockMappings.edge).toEqual({
      resourceType: 'azurerm_application_gateway',
      namePrefix: 'appgw',
    });
    expect(azureProviderDefinition.blockMappings.messaging).toEqual({
      resourceType: 'azurerm_storage_queue',
      namePrefix: 'queue',
    });
    expect(azureProviderDefinition.blockMappings.security).toEqual({
      resourceType: 'azurerm_user_assigned_identity',
      namePrefix: 'identity',
    });
    expect(azureProviderDefinition.blockMappings.operations).toEqual({
      resourceType: 'azurerm_log_analytics_workspace',
      namePrefix: 'analytics',
    });
  });

  it('defines all plate mappings', () => {
    expect(azureProviderDefinition.plateMappings.region).toEqual({
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'vnet',
    });
    expect(azureProviderDefinition.plateMappings.subnet).toEqual({
      resourceType: 'azurerm_subnet',
      namePrefix: 'subnet',
    });
  });

  it('builds provider block hcl', () => {
    const block = azureProviderDefinition.generators.terraform.providerBlock('eastus');

    expect(block).toContain('provider "azurerm" {');
    expect(block).toContain('features {}');
    expect(block).toContain('# region: eastus');
    expect(block).toContain('}');
  });

  it('builds required_providers hcl', () => {
    const requiredProviders = azureProviderDefinition.generators.terraform.requiredProviders();

    expect(requiredProviders).toContain('terraform {');
    expect(requiredProviders).toContain('required_providers {');
    expect(requiredProviders).toContain('azurerm = {');
    expect(requiredProviders).toContain('source  = "hashicorp/azurerm"');
    expect(requiredProviders).toContain('version = "~> 3.0"');
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

describe('awsProviderDefinition', () => {
  it('uses ECS service mapping for compute category and includes new category mappings', () => {
    expect(awsProviderDefinition.blockMappings.compute).toEqual({
      resourceType: 'aws_ecs_service',
      namePrefix: 'ecs',
    });
    expect(awsProviderDefinition.blockMappings.operations).toEqual({
      resourceType: 'aws_athena_workgroup',
      namePrefix: 'analytics',
    });
    expect(awsProviderDefinition.blockMappings.security).toEqual({
      resourceType: 'aws_iam_role',
      namePrefix: 'role',
    });
  });

  it('keeps expected network and subnet plate mappings', () => {
    expect(awsProviderDefinition.plateMappings.region).toEqual({
      resourceType: 'aws_vpc',
      namePrefix: 'vpc',
    });
    expect(awsProviderDefinition.plateMappings.subnet).toEqual({
      resourceType: 'aws_subnet',
      namePrefix: 'subnet',
    });
  });
});

describe('gcpProviderDefinition', () => {
  it('uses Cloud Run/backend mappings and includes new category mappings', () => {
    expect(gcpProviderDefinition.blockMappings.compute).toEqual({
      resourceType: 'google_cloud_run_v2_service',
      namePrefix: 'run',
    });
    expect(gcpProviderDefinition.blockMappings.edge).toEqual({
      resourceType: 'google_compute_backend_service',
      namePrefix: 'backend',
    });
    expect(gcpProviderDefinition.blockMappings.operations).toEqual({
      resourceType: 'google_bigquery_dataset',
      namePrefix: 'analytics',
    });
    expect(gcpProviderDefinition.blockMappings.security).toEqual({
      resourceType: 'google_service_account',
      namePrefix: 'sa',
    });
  });

  it('keeps expected network and subnet plate mappings', () => {
    expect(gcpProviderDefinition.plateMappings.region).toEqual({
      resourceType: 'google_compute_network',
      namePrefix: 'network',
    });
    expect(gcpProviderDefinition.plateMappings.subnet).toEqual({
      resourceType: 'google_compute_subnetwork',
      namePrefix: 'subnet',
    });
  });
});
