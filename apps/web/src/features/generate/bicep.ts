import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
import type {
  GenerationOptions,
  GeneratorPlugin,
  NormalizedModel,
  ProviderDefinition,
  ResourceMapping,
} from './types';
import { GENERATOR_METADATA_VERSION, resolveBlockMapping, sanitizeIaCValue } from './types';

/**
 * Bicep Generator (v1.0)
 *
 * Generates Azure Bicep files from a CloudBlocks ArchitectureModel.
 * All functions are pure — same model + options → same output.
 *
 * Output files:
 *   - main.bicep          — resource definitions
 *   - parameters.bicepparam — parameter values
 */

// ─── Resource Name Normalization ────────────────────────────

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^[0-9]+/, '');
}

function buildResourceName(prefix: string, entityName: string): string {
  const sanitized = sanitizeName(entityName);
  return `${prefix}${sanitized.charAt(0).toUpperCase()}${sanitized.slice(1)}`;
}

function getPlateType(plate: ContainerNode): 'global' | 'edge' | 'region' | 'zone' | 'subnet' {
  if (plate.layer === 'resource') {
    return 'region';
  }
  return plate.layer;
}

// ─── Normalize ──────────────────────────────────────────────

export function normalizeBicep(
  architecture: ArchitectureModel,
  provider: ProviderDefinition,
): NormalizedModel {
  const containers = architecture.nodes.filter((n): n is ContainerNode => n.kind === 'container');
  const resources = architecture.nodes.filter((n): n is LeafNode => n.kind === 'resource');
  const resourceNames = new Map<string, string>();
  const usedNames = new Set<string>();

  function uniqueName(prefix: string, entityName: string): string {
    let name = buildResourceName(prefix, entityName);
    if (usedNames.has(name)) {
      let counter = 2;
      while (usedNames.has(`${name}${counter}`)) counter++;
      name = `${name}${counter}`;
    }
    usedNames.add(name);
    return name;
  }

  for (const plate of containers) {
    const mapping = provider.plateMappings[getPlateType(plate)];
    const name = uniqueName(mapping.namePrefix, plate.name);
    resourceNames.set(plate.id, name);
  }

  for (const block of resources) {
    const mapping = resolveBlockMapping(
      provider.blockMappings,
      provider.subtypeBlockMappings,
      block.category,
      block.subtype,
    )!;
    const name = uniqueName(mapping.namePrefix, block.name);
    resourceNames.set(block.id, name);
  }

  return { architecture, resourceNames };
}

// ─── Bicep Resource Type Mapping ────────────────────────────

const BICEP_RESOURCE_TYPES: Record<string, string> = {
  azurerm_virtual_network: 'Microsoft.Network/virtualNetworks@2023-05-01',
  azurerm_subnet: 'Microsoft.Network/virtualNetworks/subnets@2023-05-01',
  azurerm_linux_web_app: 'Microsoft.Web/sites@2023-01-01',
  azurerm_postgresql_flexible_server:
    'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview',
  azurerm_storage_account: 'Microsoft.Storage/storageAccounts@2023-01-01',
  azurerm_application_gateway: 'Microsoft.Network/applicationGateways@2023-05-01',
  azurerm_linux_function_app: 'Microsoft.Web/sites@2023-01-01',
  azurerm_storage_queue: 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01',
  azurerm_eventgrid_topic: 'Microsoft.EventGrid/topics@2023-12-15-preview',
  azurerm_logic_app_workflow: 'Microsoft.Logic/workflows@2019-05-01',
  azurerm_log_analytics_workspace: 'Microsoft.OperationalInsights/workspaces@2023-09-01',
  azurerm_user_assigned_identity: 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31',
  azurerm_monitor_workspace: 'Microsoft.Monitor/accounts@2023-04-03',
  azurerm_public_ip: 'Microsoft.Network/publicIPAddresses@2023-05-01',
  azurerm_network_interface: 'Microsoft.Network/networkInterfaces@2023-05-01',
};

function getBicepResourceType(terraformType: string): string {
  return BICEP_RESOURCE_TYPES[terraformType] ?? terraformType;
}

// ─── Implicit Companion Resources ───────────────────────────

