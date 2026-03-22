import type { ProviderAdapter, ProviderDefinition, SubtypeResourceMap } from '../../types';

const azureSubtypeBlockMappings: SubtypeResourceMap = {
  compute: {
    vm: { resourceType: 'azurerm_linux_virtual_machine', namePrefix: 'vm' },
    virtual_machine: { resourceType: 'azurerm_linux_virtual_machine', namePrefix: 'vm' },
    'container-instances': { resourceType: 'azurerm_container_group', namePrefix: 'aci' },
    container_instances: { resourceType: 'azurerm_container_group', namePrefix: 'aci' },
    functions: { resourceType: 'azurerm_linux_function_app', namePrefix: 'func' },
    function_compute: { resourceType: 'azurerm_linux_function_app', namePrefix: 'func' },
    'app-service': { resourceType: 'azurerm_linux_web_app', namePrefix: 'appsvc' },
    app_service: { resourceType: 'azurerm_linux_web_app', namePrefix: 'appsvc' },
    aks: { resourceType: 'azurerm_kubernetes_cluster', namePrefix: 'aks' },
    kubernetes_cluster: { resourceType: 'azurerm_kubernetes_cluster', namePrefix: 'aks' },
  },
  data: {
    'sql-database': { resourceType: 'azurerm_mssql_database', namePrefix: 'sqldb' },
    sql_database: { resourceType: 'azurerm_mssql_database', namePrefix: 'sqldb' },
    'cosmos-db': { resourceType: 'azurerm_cosmosdb_account', namePrefix: 'cosmos' },
    cosmos_db: { resourceType: 'azurerm_cosmosdb_account', namePrefix: 'cosmos' },
    'blob-storage': { resourceType: 'azurerm_storage_account', namePrefix: 'st' },
    blob_storage: { resourceType: 'azurerm_storage_account', namePrefix: 'st' },
  },
  edge: {
    'application-gateway': { resourceType: 'azurerm_application_gateway', namePrefix: 'appgw' },
    application_gateway: { resourceType: 'azurerm_application_gateway', namePrefix: 'appgw' },
    'nat-gateway': { resourceType: 'azurerm_nat_gateway', namePrefix: 'natgw' },
    nat_gateway: { resourceType: 'azurerm_nat_gateway', namePrefix: 'natgw' },
    'internal-lb': { resourceType: 'azurerm_lb', namePrefix: 'intlb' },
    internal_load_balancer: { resourceType: 'azurerm_lb', namePrefix: 'intlb' },
    dns_zone: { resourceType: 'azurerm_dns_zone', namePrefix: 'dns' },
    cdn_profile: { resourceType: 'azurerm_cdn_profile', namePrefix: 'cdn' },
    front_door: { resourceType: 'azurerm_cdn_frontdoor_profile', namePrefix: 'fd' },
    'api-management': { resourceType: 'azurerm_api_management', namePrefix: 'apim' },
  },
  messaging: {
    'service-bus': { resourceType: 'azurerm_storage_queue', namePrefix: 'queue' },
    'event-grid': { resourceType: 'azurerm_eventgrid_topic', namePrefix: 'evtopic' },
  },
  security: {
    'managed-identity': { resourceType: 'azurerm_user_assigned_identity', namePrefix: 'identity' },
    nsg: { resourceType: 'azurerm_network_security_group', namePrefix: 'nsg' },
    network_security_group: { resourceType: 'azurerm_network_security_group', namePrefix: 'nsg' },
    firewall_security: { resourceType: 'azurerm_firewall', namePrefix: 'fw' },
    key_vault: { resourceType: 'azurerm_key_vault', namePrefix: 'kv' },
    bastion_host: { resourceType: 'azurerm_bastion_host', namePrefix: 'bastion' },
  },
  network: {
    'nat-gateway': { resourceType: 'azurerm_nat_gateway', namePrefix: 'natgw' },
    nat_gateway: { resourceType: 'azurerm_nat_gateway', namePrefix: 'natgw' },
    'public-ip': { resourceType: 'azurerm_public_ip', namePrefix: 'pip' },
    public_ip: { resourceType: 'azurerm_public_ip', namePrefix: 'pip' },
    'route-table': { resourceType: 'azurerm_route_table', namePrefix: 'rt' },
    route_table: { resourceType: 'azurerm_route_table', namePrefix: 'rt' },
    'private-endpoint': { resourceType: 'azurerm_private_endpoint', namePrefix: 'pe' },
    private_endpoint: { resourceType: 'azurerm_private_endpoint', namePrefix: 'pe' },
  },
  operations: {
    'log-analytics': { resourceType: 'azurerm_log_analytics_workspace', namePrefix: 'analytics' },
    monitor: { resourceType: 'azurerm_monitor_workspace', namePrefix: 'monitor' },
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
 *   analytics → azurerm_log_analytics_workspace / Microsoft.OperationalInsights/workspaces
 *   identity → azurerm_user_assigned_identity / Microsoft.ManagedIdentity/userAssignedIdentities
 *   observability → azurerm_monitor_workspace / Microsoft.Monitor/accounts
 *
 * Plate Mappings:
 *   global/edge/region/zone → azurerm_virtual_network / Microsoft.Network/virtualNetworks
 *   subnet                  → azurerm_subnet / Microsoft.Network/virtualNetworks/subnets
 */

export const azureProviderDefinition: ProviderDefinition = {
  name: 'azure',
  displayName: 'Azure',

  blockMappings: {
    network: {
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'network',
    },
    security: {
      resourceType: 'azurerm_user_assigned_identity',
      namePrefix: 'identity',
    },
    edge: {
      resourceType: 'azurerm_application_gateway',
      namePrefix: 'appgw',
    },
    compute: {
      resourceType: 'azurerm_linux_web_app',
      namePrefix: 'webapp',
    },
    data: {
      resourceType: 'azurerm_postgresql_flexible_server',
      namePrefix: 'pgserver',
    },
    messaging: {
      resourceType: 'azurerm_storage_queue',
      namePrefix: 'queue',
    },
    operations: {
      resourceType: 'azurerm_log_analytics_workspace',
      namePrefix: 'analytics',
    },
  },

  plateMappings: {
    global: {
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'global',
    },
    edge: {
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'edge',
    },
    region: {
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'vnet',
    },
    zone: {
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'zone',
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
