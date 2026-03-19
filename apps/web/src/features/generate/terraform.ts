import type { ArchitectureModel, Block, Plate, Connection } from '../../shared/types/index';
import type {
  GenerationOptions,
  NormalizedModel,
  ProviderAdapter,
  ResourceMapping,
  SubtypeResourceMap,
} from './types';
import { resolveBlockMapping, sanitizeIaCValue } from './types';

/**
 * Terraform HCL Generator (v0.3)
 * Based on docs/engine/generator.md
 *
 * Generates Terraform HCL from a CloudBlocks ArchitectureModel.
 * All functions are pure — same model + options → same output.
 *
 * Output files:
 *   - main.tf      — resource definitions
 *   - variables.tf — input variables
 *   - outputs.tf   — output values
 */

// ─── Resource Name Normalization ────────────────────────────

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function buildResourceName(prefix: string, entityName: string): string {
  const sanitized = sanitizeName(entityName);
  return `${prefix}_${sanitized}`;
}

// ─── Normalize Stage ────────────────────────────────────────

export function normalize(
  architecture: ArchitectureModel,
  provider: ProviderAdapter,
  subtypeBlockMappings?: SubtypeResourceMap,
): NormalizedModel {
  const resourceNames = new Map<string, string>();
  const usedNames = new Set<string>();

  function uniqueName(prefix: string, entityName: string): string {
    let name = buildResourceName(prefix, entityName);
    if (usedNames.has(name)) {
      let counter = 2;
      while (usedNames.has(`${name}_${counter}`)) counter++;
      name = `${name}_${counter}`;
    }
    usedNames.add(name);
    return name;
  }

  // Map plates
  for (const plate of architecture.plates) {
    const mapping = provider.plateMappings[plate.type];
    const name = uniqueName(mapping.namePrefix, plate.name);
    resourceNames.set(plate.id, name);
  }

  // Map blocks
  for (const block of architecture.blocks) {
    const mapping = resolveBlockMapping(
      provider.blockMappings,
      subtypeBlockMappings,
      block.category,
      block.subtype,
    )!;
    const name = uniqueName(mapping.namePrefix, block.name);
    resourceNames.set(block.id, name);
  }

  return { architecture, resourceNames };
}

// ─── Generate Stage ─────────────────────────────────────────

