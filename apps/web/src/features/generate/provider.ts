import type { ProviderAdapter } from './types';

/**
 * Azure Provider Adapter (v0.3)
 * Based on docs/engine/provider.md
 *
 * Maps CloudBlocks domain entities to Azure Terraform resources.
 *
 * Block Mappings:
 *   compute  → azurerm_linux_web_app
 *   database → azurerm_postgresql_flexible_server
 *   storage  → azurerm_storage_account
 *   gateway  → azurerm_application_gateway
 *
 * Plate Mappings:
 *   network  → azurerm_virtual_network
 *   subnet   → azurerm_subnet
 */

export const azureProvider: ProviderAdapter = {
  name: 'azure',
  displayName: 'Azure (azurerm)',

  blockMappings: {
    compute: {
      resourceType: 'azurerm_linux_web_app',
      namePrefix: 'webapp',
    },
    database: {
      resourceType: 'azurerm_postgresql_flexible_server',
      namePrefix: 'pgserver',
    },
    storage: {
      resourceType: 'azurerm_storage_account',
      namePrefix: 'storage',
    },
    gateway: {
      resourceType: 'azurerm_application_gateway',
      namePrefix: 'appgw',
    },
  },

  plateMappings: {
    network: {
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'vnet',
    },
    subnet: {
      resourceType: 'azurerm_subnet',
      namePrefix: 'subnet',
    },
  },

  providerBlock: (region: string) =>
    [
      'provider "azurerm" {',
      '  features {}',
      `  # region: ${region}`,
      '}',
    ].join('\n'),

  requiredProviders: () =>
    [
      'terraform {',
      '  required_providers {',
      '    azurerm = {',
      '      source  = "hashicorp/azurerm"',
      '      version = "~> 3.0"',
      '    }',
      '  }',
      '}',
    ].join('\n'),
};

/** Provider registry — extensible for future providers */
const providers: Record<string, ProviderAdapter> = {
  azure: azureProvider,
};

export function getProvider(name: string): ProviderAdapter | undefined {
  return providers[name];
}
