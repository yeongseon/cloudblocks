import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awsProvider,
  awsProviderDefinition,
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
    expect(azureProvider.blockMappings.timer).toEqual({
      resourceType: 'azurerm_logic_app_workflow',
      namePrefix: 'timer',
    });
  });

  it('defines all plate mappings', () => {
    expect(azureProvider.plateMappings.network).toEqual({
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
});

describe('getProviderDefinition', () => {
  it('returns azure provider definition for azure name', () => {
    expect(getProviderDefinition('azure')).toBe(azureProviderDefinition);
  });

  it('returns aws provider definition for aws name', () => {
    expect(getProviderDefinition('aws')).toBe(awsProviderDefinition);
  });

  it('returns undefined for unknown name', () => {
    expect(getProviderDefinition('unknown' as 'azure')).toBeUndefined();
  });
});

describe('awsProvider', () => {
  it('uses ECS service mapping for compute category', () => {
    expect(awsProvider.blockMappings.compute).toEqual({
      resourceType: 'aws_ecs_service',
      namePrefix: 'ecs',
    });
  });

  it('keeps expected network and subnet plate mappings', () => {
    expect(awsProvider.plateMappings.network).toEqual({
      resourceType: 'aws_vpc',
      namePrefix: 'vpc',
    });
    expect(awsProvider.plateMappings.subnet).toEqual({
      resourceType: 'aws_subnet',
      namePrefix: 'subnet',
    });
  });
});
