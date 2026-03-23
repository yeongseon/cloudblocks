import type {
  ArchitectureModel,
  Connection,
  ContainerNode,
  Endpoint,
  LeafNode,
} from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import type {
  GenerationOptions,
  NormalizedModel,
  ProviderDefinition,
  ResourceMapping,
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

function getPlateType(plate: ContainerNode): 'global' | 'edge' | 'region' | 'zone' | 'subnet' {
  if (plate.layer === 'resource') {
    return 'region';
  }
  return plate.layer;
}

// ─── Normalize Stage ────────────────────────────────────────

export function normalize(
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
      while (usedNames.has(`${name}_${counter}`)) counter++;
      name = `${name}_${counter}`;
    }
    usedNames.add(name);
    return name;
  }

  // Map plates
  for (const plate of containers) {
    const mapping = provider.plateMappings[getPlateType(plate)];
    const name = uniqueName(mapping.namePrefix, plate.name);
    resourceNames.set(plate.id, name);
  }

  // Map blocks
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

// ─── Implicit Companion Resources ───────────────────────────

/**
 * Generate implicit companion resources (PIP, NIC) for blocks that require them.
 * These are Azure resources that always accompany certain parent resources
 * but don't need explicit canvas placement.
 *
 * Rules:
 *   - VM (compute, subtype='vm') → PIP + NIC (PIP before NIC, NIC references PIP)
 *   - Firewall (edge, subtype='firewall') → PIP only
 *   - Internal LB (edge, subtype='internal-lb') → no implicit resources (internal)
 */
function generateImplicitResources(block: LeafNode, resourceName: string): string[] {
  const sections: string[] = [];

  const needsPip =
    (block.category === 'compute' && block.subtype === 'vm') ||
    (block.category === 'edge' && block.subtype === 'firewall');

  const needsNic = block.category === 'compute' && block.subtype === 'vm';

  if (needsPip) {
    const pipName = `${resourceName}_pip`;
    sections.push(`resource "azurerm_public_ip" "${pipName}" {`);
    sections.push(`  name                = "\${var.project_name}-${pipName}"`);
    sections.push(`  resource_group_name = azurerm_resource_group.main.name`);
    sections.push(`  location            = azurerm_resource_group.main.location`);
    sections.push(`  allocation_method   = "Static"`);
    sections.push(`  sku                 = "Standard"`);
    sections.push('}');
    sections.push('');
  }

  if (needsNic) {
    const nicName = `${resourceName}_nic`;
    const pipName = `${resourceName}_pip`;
    sections.push(`resource "azurerm_network_interface" "${nicName}" {`);
    sections.push(`  name                = "\${var.project_name}-${nicName}"`);
    sections.push(`  resource_group_name = azurerm_resource_group.main.name`);
    sections.push(`  location            = azurerm_resource_group.main.location`);
    sections.push('');
    sections.push(`  ip_configuration {`);
    sections.push(`    name                          = "internal"`);
    sections.push(`    private_ip_address_allocation = "Dynamic"`);
    sections.push(`    public_ip_address_id          = azurerm_public_ip.${pipName}.id`);
    sections.push(`  }`);
    sections.push('}');
    sections.push('');
  }

  return sections;
}

// ─── Generate Stage ─────────────────────────────────────────

