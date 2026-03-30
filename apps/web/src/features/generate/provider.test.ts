import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awsProviderDefinition,
  gcpProviderDefinition,
  azureProviderDefinition,
  getProviderDefinition,
} from './provider';
import type { ArchitectureModel } from '@cloudblocks/schema';
import type { GenerationOptions, TerraformBlockContext, TerraformContainerContext } from './types';

const stubArchitecture: ArchitectureModel = {
  id: 'arch-provider-test',
  name: 'Provider Test',
  version: '1',
  nodes: [],
  connections: [],
  endpoints: [],
  externalActors: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const stubOptions: GenerationOptions = {
  provider: 'azure',
  mode: 'draft',
  projectName: 'test',
  region: 'eastus',
};

const stubContainerContext: TerraformContainerContext = {
  normalized: {
    architecture: stubArchitecture,
    resourceNames: new Map(),
  },
  options: stubOptions,
  resourceNames: new Map(),
  container: {
    id: 'container-1',
    name: 'Container',
    kind: 'container',
    layer: 'region',
    resourceType: 'virtual_network',
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 1, height: 1, depth: 1 },
    metadata: {},
  },
  mapping: { resourceType: 'aws_vpc', namePrefix: 'vpc' },
  resourceName: 'vpc_main',
  parentResourceName: null,
};

const stubBlockContext: TerraformBlockContext = {
  normalized: {
    architecture: stubArchitecture,
    resourceNames: new Map(),
  },
  options: stubOptions,
  resourceNames: new Map(),
  block: {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'web_compute',
    category: 'compute',
    provider: 'azure',
    parentId: 'container-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
  },
  mapping: { resourceType: 'aws_instance', namePrefix: 'ec2' },
  resourceName: 'ec2_main',
  parentResourceName: null,
};

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
    expect(azureProviderDefinition.blockMappings.delivery).toEqual({
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

  it('defines all container mappings', () => {
    expect(azureProviderDefinition.containerLayerMappings.region).toEqual({
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'vnet',
    });
    expect(azureProviderDefinition.containerLayerMappings.subnet).toEqual({
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

  it('keeps expected network and subnet container mappings', () => {
    expect(awsProviderDefinition.containerLayerMappings.region).toEqual({
      resourceType: 'aws_vpc',
      namePrefix: 'vpc',
    });
    expect(awsProviderDefinition.containerLayerMappings.subnet).toEqual({
      resourceType: 'aws_subnet',
      namePrefix: 'subnet',
    });
  });

  it('exposes terraform hook stubs', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;

    expect(terraformConfig.requiredProviders()).toContain('hashicorp/aws');
    expect(terraformConfig.providerBlock('us-east-1')).toContain('provider "aws" {');
    expect(terraformConfig.renderContainerBody(stubContainerContext)).toEqual([]);
    expect(terraformConfig.renderBlockBody(stubBlockContext)).toEqual([
      '  # TODO: Configure aws_instance',
    ]);
  });
});

describe('gcpProviderDefinition', () => {
  it('uses Cloud Run/backend mappings and includes new category mappings', () => {
    expect(gcpProviderDefinition.blockMappings.compute).toEqual({
      resourceType: 'google_cloud_run_v2_service',
      namePrefix: 'run',
    });
    expect(gcpProviderDefinition.blockMappings.delivery).toEqual({
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

  it('keeps expected network and subnet container mappings', () => {
    expect(gcpProviderDefinition.containerLayerMappings.region).toEqual({
      resourceType: 'google_compute_network',
      namePrefix: 'network',
    });
    expect(gcpProviderDefinition.containerLayerMappings.subnet).toEqual({
      resourceType: 'google_compute_subnetwork',
      namePrefix: 'subnet',
    });
  });

  it('exposes terraform hook stubs', () => {
    const terraformConfig = gcpProviderDefinition.generators.terraform;
    const blockContext: TerraformBlockContext = {
      ...stubBlockContext,
      mapping: { resourceType: 'google_compute_instance', namePrefix: 'gce' },
    };

    expect(terraformConfig.requiredProviders()).toContain('hashicorp/google');
    expect(terraformConfig.providerBlock('us-central1')).toContain('provider "google" {');
    expect(terraformConfig.renderContainerBody(stubContainerContext)).toEqual([]);
    expect(terraformConfig.renderBlockBody(blockContext)).toEqual([
      '  # TODO: Configure google_compute_instance',
    ]);
  });
});
