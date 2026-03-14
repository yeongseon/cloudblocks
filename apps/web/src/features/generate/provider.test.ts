import { beforeEach, describe, expect, it, vi } from 'vitest';

import { azureProvider, getProvider } from './provider';

describe('azureProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes azure provider identity', () => {
    expect(azureProvider.name).toBe('azure');
    expect(azureProvider.displayName).toBe('Azure (azurerm)');
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

  it('returns undefined for unknown name', () => {
    expect(getProvider('unknown')).toBeUndefined();
  });
});