function generateImplicitBicepResources(block: LeafNode, resourceName: string): string[] {
  const sections: string[] = [];

  const needsPip =
    (block.category === 'compute' && block.subtype === 'vm') ||
    (block.category === 'edge' && block.subtype === 'firewall');

  const needsNic = block.category === 'compute' && block.subtype === 'vm';

  if (needsPip) {
    const pipName = `${resourceName}Pip`;
    const pipType = getBicepResourceType('azurerm_public_ip');
    sections.push(`resource ${pipName} '${pipType}' = {`);
    sections.push(`  name: '\${projectName}-${pipName}'`);
    sections.push(`  location: location`);
    sections.push(`  sku: {`);
    sections.push(`    name: 'Standard'`);
    sections.push(`  }`);
    sections.push(`  properties: {`);
    sections.push(`    publicIPAllocationMethod: 'Static'`);
    sections.push(`  }`);
    sections.push(`}`);
    sections.push('');
  }

  if (needsNic) {
    const nicName = `${resourceName}Nic`;
    const pipName = `${resourceName}Pip`;
    const nicType = getBicepResourceType('azurerm_network_interface');
    sections.push(`resource ${nicName} '${nicType}' = {`);
    sections.push(`  name: '\${projectName}-${nicName}'`);
    sections.push(`  location: location`);
    sections.push(`  properties: {`);
    sections.push(`    ipConfigurations: [`);
    sections.push(`      {`);
    sections.push(`        name: 'internal'`);
    sections.push(`        properties: {`);
    sections.push(`          privateIPAllocationMethod: 'Dynamic'`);
    sections.push(`          publicIPAddress: {`);
    sections.push(`            id: ${pipName}.id`);
    sections.push(`          }`);
    sections.push(`        }`);
    sections.push(`      }`);
    sections.push(`    ]`);
    sections.push(`  }`);
    sections.push(`}`);
    sections.push('');
  }

  return sections;
}

// ─── Generate Stage ─────────────────────────────────────────

function generatePlateResource(
  plate: ContainerNode,
  resourceName: string,
  mapping: ResourceMapping,
  parentResourceName: string | null,
  architecture: ArchitectureModel,
): string {
  const bicepType = getBicepResourceType(mapping.resourceType);
  const lines: string[] = [];

  if (plate.layer === 'subnet' && parentResourceName) {
    // Subnets are nested resources in Bicep
    lines.push(`resource ${resourceName} '${bicepType}' = {`);
    lines.push(`  parent: ${parentResourceName}`);
    lines.push(`  name: '\${projectName}-${resourceName}'`);
    lines.push(`  properties: {`);
    const containers = architecture.nodes.filter((n): n is ContainerNode => n.kind === 'container');
    const siblingSubnets = containers.filter(
      (c) => c.layer === 'subnet' && c.parentId === plate.parentId,
    );
    const cidrIndex = siblingSubnets.findIndex((c) => c.id === plate.id) + 1;
    lines.push(`    addressPrefix: '10.0.${cidrIndex}.0/24'`);
    lines.push(`  }`);
    lines.push(`}`);
  } else {
    lines.push(`resource ${resourceName} '${bicepType}' = {`);
    lines.push(`  name: '\${projectName}-${resourceName}'`);
    lines.push(`  location: location`);
    lines.push(`  properties: {`);
    if (plate.layer !== 'subnet') {
      lines.push(`    addressSpace: {`);
      lines.push(`      addressPrefixes: [`);
      lines.push(`        '10.0.0.0/16'`);
      lines.push(`      ]`);
      lines.push(`    }`);
    }
    lines.push(`  }`);
    lines.push(`}`);
  }

  return lines.join('\n');
}

function generateBlockResource(
  block: LeafNode,
  resourceName: string,
  mapping: ResourceMapping,
): string {
  const bicepType = getBicepResourceType(mapping.resourceType);
  const lines: string[] = [];

  lines.push(`resource ${resourceName} '${bicepType}' = {`);
  lines.push(`  name: '\${projectName}-${resourceName}'`);
  lines.push(`  location: location`);

  switch (block.category) {
    case 'compute':
      lines.push(`  kind: 'app,linux'`);
      lines.push(`  properties: {`);
      lines.push(`    serverFarmId: servicePlan.id`);
      lines.push(`    siteConfig: {`);
      lines.push(`      linuxFxVersion: 'NODE|18-lts'`);
      lines.push(`    }`);
      lines.push(`  }`);
      break;
    case 'data':
      lines.push(`  properties: {`);
      lines.push(`    administratorLogin: dbAdminUsername`);
      lines.push(`    administratorLoginPassword: dbAdminPassword`);
      lines.push(`    version: '14'`);
      lines.push(`    storage: {`);
      lines.push(`      storageSizeGB: 32`);
      lines.push(`    }`);
      lines.push(`    sku: {`);
      lines.push(`      name: 'Standard_B1ms'`);
      lines.push(`      tier: 'Burstable'`);
      lines.push(`    }`);
      lines.push(`  }`);
      break;
    case 'network':
      lines.push(`  properties: {}`);
      break;
    case 'edge':
      lines.push(`  properties: {`);
      lines.push(`    sku: {`);
      lines.push(`      name: 'Standard_v2'`);
      lines.push(`      tier: 'Standard_v2'`);
      lines.push(`      capacity: 1`);
      lines.push(`    }`);
      lines.push(`  }`);
      break;
    case 'messaging':
      lines.push(`  kind: 'StorageV2'`);
      lines.push(`  sku: {`);
      lines.push(`    name: 'Standard_LRS'`);
      lines.push(`  }`);
      lines.push(`  properties: {}`);
      break;
    case 'operations':
      lines.push(`  properties: {}`);
      break;
    case 'security':
      lines.push(`  properties: {}`);
      break;
  }

  lines.push(`}`);
  return lines.join('\n');
}

