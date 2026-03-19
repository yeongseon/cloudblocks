import type { ProviderAdapter, ProviderDefinition, SubtypeResourceMap } from '../../types';

const azureSubtypeBlockMappings: SubtypeResourceMap = {
  compute: {
    vm: { resourceType: 'azurerm_linux_virtual_machine', namePrefix: 'vm' },
    'container-instances': { resourceType: 'azurerm_container_group', namePrefix: 'aci' },
    functions: { resourceType: 'azurerm_linux_function_app', namePrefix: 'func' },
  },
  database: {
    'sql-database': { resourceType: 'azurerm_mssql_database', namePrefix: 'sqldb' },
    'cosmos-db': { resourceType: 'azurerm_cosmosdb_account', namePrefix: 'cosmos' },
  },
  storage: {
    'blob-storage': { resourceType: 'azurerm_storage_account', namePrefix: 'st' },
  },
  gateway: {
    'application-gateway': { resourceType: 'azurerm_application_gateway', namePrefix: 'appgw' },
    'api-management': { resourceType: 'azurerm_api_management', namePrefix: 'apim' },
  },
};

/**
 * Azure Provider Definitions (v1.0)
 * Based on docs/engine/provider.md
 *
 * Maps CloudBlocks domain entities to Azure resources for each generator.
 *
 * Block Mappings:
 *   compute  → azurerm_linux_web_app / Microsoft.Web/sites / azure-native:web:WebApp
 *   database → azurerm_postgresql_flexible_server / Microsoft.DBforPostgreSQL/flexibleServers
 *   storage  → azurerm_storage_account / Microsoft.Storage/storageAccounts
 *   gateway  → azurerm_application_gateway / Microsoft.Network/applicationGateways
 *   function → azurerm_linux_function_app / Microsoft.Web/sites (functionapp)
 *   queue    → azurerm_storage_queue / Microsoft.Storage/storageAccounts/queueServices
 *   event    → azurerm_eventgrid_topic / Microsoft.EventGrid/topics
 *   timer    → azurerm_logic_app_workflow / Microsoft.Logic/workflows
 *
 * Plate Mappings:
 *   network  → azurerm_virtual_network / Microsoft.Network/virtualNetworks
 *   subnet   → azurerm_subnet / Microsoft.Network/virtualNetworks/subnets
 */

export const azureProviderDefinition: ProviderDefinition = {
  name: 'azure',
  displayName: 'Azure',

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
    function: {
      resourceType: 'azurerm_linux_function_app',
      namePrefix: 'func',
    },
    queue: {
      resourceType: 'azurerm_storage_queue',
      namePrefix: 'queue',
    },
    event: {
      resourceType: 'azurerm_eventgrid_topic',
      namePrefix: 'evtopic',
    },
    timer: {
      resourceType: 'azurerm_logic_app_workflow',
      namePrefix: 'timer',
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

  generators: {
    terraform: {
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
      providerBlock: (region: string) =>
        [
          'provider "azurerm" {',
          '  features {}',
          `  # region: ${region}`,
          '}',
        ].join('\n'),
    },
    bicep: {
      targetScope: 'resourceGroup',
    },
    pulumi: {
      packageName: '@pulumi/azure-native',
      runtime: 'nodejs',
    },
  },
  subtypeBlockMappings: azureSubtypeBlockMappings,
};

/**
 * Legacy ProviderAdapter — wraps ProviderDefinition for backward compat with terraform.ts.
 * @deprecated Prefer using ProviderDefinition directly via getProviderDefinition().
 */
export const azureProvider: ProviderAdapter = {
  name: azureProviderDefinition.name,
  displayName: azureProviderDefinition.displayName,
  blockMappings: azureProviderDefinition.blockMappings,
  plateMappings: azureProviderDefinition.plateMappings,
  providerBlock: azureProviderDefinition.generators.terraform.providerBlock,
  requiredProviders: azureProviderDefinition.generators.terraform.requiredProviders,
};
