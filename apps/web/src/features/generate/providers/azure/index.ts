import type {
  BlockResourceMap,
  ProviderDefinition,
  SubtypeResourceMap,
  TerraformBlockContext,
  TerraformContainerContext,
} from '../../types';
import { resolveBlockMapping } from '../../types';
import { isExternalResourceType } from '@cloudblocks/schema';

function buildAzureContainerBody(ctx: TerraformContainerContext): string[] {
  const lines: string[] = [];

  lines.push(`  name                = "\${var.project_name}-${ctx.resourceName}"`);
  lines.push('  resource_group_name = azurerm_resource_group.main.name');
  lines.push('  location            = azurerm_resource_group.main.location');

  if (ctx.container.layer !== 'subnet') {
    lines.push('  address_space       = ["10.0.0.0/16"]');
  }

  if (ctx.container.layer === 'subnet' && ctx.parentResourceName) {
    lines.push(`  virtual_network_name = azurerm_virtual_network.${ctx.parentResourceName}.name`);

    const containers = ctx.normalized.architecture.nodes.filter((n) => n.kind === 'container');
    const siblingSubnets = containers.filter(
      (container) => container.layer === 'subnet' && container.parentId === ctx.container.parentId,
    );
    const cidrIndex =
      siblingSubnets.findIndex((container) => container.id === ctx.container.id) + 1;
    lines.push(`  address_prefixes     = ["10.0.${cidrIndex}.0/24"]`);
  }

  return lines;
}

function buildAzureImplicitResources(ctx: TerraformBlockContext): string[] {
  const sections: string[] = [];

  const needsPip =
    (ctx.block.category === 'compute' && ctx.block.subtype === 'vm') ||
    (ctx.block.category === 'delivery' && ctx.block.subtype === 'firewall');
  const needsNic = ctx.block.category === 'compute' && ctx.block.subtype === 'vm';

  if (needsPip) {
    const pipName = `${ctx.resourceName}_pip`;
    sections.push(`resource "azurerm_public_ip" "${pipName}" {`);
    sections.push(`  name                = "\${var.project_name}-${pipName}"`);
    sections.push('  resource_group_name = azurerm_resource_group.main.name');
    sections.push('  location            = azurerm_resource_group.main.location');
    sections.push('  allocation_method   = "Static"');
    sections.push('  sku                 = "Standard"');
    sections.push('}');
    sections.push('');
  }

  if (needsNic) {
    const nicName = `${ctx.resourceName}_nic`;
    const pipName = `${ctx.resourceName}_pip`;
    sections.push(`resource "azurerm_network_interface" "${nicName}" {`);
    sections.push(`  name                = "\${var.project_name}-${nicName}"`);
    sections.push('  resource_group_name = azurerm_resource_group.main.name');
    sections.push('  location            = azurerm_resource_group.main.location');
    sections.push('');
    sections.push('  ip_configuration {');
    sections.push('    name                          = "internal"');
    sections.push('    private_ip_address_allocation = "Dynamic"');
    if (ctx.parentResourceName) {
      sections.push(
        `    subnet_id                      = azurerm_subnet.${ctx.parentResourceName}.id`,
      );
    }
    sections.push(`    public_ip_address_id          = azurerm_public_ip.${pipName}.id`);
    sections.push('  }');
    sections.push('}');
    sections.push('');
  }

  return sections;
}

