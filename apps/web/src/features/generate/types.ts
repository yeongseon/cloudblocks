import type {
  ArchitectureModel,
  ContainerBlock,
  ProviderType,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';

type PlateLayerType = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

/**
 * Code Generation Types (v1.0)
 * Based on docs/engine/generator.md
 *
 * The generation pipeline is: Normalize → Validate → Provider Map → Generate → Format
 * All stages are pure functions. Same model → same output (deterministic).
 *
 * v1.0 additions:
 *   - GeneratorId, FileLanguage, GeneratorPlugin (multi-generator support)
 *   - ProviderDefinition (per-generator config)
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

export type BlockResourceMap = Record<ResourceCategory, ResourceMapping>;
export type ContainerBlockResourceMap = Record<PlateLayerType, ResourceMapping>;

// ─── Subtype-Aware Mapping ───────────────────────────────────

/**
 * Maps ResourceCategory → subtype string → ResourceMapping.
 * Used alongside BlockResourceMap for subtype-specific resource resolution.
 */
export type SubtypeResourceMap = Partial<Record<ResourceCategory, Record<string, ResourceMapping>>>;

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
  category: ResourceCategory,
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

// ─── Provider Definition (v1.0) ─────────────────────────────

export interface TerraformProviderConfig {
  requiredProviders: () => string;
  providerBlock: (region: string) => string;
  regionVariableDescription?: string;
  renderSharedResources?: (ctx: TerraformRenderContext) => string[];
  renderContainerBody: (ctx: TerraformContainerContext) => string[];
  renderContainerCompanions?: (ctx: TerraformContainerContext) => string[];
  extraVariables?: (ctx: TerraformRenderContext) => string[];
  renderBlockCompanions?: (ctx: TerraformBlockContext) => string[];
  renderBlockBody: (ctx: TerraformBlockContext) => string[];
  extraOutputs?: (ctx: TerraformRenderContext) => TerraformOutputSpec[];
}

export interface BicepProviderConfig {
  targetScope: 'resourceGroup' | 'subscription';
}

export interface PulumiProviderConfig {
  packageName: string;
  runtime: 'nodejs';
}

/**
 * Canonical provider abstraction used by the generation pipeline.
 *
 * A `ProviderDefinition` owns provider metadata, generic block/container mappings,
 * generator-specific configuration (`terraform`, `bicep`, `pulumi`), and optional
 * subtype-aware block mappings. New generation features should target this interface.
 */
export interface ProviderDefinition {
  name: ProviderName;
  displayName: string;
  blockMappings: BlockResourceMap;
  containerLayerMappings: ContainerBlockResourceMap;
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
  normalize: (
    arch: ArchitectureModel,
    ctx: { provider: ProviderDefinition; mode: GenerationMode },
  ) => NormalizedModel;
  /** Generate output files from normalized model */
  generate: (
    model: NormalizedModel,
    ctx: { provider: ProviderDefinition; mode: GenerationMode; options: GenerationOptions },
  ) => GeneratedOutput;
  /** Optional: post-process generated files */
  format?: (
    files: GeneratedFile[],
    ctx: { languageHints?: Record<string, FileLanguage> },
  ) => GeneratedFile[];
}

// ─── Pipeline Stages ────────────────────────────────────────

/** Normalized intermediate representation */
export interface NormalizedModel {
  architecture: ArchitectureModel;
  /** Resolved resource names (id → resource name) */
  resourceNames: Map<string, string>;
}

export interface TerraformRenderContext {
  normalized: NormalizedModel;
  options: GenerationOptions;
  resourceNames: Map<string, string>;
}

export interface TerraformContainerContext extends TerraformRenderContext {
  container: ContainerBlock;
  mapping: ResourceMapping;
  resourceName: string;
  parentResourceName: string | null;
}

export interface TerraformBlockContext extends TerraformRenderContext {
  block: ResourceBlock;
  mapping: ResourceMapping;
  resourceName: string;
  parentResourceName: string | null;
}

export interface TerraformOutputSpec {
  name: string;
  value: string;
}

export interface GeneratorPipeline {
  generate: (architecture: ArchitectureModel, options: GenerationOptions) => GeneratedOutput;
}

// ─── Azure Region Allowlist ─────────────────────────────────

export const AZURE_REGIONS = [
  'eastus',
  'eastus2',
  'westus',
  'westus2',
  'westus3',
  'centralus',
  'northcentralus',
  'southcentralus',
  'westcentralus',
  'canadacentral',
  'canadaeast',
  'brazilsouth',
  'northeurope',
  'westeurope',
  'uksouth',
  'ukwest',
  'francecentral',
  'francesouth',
  'germanywestcentral',
  'norwayeast',
  'swedencentral',
  'switzerlandnorth',
  'eastasia',
  'southeastasia',
  'japaneast',
  'japanwest',
  'koreacentral',
  'koreasouth',
  'australiaeast',
  'australiasoutheast',
  'australiacentral',
  'centralindia',
  'southindia',
  'westindia',
  'uaenorth',
  'qatarcentral',
  'southafricanorth',
] as const;

// ─── AWS Region Allowlist ───────────────────────────────────

export const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'eu-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ap-east-1',
  'me-south-1',
  'af-south-1',
] as const;

export type AwsRegion = (typeof AWS_REGIONS)[number];

// ─── GCP Region Allowlist ───────────────────────────────────

export const GCP_REGIONS = [
  'us-central1',
  'us-east1',
  'us-east4',
  'us-west1',
  'us-west2',
  'us-west4',
  'northamerica-northeast1',
  'southamerica-east1',
  'europe-west1',
  'europe-west2',
  'europe-west3',
  'europe-west4',
  'europe-west6',
  'europe-north1',
  'europe-central2',
  'asia-east1',
  'asia-east2',
  'asia-northeast1',
  'asia-northeast2',
  'asia-northeast3',
  'asia-southeast1',
  'asia-southeast2',
  'asia-south1',
  'australia-southeast1',
  'me-west1',
  'me-central1',
] as const;

export type GcpRegion = (typeof GCP_REGIONS)[number];

export type AzureRegion = (typeof AZURE_REGIONS)[number];

// ─── IaC Value Sanitization ────────────────────────────────

/** Escape a string for safe interpolation into IaC template literals (HCL, Bicep, TypeScript). */
export function sanitizeIaCValue(value: string): string {
  return value.replace(/[\\"'`${}]/g, '');
}

/** Validate that a region string is in the Azure allowlist. */
export function isValidAzureRegion(region: string): region is AzureRegion {
  return (AZURE_REGIONS as readonly string[]).includes(region);
}

/** Validate that a region string is in the AWS allowlist. */
export function isValidAwsRegion(region: string): region is AwsRegion {
  return (AWS_REGIONS as readonly string[]).includes(region);
}

/** Validate that a region string is in the GCP allowlist. */
export function isValidGcpRegion(region: string): region is GcpRegion {
  return (GCP_REGIONS as readonly string[]).includes(region);
}