function generatePlateResource(
  plate: Plate,
  resourceName: string,
  mapping: ResourceMapping,
  _projectName: string,
  parentResourceName: string | null
): string {
  const lines: string[] = [];

  lines.push(`resource "${mapping.resourceType}" "${resourceName}" {`);
  lines.push(`  name                = "\${var.project_name}-${resourceName}"`);
  lines.push(`  resource_group_name = azurerm_resource_group.main.name`);
  lines.push(`  location            = azurerm_resource_group.main.location`);

  if (plate.type === 'network') {
    lines.push(`  address_space       = ["10.0.0.0/16"]`);
  }

  if (plate.type === 'subnet' && parentResourceName) {
    lines.push(
      `  virtual_network_name = azurerm_virtual_network.${parentResourceName}.name`
    );
    const cidrIndex = plate.subnetAccess === 'public' ? 1 : 2;
    lines.push(`  address_prefixes     = ["10.0.${cidrIndex}.0/24"]`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateBlockResource(
  block: Block,
  resourceName: string,
  mapping: ResourceMapping,
  _subnetResourceName: string | null
): string {
  const lines: string[] = [];

  lines.push(`resource "${mapping.resourceType}" "${resourceName}" {`);
  lines.push(`  name                = "\${var.project_name}-${resourceName}"`);
  lines.push(`  resource_group_name = azurerm_resource_group.main.name`);
  lines.push(`  location            = azurerm_resource_group.main.location`);

  switch (block.category) {
    case 'compute':
      lines.push(`  service_plan_id     = azurerm_service_plan.main.id`);
      lines.push(`  site_config {}`);
      break;
    case 'database':
      lines.push(`  administrator_login    = var.db_admin_username`);
      lines.push(`  administrator_password = var.db_admin_password`);
      lines.push(`  sku_name               = "B_Standard_B1ms"`);
      lines.push(`  version                = "14"`);
      lines.push(`  storage_mb             = 32768`);
      break;
    case 'storage':
      lines.push(`  account_tier             = "Standard"`);
      lines.push(`  account_replication_type = "LRS"`);
      break;
    case 'gateway':
      lines.push(`  # Application Gateway configuration`);
      lines.push(`  # Requires additional subnet, frontend IP, and backend pool configuration`);
      lines.push(`  sku {`);
      lines.push(`    name     = "Standard_v2"`);
      lines.push(`    tier     = "Standard_v2"`);
      lines.push(`    capacity = 1`);
      lines.push(`  }`);
      break;
    case 'function':
      lines.push(`  service_plan_id            = azurerm_service_plan.main.id`);
      lines.push(`  storage_account_name       = "\${var.project_name}funcsa"`);
      lines.push(`  storage_account_access_key = "PLACEHOLDER"`);
      lines.push(`  site_config {}`);
      break;
    case 'queue':
      lines.push(`  storage_account_name = "\${var.project_name}sa"`);
      break;
    case 'event':
      lines.push(`  # EventGrid topic configuration`);
      break;
    case 'timer':
      lines.push(`  # Logic App workflow with recurrence trigger`);
      lines.push(`  workflow_parameters = {}`);
      break;
  }

  lines.push('}');
  return lines.join('\n');
}

function generateConnectionComment(
  connection: Connection,
  resourceNames: Map<string, string>
): string {
  const sourceName = resourceNames.get(connection.sourceId) ?? connection.sourceId;
  const targetName = resourceNames.get(connection.targetId) ?? connection.targetId;
  return `# DataFlow: ${sourceName} → ${targetName}`;
}

// ─── File Assembly ──────────────────────────────────────────

export function generateMainTf(
  normalized: NormalizedModel,
  provider: ProviderAdapter,
  options: GenerationOptions,
  subtypeBlockMappings?: SubtypeResourceMap,
): string {
  const { architecture, resourceNames } = normalized;
  const sections: string[] = [];

  // Header
  sections.push('# Generated by CloudBlocks');
  sections.push(`# Provider: ${provider.displayName}`);
  sections.push(`# Project: ${options.projectName}`);
  sections.push('');

  // Required providers
  sections.push(provider.requiredProviders());
  sections.push('');

  // Provider block
  sections.push(provider.providerBlock(options.region));
  sections.push('');

  // Resource group
  sections.push('resource "azurerm_resource_group" "main" {');
  sections.push(`  name     = "\${var.project_name}-rg"`);
  sections.push('  location = var.location');
  sections.push('}');
  sections.push('');

  // Service plan (if compute or function blocks exist)
  const hasCompute = architecture.blocks.some((b) => b.category === 'compute' || b.category === 'function');
  if (hasCompute) {
    sections.push('resource "azurerm_service_plan" "main" {');
    sections.push(`  name                = "\${var.project_name}-plan"`);
    sections.push('  resource_group_name = azurerm_resource_group.main.name');
    sections.push('  location            = azurerm_resource_group.main.location');
    sections.push('  os_type             = "Linux"');
    sections.push('  sku_name            = "B1"');
    sections.push('}');
    sections.push('');
  }

  // Plates (networks first, then subnets)
  const networks = architecture.plates.filter((p) => p.type === 'network');
  const subnets = architecture.plates.filter((p) => p.type === 'subnet');

  for (const plate of networks) {
    const resName = resourceNames.get(plate.id)!;
    const mapping = provider.plateMappings[plate.type];
    sections.push(
      generatePlateResource(plate, resName, mapping, options.projectName, null)
    );
    sections.push('');
  }

  for (const plate of subnets) {
    const resName = resourceNames.get(plate.id)!;
    const mapping = provider.plateMappings[plate.type];
    const parentName = plate.parentId
      ? resourceNames.get(plate.parentId) ?? null
      : null;
    sections.push(
      generatePlateResource(plate, resName, mapping, options.projectName, parentName)
    );
    sections.push('');
  }

  // Blocks
  for (const block of architecture.blocks) {
    const resName = resourceNames.get(block.id)!;
    const mapping = resolveBlockMapping(
      provider.blockMappings,
      subtypeBlockMappings,
      block.category,
      block.subtype,
    )!;
    const subnetName = resourceNames.get(block.placementId) ?? null;
    sections.push(
      generateBlockResource(block, resName, mapping, subnetName)
    );
    sections.push('');
  }

  // Connections (as comments — actual wiring depends on resource types)
  if (architecture.connections.length > 0) {
    sections.push('# ─── Data Flow Connections ─────────────────────');
    for (const conn of architecture.connections) {
      sections.push(generateConnectionComment(conn, resourceNames));
    }
    sections.push('');
  }

  return sections.join('\n');
}

export function generateVariablesTf(options: GenerationOptions): string {
  const sections: string[] = [];

  sections.push('# Generated by CloudBlocks');
  sections.push('');
  sections.push('variable "project_name" {');
  sections.push('  description = "Project name used for resource naming"');
  sections.push('  type        = string');
  sections.push(`  default     = "${sanitizeName(options.projectName)}"`);
  sections.push('}');
  sections.push('');
  sections.push('variable "location" {');
  sections.push('  description = "Azure region for resource deployment"');
  sections.push('  type        = string');
  sections.push(`  default     = "${sanitizeIaCValue(options.region)}"`);
  sections.push('}');
  sections.push('');
  sections.push('variable "db_admin_username" {');
  sections.push('  description = "Database administrator username"');
  sections.push('  type        = string');
  sections.push('  default     = "pgadmin"');
  sections.push('}');
  sections.push('');
  sections.push('variable "db_admin_password" {');
  sections.push('  description = "Database administrator password"');
  sections.push('  type        = string');
  sections.push('  sensitive   = true');
  sections.push('}');

  return sections.join('\n');
}

export function generateOutputsTf(
  normalized: NormalizedModel,
  provider: ProviderAdapter,
  subtypeBlockMappings?: SubtypeResourceMap,
): string {
  const { architecture, resourceNames } = normalized;
  const sections: string[] = [];

  sections.push('# Generated by CloudBlocks');
  sections.push('');
  sections.push('output "resource_group_name" {');
  sections.push('  value = azurerm_resource_group.main.name');
  sections.push('}');

  // Output each block's key attribute
  for (const block of architecture.blocks) {
    const resName = resourceNames.get(block.id)!;
    const mapping = resolveBlockMapping(
      provider.blockMappings,
      subtypeBlockMappings,
      block.category,
      block.subtype,
    )!;

    sections.push('');
    sections.push(`output "${resName}_id" {`);
    sections.push(`  value = ${mapping.resourceType}.${resName}.id`);
    sections.push('}');
  }

  return sections.join('\n');
}
