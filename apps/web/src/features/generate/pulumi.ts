import type { ArchitectureModel, Block, Plate } from '@cloudblocks/schema';
import type {
  GenerationOptions,
  GeneratorPlugin,
  NormalizedModel,
  ProviderDefinition,
  ResourceMapping,
} from './types';
import { resolveBlockMapping, sanitizeIaCValue } from './types';

/**
 * Pulumi Generator (v1.0)
 *
 * Generates Pulumi TypeScript files from a CloudBlocks ArchitectureModel.
 * Uses @pulumi/azure-native for Azure resource provisioning.
 * All functions are pure — same model + options → same output.
 *
 * Output files:
 *   - index.ts    — resource definitions (TypeScript)
 *   - Pulumi.yaml — project configuration
 */

// ─── Resource Name Normalization ────────────────────────────

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[0-9]+/, '');
}

function buildResourceName(prefix: string, entityName: string): string {
  const sanitized = sanitizeName(entityName);
  return `${prefix}${sanitized.charAt(0).toUpperCase()}${sanitized.slice(1)}`;
}

// ─── Normalize ──────────────────────────────────────────────

export function normalizePulumi(
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

// ─── Pulumi Azure-Native Constructor Mapping ────────────────

const PULUMI_CONSTRUCTORS: Record<string, string> = {
  azurerm_virtual_network: 'azure.network.VirtualNetwork',
  azurerm_subnet: 'azure.network.Subnet',
  azurerm_linux_web_app: 'azure.web.WebApp',
  azurerm_postgresql_flexible_server: 'azure.dbforpostgresql.FlexibleServer',
  azurerm_storage_account: 'azure.storage.StorageAccount',
  azurerm_application_gateway: 'azure.network.ApplicationGateway',
  azurerm_linux_function_app: 'azure.web.WebApp',
  azurerm_storage_queue: 'azure.storage.Queue',
  azurerm_eventgrid_topic: 'azure.eventgrid.Topic',
  azurerm_logic_app_workflow: 'azure.logic.Workflow',
  azurerm_log_analytics_workspace: 'azure.operationalinsights.Workspace',
  azurerm_user_assigned_identity: 'azure.managedidentity.UserAssignedIdentity',
  azurerm_monitor_workspace: 'azure.monitor.AzureMonitorWorkspace',
};

function getPulumiConstructor(terraformType: string): string {
  return PULUMI_CONSTRUCTORS[terraformType] ?? 'azure.resources.GenericResource';
}

// ─── Generate Stage ─────────────────────────────────────────

function generatePlateResource(
  plate: Plate,
  resourceName: string,
  mapping: ResourceMapping,
  parentResourceName: string | null
): string {
  const constructorPath = getPulumiConstructor(mapping.resourceType);
  const lines: string[] = [];

  if (plate.type === 'subnet' && parentResourceName) {
    lines.push(`const ${resourceName} = new ${constructorPath}("${resourceName}", {`);
    lines.push(`    subnetName: \`\${projectName}-${resourceName}\`,`);
    lines.push(`    resourceGroupName: resourceGroup.name,`);
    lines.push(`    virtualNetworkName: ${parentResourceName}.name,`);
    const cidrIndex = plate.subnetAccess === 'public' ? 1 : 2;
    lines.push(`    addressPrefix: "10.0.${cidrIndex}.0/24",`);
    lines.push(`});`);
  } else {
    lines.push(`const ${resourceName} = new ${constructorPath}("${resourceName}", {`);
    lines.push(`    virtualNetworkName: \`\${projectName}-${resourceName}\`,`);
    lines.push(`    resourceGroupName: resourceGroup.name,`);
    lines.push(`    location: location,`);
    if (plate.type !== 'subnet') {
      lines.push(`    addressSpace: {`);
      lines.push(`        addressPrefixes: ["10.0.0.0/16"],`);
      lines.push(`    },`);
    }
    lines.push(`});`);
  }

  return lines.join('\n');
}

function generateBlockResource(
  block: Block,
  resourceName: string,
  mapping: ResourceMapping
): string {
  const constructorPath = getPulumiConstructor(mapping.resourceType);
  const lines: string[] = [];

  lines.push(`const ${resourceName} = new ${constructorPath}("${resourceName}", {`);
  lines.push(`    resourceGroupName: resourceGroup.name,`);
  lines.push(`    location: location,`);

  switch (block.category) {
    case 'compute':
      lines.push(`    name: \`\${projectName}-${resourceName}\`,`);
      lines.push(`    serverFarmId: servicePlan.id,`);
      lines.push(`    kind: "app,linux",`);
      lines.push(`    siteConfig: {`);
      lines.push(`        linuxFxVersion: "NODE|18-lts",`);
      lines.push(`    },`);
      break;
    case 'database':
      lines.push(`    serverName: \`\${projectName}-${resourceName}\`,`);
      lines.push(`    administratorLogin: "pgadmin",`);
      lines.push(`    administratorLoginPassword: dbAdminPassword,`);
      lines.push(`    version: "14",`);
      lines.push(`    storage: {`);
      lines.push(`        storageSizeGB: 32,`);
      lines.push(`    },`);
      lines.push(`    sku: {`);
      lines.push(`        name: "Standard_B1ms",`);
      lines.push(`        tier: "Burstable",`);
      lines.push(`    },`);
      break;
    case 'storage':
      lines.push(`    accountName: \`\${projectName}${resourceName}\`,`);
      lines.push(`    kind: "StorageV2",`);
      lines.push(`    sku: {`);
      lines.push(`        name: "Standard_LRS",`);
      lines.push(`    },`);
      break;
    case 'gateway':
      lines.push(`    applicationGatewayName: \`\${projectName}-${resourceName}\`,`);
      lines.push(`    sku: {`);
      lines.push(`        name: "Standard_v2",`);
      lines.push(`        tier: "Standard_v2",`);
      lines.push(`        capacity: 1,`);
      lines.push(`    },`);
      break;
    case 'function':
      lines.push(`    name: \`\${projectName}-${resourceName}\`,`);
      lines.push(`    serverFarmId: servicePlan.id,`);
      lines.push(`    kind: "functionapp,linux",`);
      lines.push(`    siteConfig: {`);
      lines.push(`        linuxFxVersion: "NODE|18-lts",`);
      lines.push(`    },`);
      break;
    case 'queue':
      lines.push(`    queueName: \`\${projectName}-${resourceName}\`,`);
      lines.push(`    accountName: \`\${projectName}sa\`,`);
      break;
    case 'event':
      lines.push(`    topicName: \`\${projectName}-${resourceName}\`,`);
      break;
    case 'analytics':
      lines.push(`    // Log Analytics workspace configuration`);
      break;
    case 'identity':
      lines.push(`    // Managed identity configuration`);
      break;
    case 'observability':
      lines.push(`    // Monitor workspace configuration`);
      break;
  }

  lines.push(`});`);
  return lines.join('\n');
}

// ─── File Assembly ──────────────────────────────────────────

export function generateIndexTs(
  normalized: NormalizedModel,
  provider: ProviderDefinition,
  options: GenerationOptions
): string {
  const { architecture, resourceNames } = normalized;
  const sections: string[] = [];
  const packageName = provider.generators.pulumi.packageName;

  // Header & imports
  sections.push('// Generated by CloudBlocks');
  sections.push(`// Provider: ${provider.displayName}`);
  sections.push(`// Project: ${options.projectName}`);
  sections.push('');
  sections.push(`import * as pulumi from "@pulumi/pulumi";`);
  sections.push(`import * as azure from "${packageName}";`);
  sections.push('');

  // Config
  sections.push('// ─── Configuration ───────────────────────────────────');
  sections.push(`const config = new pulumi.Config();`);
  sections.push(`const projectName = config.get("projectName") ?? "${sanitizeName(options.projectName)}";`);
  sections.push(`const location = config.get("location") ?? "${sanitizeIaCValue(options.region)}";`);
  const hasDb = architecture.blocks.some((b) => b.category === 'database');
  if (hasDb) {
    sections.push(`const dbAdminPassword = config.requireSecret("dbAdminPassword");`);
  }
  sections.push('');

  // Resource group
  sections.push('// ─── Resource Group ──────────────────────────────────');
  sections.push('const resourceGroup = new azure.resources.ResourceGroup("resourceGroup", {');
  sections.push('    resourceGroupName: `${projectName}-rg`,');
  sections.push('    location: location,');
  sections.push('});');
  sections.push('');

  // Service plan (if compute or function blocks exist)
  const hasCompute = architecture.blocks.some(
    (b) => b.category === 'compute' || b.category === 'function'
  );
  if (hasCompute) {
    sections.push('// ─── Service Plan ───────────────────────────────────');
    sections.push('const servicePlan = new azure.web.AppServicePlan("servicePlan", {');
    sections.push('    name: `${projectName}-plan`,');
    sections.push('    resourceGroupName: resourceGroup.name,');
    sections.push('    location: location,');
    sections.push('    kind: "linux",');
    sections.push('    reserved: true,');
    sections.push('    sku: {');
    sections.push('        name: "B1",');
    sections.push('        tier: "Basic",');
    sections.push('    },');
    sections.push('});');
    sections.push('');
  }

  // Plates (regions first, then subnets)
  const regions = architecture.plates.filter((p) => p.type !== 'subnet');
  const subnets = architecture.plates.filter((p) => p.type === 'subnet');

  if (regions.length > 0 || subnets.length > 0) {
    sections.push('// ─── Network ────────────────────────────────────────');
  }

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
  if (architecture.blocks.length > 0) {
    sections.push('// ─── Resources ──────────────────────────────────────');
  }

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

  // Exports
  sections.push('// ─── Exports ────────────────────────────────────────');
  sections.push('export const resourceGroupName = resourceGroup.name;');
  for (const block of architecture.blocks) {
    const resName = resourceNames.get(block.id)!;
    sections.push(`export const ${resName}Id = ${resName}.id;`);
  }
  sections.push('');

  return sections.join('\n');
}

export function generatePulumiYaml(options: GenerationOptions): string {
  const sections: string[] = [];
  sections.push('# Generated by CloudBlocks');
  sections.push(`name: ${sanitizeName(options.projectName)}`);
  sections.push('runtime: nodejs');
  sections.push('description: CloudBlocks generated Pulumi project');
  sections.push('');
  return sections.join('\n');
}

// ─── Plugin ─────────────────────────────────────────────────

export const pulumiPlugin: GeneratorPlugin = {
  id: 'pulumi',
  displayName: 'Pulumi (TypeScript)',
  supportedProviders: ['azure'],

  filePlan: () => [
    { path: 'index.ts', language: 'typescript' },
    { path: 'Pulumi.yaml', language: 'yaml' },
  ],

  normalize: (arch, ctx) => normalizePulumi(arch, ctx.provider),

  generate: (model, ctx) => {
    const indexTs = generateIndexTs(model, ctx.provider, ctx.options);
    const pulumiYaml = generatePulumiYaml(ctx.options);

    return {
      files: [
        { path: 'index.ts', content: indexTs, language: 'typescript' },
        { path: 'Pulumi.yaml', content: pulumiYaml, language: 'yaml' },
      ],
      metadata: {
        generator: 'pulumi',
        version: '1.0.0',
        provider: ctx.options.provider,
        generatedAt: new Date().toISOString(),
      },
    };
  },
};
