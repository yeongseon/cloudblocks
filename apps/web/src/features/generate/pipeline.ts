import type { ArchitectureModel } from '../../shared/types/index';
import type {
  GenerationOptions,
  GeneratedOutput,
  GeneratorPipeline,
} from './types';
import { getProvider } from './provider';
import {
  normalize,
  generateMainTf,
  generateVariablesTf,
  generateOutputsTf,
} from './terraform';
import { validateArchitecture } from '../../entities/validation/engine';

/**
 * Code Generation Pipeline Orchestrator (v0.3)
 * Based on docs/engine/generator.md
 *
 * Pipeline stages: Normalize → Validate → Provider Map → Generate → Format
 * All stages are pure functions.
 */

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}

/**
 * Execute the full generation pipeline.
 * Throws GenerationError if validation fails or provider is unknown.
 */
function generate(
  architecture: ArchitectureModel,
  options: GenerationOptions
): GeneratedOutput {
  // Stage 1: Validate — architecture must be valid before generation
  const validation = validateArchitecture(architecture);
  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => e.message)
      .join('; ');
    throw new GenerationError(
      `Architecture has validation errors: ${errorMessages}`
    );
  }

  // Stage 2: Resolve provider adapter
  const provider = getProvider(options.provider);
  if (!provider) {
    throw new GenerationError(
      `Unknown provider: "${options.provider}". Available: azure`
    );
  }

  // Stage 3: Normalize — resolve resource names
  const normalized = normalize(architecture, provider);

  // Stage 4: Generate — produce file contents
  const mainTf = generateMainTf(normalized, provider, options);
  const variablesTf = generateVariablesTf(options);
  const outputsTf = generateOutputsTf(normalized, provider);

  // Stage 5: Format — assemble output
  const files = [
    { path: 'main.tf', content: mainTf, language: 'hcl' as const },
    { path: 'variables.tf', content: variablesTf, language: 'hcl' as const },
    { path: 'outputs.tf', content: outputsTf, language: 'hcl' as const },
  ];

  return {
    files,
    metadata: {
      generator: 'cloudblocks',
      version: '0.3.0',
      provider: options.provider,
      generatedAt: new Date().toISOString(),
    },
  };
}

export const terraformPipeline: GeneratorPipeline = { generate };

/**
 * Convenience function for generating Terraform code.
 * Returns the generated output or throws GenerationError.
 */
export function generateTerraform(
  architecture: ArchitectureModel,
  options: GenerationOptions
): GeneratedOutput {
  return terraformPipeline.generate(architecture, options);
}