function generatePlateResource(
  plate: ContainerNode,
  resourceName: string,
  mapping: ResourceMapping,
  _projectName: string,
  parentResourceName: string | null,
  architecture: ArchitectureModel,
): string {
  const lines: string[] = [];

  lines.push(`resource "${mapping.resourceType}" "${resourceName}" {`);
  lines.push(`  name                = "\${var.project_name}-${resourceName}"`);
  lines.push(`  resource_group_name = azurerm_resource_group.main.name`);
  lines.push(`  location            = azurerm_resource_group.main.location`);

  if (plate.layer !== 'subnet') {
    lines.push(`  address_space       = ["10.0.0.0/16"]`);
  }

  if (plate.layer === 'subnet' && parentResourceName) {
    lines.push(`  virtual_network_name = azurerm_virtual_network.${parentResourceName}.name`);
    // Assign sequential CIDR index based on subnet order under parent VNet
    const containers = architecture.nodes.filter((n): n is ContainerNode => n.kind === 'container');
    const siblingSubnets = containers.filter(
      (c) => c.layer === 'subnet' && c.parentId === plate.parentId,
    );
    const cidrIndex = siblingSubnets.findIndex((c) => c.id === plate.id) + 1;
    lines.push(`  address_prefixes     = ["10.0.${cidrIndex}.0/24"]`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateBlockResource(
  block: LeafNode,
  resourceName: string,
  mapping: ResourceMapping,
  _subnetResourceName: string | null,
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
    case 'data':
      lines.push(`  administrator_login    = var.db_admin_username`);
      lines.push(`  administrator_password = var.db_admin_password`);
      lines.push(`  sku_name               = "B_Standard_B1ms"`);
      lines.push(`  version                = "14"`);
      lines.push(`  storage_mb             = 32768`);
      break;
    case 'network':
      lines.push(`  # Network resource configuration`);
      break;
    case 'edge':
      lines.push(`  # Application Gateway configuration`);
      lines.push(`  # Requires additional subnet, frontend IP, and backend pool configuration`);
      lines.push(`  sku {`);
      lines.push(`    name     = "Standard_v2"`);
      lines.push(`    tier     = "Standard_v2"`);
      lines.push(`    capacity = 1`);
      lines.push(`  }`);
      break;
    case 'messaging':
      lines.push(`  account_tier             = "Standard"`);
      lines.push(`  account_replication_type = "LRS"`);
      break;
    case 'operations':
      lines.push(`  # Operations and observability resource configuration`);
      break;
    case 'security':
      lines.push(`  # Managed identity configuration`);
      break;
  }

  lines.push('}');
  return lines.join('\n');
}

function generateConnectionComment(
  connection: Connection,
  resourceNames: Map<string, string>,
  endpoints: Endpoint[],
): string {
  const fromEp = endpoints.find((endpoint) => endpoint.id === connection.from);
  const toEp = endpoints.find((endpoint) => endpoint.id === connection.to);
  const resolveLabel = (ep: Endpoint | undefined, raw: string): string => {
    if (ep) return resourceNames.get(ep.nodeId) ?? ep.nodeId;
    const parsed = parseEndpointId(raw);
    if (parsed) return resourceNames.get(parsed.nodeId) ?? parsed.nodeId;
    return raw;
  };
  const sourceName = resolveLabel(fromEp, connection.from);
  const targetName = resolveLabel(toEp, connection.to);
  return `# DataFlow: ${sourceName} \u2192 ${targetName}`;
}

// ─── File Assembly ──────────────────────────────────────────

export function generateMainTf(
  normalized: NormalizedModel,
  provider: ProviderDefinition,
  options: GenerationOptions,
): string {
  const { architecture, resourceNames } = normalized;
  const containers = architecture.nodes.filter((n): n is ContainerNode => n.kind === 'container');
  const resources = architecture.nodes.filter((n): n is LeafNode => n.kind === 'resource');
  const sections: string[] = [];

  // Header
  sections.push('# Generated by CloudBlocks');
  sections.push(`# Provider: ${provider.displayName}`);
  sections.push(`# Project: ${options.projectName}`);
  sections.push('');

  // Required providers
  sections.push(provider.generators.terraform.requiredProviders());
  sections.push('');

  // Provider block
  sections.push(provider.generators.terraform.providerBlock(options.region));
  sections.push('');

  // Resource group
  sections.push('resource "azurerm_resource_group" "main" {');
  sections.push(`  name     = "\${var.project_name}-rg"`);
  sections.push('  location = var.location');
  sections.push('}');
  sections.push('');

  // Service plan (if compute or function blocks exist)
  const hasCompute = resources.some((b) => b.category === 'compute');
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

  // Plates (regions first, then subnets)
  const regions = containers.filter((p) => p.layer !== 'subnet');
  const subnets = containers.filter((p) => p.layer === 'subnet');

  for (const plate of regions) {
    const resName = resourceNames.get(plate.id)!;
    const mapping = provider.plateMappings[getPlateType(plate)];
    sections.push(
      generatePlateResource(plate, resName, mapping, options.projectName, null, architecture),
    );
    sections.push('');
  }

  for (const plate of subnets) {
    const resName = resourceNames.get(plate.id)!;
    const mapping = provider.plateMappings[getPlateType(plate)];
    const parentName = plate.parentId ? (resourceNames.get(plate.parentId) ?? null) : null;
    sections.push(
      generatePlateResource(plate, resName, mapping, options.projectName, parentName, architecture),
    );
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
    const subnetName = resourceNames.get(block.parentId ?? '') ?? null;

    const implicitSections = generateImplicitResources(block, resName);
    for (const section of implicitSections) {
      sections.push(section);
    }

    sections.push(generateBlockResource(block, resName, mapping, subnetName));
    sections.push('');
  }

  // Connections (as comments — actual wiring depends on resource types)
  if (architecture.connections.length > 0) {
    sections.push('# ─── Data Flow Connections ─────────────────────');
    for (const conn of architecture.connections) {
      sections.push(generateConnectionComment(conn, resourceNames, architecture.endpoints));
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
  provider: ProviderDefinition,
): string {
  const { architecture, resourceNames } = normalized;
  const resources = architecture.nodes.filter((n): n is LeafNode => n.kind === 'resource');
  const sections: string[] = [];

  sections.push('# Generated by CloudBlocks');
  sections.push('');
  sections.push('output "resource_group_name" {');
  sections.push('  value = azurerm_resource_group.main.name');
  sections.push('}');

  // Output each block's key attribute
  for (const block of resources) {
    const resName = resourceNames.get(block.id)!;
    const mapping = resolveBlockMapping(
      provider.blockMappings,
      provider.subtypeBlockMappings,
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
