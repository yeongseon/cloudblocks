import type {
  ArchitectureModel,
  Connection,
  ContainerBlock,
  Endpoint,
  ResourceBlock,
} from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import type {
  GenerationOptions,
  NormalizedModel,
  ProviderDefinition,
  ResourceMapping,
  TerraformRenderContext,
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

function getContainerLayer(
  container: ContainerBlock,
): 'global' | 'edge' | 'region' | 'zone' | 'subnet' {
  if (container.layer === 'resource') {
    return 'region';
  }
  return container.layer;
}

// ─── Normalize Stage ────────────────────────────────────────

export function normalize(
  architecture: ArchitectureModel,
  provider: ProviderDefinition,
): NormalizedModel {
  const containers = architecture.nodes.filter((n): n is ContainerBlock => n.kind === 'container');
  const resources = architecture.nodes.filter((n): n is ResourceBlock => n.kind === 'resource');
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
  for (const container of containers) {
    const mapping = provider.containerLayerMappings[getContainerLayer(container)];
    const name = uniqueName(mapping.namePrefix, container.name);
    resourceNames.set(container.id, name);
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

function createRenderContext(
  normalized: NormalizedModel,
  options: GenerationOptions,
): TerraformRenderContext {
  return {
    normalized,
    options,
    resourceNames: normalized.resourceNames,
  };
}

// ─── Generate Stage ─────────────────────────────────────────

function generatePlateResource(
  container: ContainerBlock,
  resourceName: string,
  mapping: ResourceMapping,
  parentResourceName: string | null,
  provider: ProviderDefinition,
  renderCtx: TerraformRenderContext,
): string {
  const lines: string[] = [];

  lines.push(`resource "${mapping.resourceType}" "${resourceName}" {`);
  const containerBody = provider.generators.terraform.renderContainerBody({
    ...renderCtx,
    container,
    mapping,
    resourceName,
    parentResourceName,
  });
  for (const line of containerBody) {
    lines.push(line);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateBlockResource(
  block: ResourceBlock,
  resourceName: string,
  mapping: ResourceMapping,
  parentResourceName: string | null,
  provider: ProviderDefinition,
  renderCtx: TerraformRenderContext,
): string {
  const lines: string[] = [];

  lines.push(`resource "${mapping.resourceType}" "${resourceName}" {`);
  const blockBody = provider.generators.terraform.renderBlockBody({
    ...renderCtx,
    block,
    mapping,
    resourceName,
    parentResourceName,
  });
  for (const line of blockBody) {
    lines.push(line);
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
    if (ep) return resourceNames.get(ep.blockId) ?? ep.blockId;
    const parsed = parseEndpointId(raw);
    if (parsed) return resourceNames.get(parsed.blockId) ?? parsed.blockId;
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
  const renderCtx = createRenderContext(normalized, options);
  const containers = architecture.nodes.filter((n): n is ContainerBlock => n.kind === 'container');
  const resources = architecture.nodes.filter((n): n is ResourceBlock => n.kind === 'resource');
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

  const sharedResources = provider.generators.terraform.renderSharedResources?.(renderCtx) ?? [];
  for (const line of sharedResources) {
    sections.push(line);
  }

  // Plates (regions first, then subnets)
  const regions = containers.filter((p) => p.layer !== 'subnet');
  const subnets = containers.filter((p) => p.layer === 'subnet');

  for (const container of regions) {
    const resName = resourceNames.get(container.id)!;
    const mapping = provider.containerLayerMappings[getContainerLayer(container)];
    sections.push(generatePlateResource(container, resName, mapping, null, provider, renderCtx));
    const companionLines =
      provider.generators.terraform.renderContainerCompanions?.({
        ...renderCtx,
        container,
        mapping,
        resourceName: resName,
        parentResourceName: null,
      }) ?? [];
    for (const line of companionLines) {
      sections.push(line);
    }
    sections.push('');
  }

  for (const container of subnets) {
    const resName = resourceNames.get(container.id)!;
    const mapping = provider.containerLayerMappings[getContainerLayer(container)];
    const parentName = container.parentId ? (resourceNames.get(container.parentId) ?? null) : null;
    sections.push(
      generatePlateResource(container, resName, mapping, parentName, provider, renderCtx),
    );
    const companionLines =
      provider.generators.terraform.renderContainerCompanions?.({
        ...renderCtx,
        container,
        mapping,
        resourceName: resName,
        parentResourceName: parentName,
      }) ?? [];
    for (const line of companionLines) {
      sections.push(line);
    }
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

    const blockCtx = {
      ...renderCtx,
      block,
      mapping,
      resourceName: resName,
      parentResourceName: subnetName,
    };

    const companionLines = provider.generators.terraform.renderBlockCompanions?.(blockCtx) ?? [];
    for (const section of companionLines) {
      sections.push(section);
    }

    sections.push(generateBlockResource(block, resName, mapping, subnetName, provider, renderCtx));
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

export function generateVariablesTf(
  options: GenerationOptions,
  provider: ProviderDefinition,
): string {
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
  sections.push(
    `  description = "${provider.generators.terraform.regionVariableDescription ?? 'Deployment region'}"`,
  );
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

  const renderCtx = createRenderContext(
    {
      architecture: {
        id: 'variables-only',
        name: 'variables-only',
        version: '1',
        nodes: [],
        connections: [],
        endpoints: [],
        externalActors: [],
        createdAt: '1970-01-01T00:00:00.000Z',
        updatedAt: '1970-01-01T00:00:00.000Z',
      },
      resourceNames: new Map(),
    },
    options,
  );
  const extraVariableLines = provider.generators.terraform.extraVariables?.(renderCtx) ?? [];
  if (extraVariableLines.length > 0) {
    sections.push('');
    for (const line of extraVariableLines) {
      sections.push(line);
    }
  }

  return sections.join('\n');
}

export function generateOutputsTf(
  normalized: NormalizedModel,
  provider: ProviderDefinition,
  options: GenerationOptions,
): string {
  const { architecture, resourceNames } = normalized;
  const renderCtx = createRenderContext(normalized, options);
  const resources = architecture.nodes.filter((n): n is ResourceBlock => n.kind === 'resource');
  const sections: string[] = [];

  sections.push('# Generated by CloudBlocks');
  sections.push('');
  const providerOutputs = provider.generators.terraform.extraOutputs?.(renderCtx) ?? [];
  for (const output of providerOutputs) {
    sections.push(`output "${output.name}" {`);
    sections.push(`  value = ${output.value}`);
    sections.push('}');
  }

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
