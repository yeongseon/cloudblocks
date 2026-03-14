import type { ArchitectureModel, BlockCategory, PlateType } from '../../shared/types/index';

/**
 * Code Generation Types (v0.3)
 * Based on docs/engine/generator.md
 *
 * The generation pipeline is: Normalize → Validate → Provider Map → Generate → Format
 * All stages are pure functions. Same model → same output (deterministic).
 */

// ─── Generator Options ──────────────────────────────────────

export type GenerationMode = 'draft' | 'production';
export type ProviderName = 'azure';

export interface GenerationOptions {
  /** Target cloud provider */
  provider: ProviderName;
  /** draft = inline preview, production = full module structure */
  mode: GenerationMode;
  /** Project name for resource naming */
  projectName: string;
  /** Azure region or equivalent */
  region: string;
}

// ─── Generated Output ───────────────────────────────────────

export interface GeneratedFile {
  /** Relative file path (e.g., "main.tf") */
  path: string;
  /** File content */
  content: string;
  /** Syntax language for highlighting */
  language: 'hcl' | 'json';
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

// ─── Provider Mapping ───────────────────────────────────────

export interface ResourceMapping {
  /** Terraform resource type (e.g., "azurerm_linux_web_app") */
  resourceType: string;
  /** Default resource name prefix */
  namePrefix: string;
}

export type BlockResourceMap = Record<BlockCategory, ResourceMapping>;
export type PlateResourceMap = Record<PlateType, ResourceMapping>;

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

// ─── Pipeline Stages ────────────────────────────────────────

/** Normalized intermediate representation */
export interface NormalizedModel {
  architecture: ArchitectureModel;
  /** Resolved resource names (id → terraform resource name) */
  resourceNames: Map<string, string>;
}

export interface GeneratorPipeline {
  generate: (
    architecture: ArchitectureModel,
    options: GenerationOptions
  ) => GeneratedOutput;
}