function buildAzureBlockBody(ctx: TerraformBlockContext): string[] {
  const lines: string[] = [];

  lines.push(`  name                = "\${var.project_name}-${ctx.resourceName}"`);
  lines.push('  resource_group_name = azurerm_resource_group.main.name');
  lines.push('  location            = azurerm_resource_group.main.location');

  switch (ctx.mapping.resourceType) {
    case 'azurerm_linux_web_app':
    case 'azurerm_linux_function_app':
      lines.push('  service_plan_id     = azurerm_service_plan.main.id');
      lines.push('  site_config {}');
      break;
    case 'azurerm_linux_virtual_machine':
      lines.push('  size                = "Standard_B2s"');
      lines.push('  admin_username      = var.db_admin_username');
      lines.push(
        `  network_interface_ids = [azurerm_network_interface.${ctx.resourceName}_nic.id]`,
      );
      lines.push('  os_disk {');
      lines.push('    caching              = "ReadWrite"');
      lines.push('    storage_account_type = "Standard_LRS"');
      lines.push('  }');
      break;
    case 'azurerm_postgresql_flexible_server':
      lines.push('  administrator_login    = var.db_admin_username');
      lines.push('  administrator_password = var.db_admin_password');
      lines.push('  sku_name               = "B_Standard_B1ms"');
      lines.push('  version                = "14"');
      lines.push('  storage_mb             = 32768');
      break;
    case 'azurerm_mssql_database':
      lines.push('  # SQL Database requires an azurerm_mssql_server parent');
      lines.push('  sku_name = "S0"');
      break;
    case 'azurerm_cosmosdb_account':
      lines.push('  offer_type          = "Standard"');
      lines.push('  kind                = "GlobalDocumentDB"');
      lines.push('  consistency_policy {');
      lines.push('    consistency_level = "Session"');
      lines.push('  }');
      lines.push('  geo_location {');
      lines.push('    location          = azurerm_resource_group.main.location');
      lines.push('    failover_priority = 0');
      lines.push('  }');
      break;
    case 'azurerm_storage_account':
      lines.push('  account_tier             = "Standard"');
      lines.push('  account_replication_type = "LRS"');
      break;
    case 'azurerm_application_gateway':
      lines.push('  # Application Gateway configuration');
      lines.push('  # Requires additional subnet, frontend IP, and backend pool configuration');
      lines.push('  sku {');
      lines.push('    name     = "Standard_v2"');
      lines.push('    tier     = "Standard_v2"');
      lines.push('    capacity = 1');
      lines.push('  }');
      break;
    case 'azurerm_storage_queue':
      lines.push('  account_tier             = "Standard"');
      lines.push('  account_replication_type = "LRS"');
      break;
    case 'azurerm_virtual_network':
      lines.push('  # Network resource configuration');
      break;
    case 'azurerm_user_assigned_identity':
      lines.push('  # Managed identity configuration');
      break;
    default:
      lines.push(`  # Configure ${ctx.mapping.resourceType}`);
      break;
  }

  return lines;
}

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
  delivery: {
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
    'timer-trigger': { resourceType: 'azurerm_linux_function_app', namePrefix: 'timer' },
  },
  security: {
    'managed-identity': { resourceType: 'azurerm_user_assigned_identity', namePrefix: 'identity' },
    nsg: { resourceType: 'azurerm_network_security_group', namePrefix: 'nsg' },
    network_security_group: { resourceType: 'azurerm_network_security_group', namePrefix: 'nsg' },
    firewall_security: { resourceType: 'azurerm_firewall', namePrefix: 'fw' },
    key_vault: { resourceType: 'azurerm_key_vault', namePrefix: 'kv' },
    bastion_host: { resourceType: 'azurerm_bastion_host', namePrefix: 'bastion' },
  },
  identity: {
    'managed-identity': { resourceType: 'azurerm_user_assigned_identity', namePrefix: 'identity' },
    managed_identity: { resourceType: 'azurerm_user_assigned_identity', namePrefix: 'identity' },
    'service-principal': { resourceType: 'azuread_service_principal', namePrefix: 'sp' },
    service_principal: { resourceType: 'azuread_service_principal', namePrefix: 'sp' },
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

const azureBlockMappings: BlockResourceMap = {
  network: {
    resourceType: 'azurerm_virtual_network',
    namePrefix: 'network',
  },
  security: {
    resourceType: 'azurerm_user_assigned_identity',
    namePrefix: 'identity',
  },
  identity: {
    resourceType: 'azurerm_user_assigned_identity',
    namePrefix: 'identity',
  },
  delivery: {
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
};

const servicePlanResourceTypes = new Set(['azurerm_linux_web_app', 'azurerm_linux_function_app']);

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
 * ContainerBlock Mappings:
 *   global/edge/region/zone → azurerm_virtual_network / Microsoft.Network/virtualNetworks
 *   subnet                  → azurerm_subnet / Microsoft.Network/virtualNetworks/subnets
 */

export const azureProviderDefinition: ProviderDefinition = {
  name: 'azure',
  displayName: 'Azure',

  blockMappings: azureBlockMappings,

  containerLayerMappings: {
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
        ['provider "azurerm" {', '  features {}', `  # region: ${region}`, '}'].join('\n'),
      regionVariableDescription: 'Azure region for resource deployment',
      renderSharedResources: (ctx) => {
        const lines: string[] = [];
        const resources = ctx.normalized.architecture.nodes.filter(
          (node) => node.kind === 'resource' && !isExternalResourceType(node.resourceType),
        );

        lines.push('resource "azurerm_resource_group" "main" {');
        lines.push('  name     = "${var.project_name}-rg"');
        lines.push('  location = var.location');
        lines.push('}');
        lines.push('');

        const needsServicePlan = resources.some((resource) => {
          const mapping = resolveBlockMapping(
            azureBlockMappings,
            azureSubtypeBlockMappings,
            resource.category,
            resource.subtype,
          );
          return mapping !== undefined && servicePlanResourceTypes.has(mapping.resourceType);
        });
        if (needsServicePlan) {
          lines.push('resource "azurerm_service_plan" "main" {');
          lines.push('  name                = "${var.project_name}-plan"');
          lines.push('  resource_group_name = azurerm_resource_group.main.name');
          lines.push('  location            = azurerm_resource_group.main.location');
          lines.push('  os_type             = "Linux"');
          lines.push('  sku_name            = "B1"');
          lines.push('}');
          lines.push('');
        }

        return lines;
      },
      renderContainerBody: (ctx) => buildAzureContainerBody(ctx),
      renderBlockCompanions: (ctx) => buildAzureImplicitResources(ctx),
      renderBlockBody: (ctx) => buildAzureBlockBody(ctx),
      extraOutputs: () => [
        {
          name: 'resource_group_name',
          value: 'azurerm_resource_group.main.name',
        },
      ],
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