// ─── File Assembly ──────────────────────────────────────────

export function generateMainBicep(
  normalized: NormalizedModel,
  provider: ProviderDefinition,
  options: GenerationOptions,
): string {
  const { architecture, resourceNames } = normalized;
  const containers = architecture.nodes.filter((n): n is ContainerNode => n.kind === 'container');
  const resources = architecture.nodes.filter((n): n is LeafNode => n.kind === 'resource');
  const sections: string[] = [];

  // Header
  sections.push('// Generated by CloudBlocks');
  sections.push(`// Provider: ${provider.displayName}`);
  sections.push(`// Project: ${options.projectName}`);
  sections.push(`// Target scope: ${provider.generators.bicep.targetScope}`);
  sections.push('');

  // Parameters
  sections.push(`param projectName string = '${sanitizeName(options.projectName)}'`);
  sections.push(`param location string = '${sanitizeIaCValue(options.region)}'`);
  const hasDb = resources.some((b) => b.category === 'data');
  if (hasDb) {
    sections.push(`param dbAdminUsername string = 'pgadmin'`);
    sections.push('@secure()');
    sections.push('param dbAdminPassword string');
  }
  sections.push('');

  // Resource group reference (when targetScope is resourceGroup, it's implicit)
  sections.push('// Resources are deployed to the target resource group');
  sections.push('');

  // Service plan (if compute or function blocks exist)
  const hasCompute = resources.some((b) => b.category === 'compute');
  if (hasCompute) {
    sections.push(`resource servicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {`);
    sections.push(`  name: '\${projectName}-plan'`);
    sections.push(`  location: location`);
    sections.push(`  kind: 'linux'`);
    sections.push(`  sku: {`);
    sections.push(`    name: 'B1'`);
    sections.push(`    tier: 'Basic'`);
    sections.push(`  }`);
    sections.push(`  properties: {`);
    sections.push(`    reserved: true`);
    sections.push(`  }`);
    sections.push(`}`);
    sections.push('');
  }

  // Plates (regions first, then subnets)
  const regions = containers.filter((p) => p.layer !== 'subnet');
  const subnets = containers.filter((p) => p.layer === 'subnet');

  for (const plate of regions) {
    const resName = resourceNames.get(plate.id)!;
    const mapping = provider.plateMappings[getPlateType(plate)];
    sections.push(generatePlateResource(plate, resName, mapping, null, architecture));
    sections.push('');
  }

  for (const plate of subnets) {
    const resName = resourceNames.get(plate.id)!;
    const mapping = provider.plateMappings[getPlateType(plate)];
    const parentName = plate.parentId ? (resourceNames.get(plate.parentId) ?? null) : null;
    sections.push(generatePlateResource(plate, resName, mapping, parentName, architecture));
    sections.push('');
  }

  // Blocks
  for (const block of resources) {
    const resName = resourceNames.get(block.id)!;
    const mapping = resolveBlockMapping(
      provider.blockMappings,
      provider.subtypeBlockMappings,
      block.category,
      block.subtype,
    )!;

    const implicitSections = generateImplicitBicepResources(block, resName);
    for (const section of implicitSections) {
      sections.push(section);
    }

    sections.push(generateBlockResource(block, resName, mapping));
    sections.push('');
  }

  // Outputs
  sections.push('// ─── Outputs ─────────────────────────────────────');
  for (const block of resources) {
    const resName = resourceNames.get(block.id)!;
    sections.push(`output ${resName}Id string = ${resName}.id`);
  }
  sections.push('');

  return sections.join('\n');
}

export function generateParametersBicepparam(options: GenerationOptions): string {
  const sections: string[] = [];
  sections.push('// Generated by CloudBlocks');
  sections.push("using './main.bicep'");
  sections.push('');
  sections.push(`param projectName = '${sanitizeName(options.projectName)}'`);
  sections.push(`param location = '${sanitizeIaCValue(options.region)}'`);
  sections.push('');
  return sections.join('\n');
}

// ─── Plugin ─────────────────────────────────────────────────

export const bicepPlugin: GeneratorPlugin = {
  id: 'bicep',
  displayName: 'Bicep (Azure)',
  supportedProviders: ['azure'],

  filePlan: () => [
    { path: 'main.bicep', language: 'bicep' },
    { path: 'parameters.bicepparam', language: 'bicep' },
  ],

  normalize: (arch, ctx) => normalizeBicep(arch, ctx.provider),

  generate: (model, ctx) => {
    const mainBicep = generateMainBicep(model, ctx.provider, ctx.options);
    const params = generateParametersBicepparam(ctx.options);

    return {
      files: [
        { path: 'main.bicep', content: mainBicep, language: 'bicep' },
        { path: 'parameters.bicepparam', content: params, language: 'bicep' },
      ],
      metadata: {
        generator: 'bicep',
        version: GENERATOR_METADATA_VERSION,
        provider: ctx.options.provider,
        generatedAt: new Date().toISOString(),
      },
    };
  },
};
