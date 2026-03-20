import type { ArchitectureModel, BlockCategory, PlateType, ProviderType } from '@cloudblocks/schema';

/**
 * Code Generation Types (v1.0)
 * Based on docs/engine/generator.md
 *
 * The generation pipeline is: Normalize → Validate → Provider Map → Generate → Format
 * All stages are pure functions. Same model → same output (deterministic).
 *
 * v1.0 additions:
 *   - GeneratorId, FileLanguage, GeneratorPlugin (multi-generator support)
 *   - ProviderDefinition (per-generator config, replaces ProviderAdapter)
 *   - ValidationIssue (generator-level validation)
 */

// ─── Generator Identity ─────────────────────────────────────

export type GeneratorId = 'terraform' | 'bicep' | 'pulumi';
export type KnownLanguage = 'hcl' | 'json' | 'bicep' | 'typescript';
export type FileLanguage = KnownLanguage | (string & {});

// ─── Generator Options ──────────────────────────────────────

export type GenerationMode = 'draft' | 'production';
export type ProviderName = ProviderType;

export const DEFAULT_REGION_BY_PROVIDER: Record<ProviderName, string> = {
  azure: 'eastus',
  aws: 'us-east-1',
  gcp: 'us-central1',
};

export const GENERATOR_METADATA_VERSION = '1.0.0';

export interface GenerationOptions {
  /** Target cloud provider */
  provider: ProviderName;
  /** draft = inline preview, production = full module structure */
  mode: GenerationMode;
  /** Project name for resource naming */
  projectName: string;
  /** Azure region or equivalent */
  region: string;
  /** Target generator (defaults to 'terraform' for backward compat) */
  generator?: GeneratorId;
}

// ─── Generated Output ───────────────────────────────────────

export interface GeneratedFile {
  /** Relative file path (e.g., "main.tf") */
  path: string;
  /** File content */
  content: string;
  /** Syntax language for highlighting */
  language: FileLanguage;
}

export interface GenerationMetadata {
  generator: string;
  version: string;
  provider: ProviderName;
  generatedAt: string;
}

export interface GeneratedOutput {
  files: GeneratedFile[];
  metadata: GenerationMetadata;
}

// ─── Validation ─────────────────────────────────────────────

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  blockId?: string;
}

// ─── Provider Mapping ───────────────────────────────────────

export interface ResourceMapping {
  /** Resource type (e.g., "azurerm_linux_web_app" for Terraform) */
  resourceType: string;
  /** Default resource name prefix */
  namePrefix: string;
}

export type BlockResourceMap = Record<BlockCategory, ResourceMapping>;
export type PlateResourceMap = Record<PlateType, ResourceMapping>;

// ─── Subtype-Aware Mapping ───────────────────────────────────

/**
 * Maps BlockCategory → subtype string → ResourceMapping.
 * Used alongside BlockResourceMap for subtype-specific resource resolution.
 */
export type SubtypeResourceMap = Partial<Record<BlockCategory, Record<string, ResourceMapping>>>;

/**
 * Resolve the correct ResourceMapping for a block based on category and optional subtype.
 * Resolution order:
 *   1. If subtype provided AND subtypeMappings has entry → return subtype mapping
 *   2. Otherwise → fallback to blockMappings[category]
 *   3. If neither found → return undefined
 */
export function resolveBlockMapping(
  blockMappings: BlockResourceMap,
  subtypeMappings: SubtypeResourceMap | undefined,
  category: BlockCategory,
  subtype?: string,
): ResourceMapping | undefined {
  if (subtype && subtypeMappings) {
    const categorySubtypes = subtypeMappings[category];
    if (categorySubtypes && categorySubtypes[subtype]) {
      return categorySubtypes[subtype];
    }
  }

  return blockMappings[category];
}

/** @deprecated Use ProviderDefinition instead. Kept for backward compat with terraform.ts */
export interface ProviderAdapter {
  name: ProviderName;
  displayName: string;
  blockMappings: BlockResourceMap;
  plateMappings: PlateResourceMap;
  /** Generate provider block HCL */
  providerBlock: (region: string) => string;
  /** Generate terraform required_providers block */
  requiredProviders: () => string;
}

// ─── Provider Definition (v1.0) ─────────────────────────────

export interface TerraformProviderConfig {
  requiredProviders: () => string;
  providerBlock: (region: string) => string;
}

export interface BicepProviderConfig {
  targetScope: 'resourceGroup' | 'subscription';
}

export interface PulumiProviderConfig {
  packageName: string;
  runtime: 'nodejs';
}

export interface ProviderDefinition {
  name: ProviderName;
  displayName: string;
  blockMappings: BlockResourceMap;
  plateMappings: PlateResourceMap;
  generators: {
    terraform: TerraformProviderConfig;
    bicep: BicepProviderConfig;
    pulumi: PulumiProviderConfig;
  };
  subtypeBlockMappings?: SubtypeResourceMap;
}

// ─── Generator Plugin Interface (v1.0) ──────────────────────

export interface GeneratorPlugin {
  id: GeneratorId;
  displayName: string;
  supportedProviders: ProviderName[];
  /** Optional: declare files before generation */
  filePlan?: (opts: GenerationOptions) => Array<{ path: string; language: FileLanguage }>;
  /** Optional: generator-specific validation */
  validate?: (arch: ArchitectureModel, ctx: { provider: ProviderDefinition }) => ValidationIssue[];
  /** Normalize architecture into intermediate representation */
  normalize: (arch: ArchitectureModel, ctx: { provider: ProviderDefinition; mode: GenerationMode }) => NormalizedModel;
  /** Generate output files from normalized model */
  generate: (model: NormalizedModel, ctx: { provider: ProviderDefinition; mode: GenerationMode; options: GenerationOptions }) => GeneratedOutput;
  /** Optional: post-process generated files */
  format?: (files: GeneratedFile[], ctx: { languageHints?: Record<string, FileLanguage> }) => GeneratedFile[];
}

// ─── Pipeline Stages ────────────────────────────────────────

/** Normalized intermediate representation */
export interface NormalizedModel {
  architecture: ArchitectureModel;
  /** Resolved resource names (id → resource name) */
  resourceNames: Map<string, string>;
}

export interface GeneratorPipeline {
  generate: (
    architecture: ArchitectureModel,
    options: GenerationOptions
  ) => GeneratedOutput;
}

// ─── Azure Region Allowlist ─────────────────────────────────

export const AZURE_REGIONS = [
  'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
  'centralus', 'northcentralus', 'southcentralus', 'westcentralus',
  'canadacentral', 'canadaeast',
  'brazilsouth',
  'northeurope', 'westeurope', 'uksouth', 'ukwest',
  'francecentral', 'francesouth',
  'germanywestcentral',
  'norwayeast', 'swedencentral', 'switzerlandnorth',
  'eastasia', 'southeastasia',
  'japaneast', 'japanwest',
  'koreacentral', 'koreasouth',
  'australiaeast', 'australiasoutheast', 'australiacentral',
  'centralindia', 'southindia', 'westindia',
  'uaenorth', 'qatarcentral',
  'southafricanorth',
] as const;

export type AzureRegion = typeof AZURE_REGIONS[number];

// ─── IaC Value Sanitization ────────────────────────────────

/** Escape a string for safe interpolation into IaC template literals (HCL, Bicep, TypeScript). */
export function sanitizeIaCValue(value: string): string {
  return value.replace(/[\\"'`${}]/g, '');
}

/** Validate that a region string is in the Azure allowlist. */
export function isValidAzureRegion(region: string): region is AzureRegion {
  return (AZURE_REGIONS as readonly string[]).includes(region);
}
