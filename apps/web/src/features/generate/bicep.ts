import type { ArchitectureModel, Block, Plate } from '../../shared/types/index';
import type {
  GenerationOptions,
  GeneratorPlugin,
  NormalizedModel,
  ProviderDefinition,
  ResourceMapping,
} from './types';
import { resolveBlockMapping, sanitizeIaCValue } from './types';

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

// ─── Normalize ──────────────────────────────────────────────

export function normalizeBicep(
  architecture: ArchitectureModel,
  provider: ProviderDefinition
): NormalizedModel {
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

  for (const plate of architecture.plates) {
    const mapping = provider.plateMappings[plate.type];
    const name = uniqueName(mapping.namePrefix, plate.name);
    resourceNames.set(plate.id, name);
  }

  for (const block of architecture.blocks) {
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
  azurerm_postgresql_flexible_server: 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview',
  azurerm_storage_account: 'Microsoft.Storage/storageAccounts@2023-01-01',
  azurerm_application_gateway: 'Microsoft.Network/applicationGateways@2023-05-01',
  azurerm_linux_function_app: 'Microsoft.Web/sites@2023-01-01',
  azurerm_storage_queue: 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01',
  azurerm_eventgrid_topic: 'Microsoft.EventGrid/topics@2023-12-15-preview',
  azurerm_logic_app_workflow: 'Microsoft.Logic/workflows@2019-05-01',
};

function getBicepResourceType(terraformType: string): string {
  return BICEP_RESOURCE_TYPES[terraformType] ?? terraformType;
}

// ─── Generate Stage ─────────────────────────────────────────

function generatePlateResource(
  plate: Plate,
  resourceName: string,
  mapping: ResourceMapping,
  parentResourceName: string | null
): string {
  const bicepType = getBicepResourceType(mapping.resourceType);
  const lines: string[] = [];

  if (plate.type === 'subnet' && parentResourceName) {
    // Subnets are nested resources in Bicep
    lines.push(`resource ${resourceName} '${bicepType}' = {`);
    lines.push(`  parent: ${parentResourceName}`);
    lines.push(`  name: '\${projectName}-${resourceName}'`);
    lines.push(`  properties: {`);
    const cidrIndex = plate.subnetAccess === 'public' ? 1 : 2;
    lines.push(`    addressPrefix: '10.0.${cidrIndex}.0/24'`);
    lines.push(`  }`);
    lines.push(`}`);
  } else {
    lines.push(`resource ${resourceName} '${bicepType}' = {`);
    lines.push(`  name: '\${projectName}-${resourceName}'`);
    lines.push(`  location: location`);
    lines.push(`  properties: {`);
    if (plate.type === 'region') {
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
  block: Block,
  resourceName: string,
  mapping: ResourceMapping
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
    case 'database':
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
    case 'storage':
      lines.push(`  kind: 'StorageV2'`);
      lines.push(`  sku: {`);
      lines.push(`    name: 'Standard_LRS'`);
      lines.push(`  }`);
      lines.push(`  properties: {}`);
      break;
    case 'gateway':
      lines.push(`  properties: {`);
      lines.push(`    sku: {`);
      lines.push(`      name: 'Standard_v2'`);
      lines.push(`      tier: 'Standard_v2'`);
      lines.push(`      capacity: 1`);
      lines.push(`    }`);
      lines.push(`  }`);
      break;
    case 'function':
      lines.push(`  kind: 'functionapp,linux'`);
      lines.push(`  properties: {`);
      lines.push(`    serverFarmId: servicePlan.id`);
      lines.push(`    siteConfig: {`);
      lines.push(`      linuxFxVersion: 'NODE|18-lts'`);
      lines.push(`    }`);
      lines.push(`  }`);
      break;
    case 'queue':
      lines.push(`  properties: {}`);
      break;
    case 'event':
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
  options: GenerationOptions
): string {
  const { architecture, resourceNames } = normalized;
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
  const hasDb = architecture.blocks.some((b) => b.category === 'database');
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
  const hasCompute = architecture.blocks.some(
    (b) => b.category === 'compute' || b.category === 'function'
  );
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
  const regions = architecture.plates.filter((p) => p.type === 'region');
  const subnets = architecture.plates.filter((p) => p.type === 'subnet');

  for (const plate of regions) {
    const resName = resourceNames.get(plate.id)!;
    const mapping = provider.plateMappings[plate.type];
    sections.push(generatePlateResource(plate, resName, mapping, null));
    sections.push('');
  }

  for (const plate of subnets) {
    const resName = resourceNames.get(plate.id)!;
    const mapping = provider.plateMappings[plate.type];
    const parentName = plate.parentId
      ? resourceNames.get(plate.parentId) ?? null
      : null;
    sections.push(generatePlateResource(plate, resName, mapping, parentName));
    sections.push('');
  }

  // Blocks
  for (const block of architecture.blocks) {
    const resName = resourceNames.get(block.id)!;
    const mapping = resolveBlockMapping(
      provider.blockMappings,
      provider.subtypeBlockMappings,
      block.category,
      block.subtype,
    )!;
    sections.push(generateBlockResource(block, resName, mapping));
    sections.push('');
  }

  // Outputs
  sections.push('// ─── Outputs ─────────────────────────────────────');
  for (const block of architecture.blocks) {
    const resName = resourceNames.get(block.id)!;
    sections.push(`output ${resName}Id string = ${resName}.id`);
  }
  sections.push('');

  return sections.join('\n');
}

export function generateParametersBicepparam(options: GenerationOptions): string {
  const sections: string[] = [];
  sections.push('// Generated by CloudBlocks');
  sections.push('using \'./main.bicep\'');
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
        version: '1.0.0',
        provider: ctx.options.provider,
        generatedAt: new Date().toISOString(),
      },
    };
  },
};
