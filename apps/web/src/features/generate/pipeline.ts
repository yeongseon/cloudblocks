import type { ArchitectureModel } from '../../shared/types/index';
import type {
  GeneratedOutput,
  GenerationOptions,
  GeneratorId,
  GeneratorPipeline,
} from './types';
import { getProvider, getProviderDefinition } from './provider';
import { getGenerator, registerGenerator } from './registry';
import { terraformPlugin } from './terraformPlugin';
import { bicepPlugin } from './bicep';
import { pulumiPlugin } from './pulumi';
import {
  normalize,
  generateMainTf,
  generateVariablesTf,
  generateOutputsTf,
} from './terraform';
import { validateArchitecture } from '../../entities/validation/engine';

/**
 * Code Generation Pipeline Orchestrator (v1.0)
 * Based on docs/engine/generator.md
 *
 * Supports multiple generators via the GeneratorPlugin interface.
 * Pipeline stages: Validate → Resolve Provider → Normalize → Generate → Format
 * All stages are pure functions.
 */

// ─── Bootstrap: register all built-in generators ────────────
registerGenerator(terraformPlugin);
registerGenerator(bicepPlugin);
registerGenerator(pulumiPlugin);

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}

/**
 * Generate code using the specified generator plugin.
 * Defaults to 'terraform' for backward compatibility.
 * Throws GenerationError if validation fails, provider/generator is unknown.
 */
export function generateCode(
  architecture: ArchitectureModel,
  options: GenerationOptions
): GeneratedOutput {
  const generatorId: GeneratorId = options.generator ?? 'terraform';

  // Stage 1: Validate architecture
  const validation = validateArchitecture(architecture);
  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => e.message)
      .join('; ');
    throw new GenerationError(
      `Architecture has validation errors: ${errorMessages}`
    );
  }

  // Stage 2: Resolve generator plugin
  const plugin = getGenerator(generatorId);
  if (!plugin) {
    throw new GenerationError(
      `Unknown generator: "${generatorId}". Available: terraform, bicep, pulumi`
    );
  }

  // Stage 3: Resolve provider definition
  const providerDef = getProviderDefinition(options.provider);
  if (!providerDef) {
    throw new GenerationError(
      `Unknown provider: "${options.provider}". Available: azure`
    );
  }

  // Stage 4: Optional generator-level validation
  if (plugin.validate) {
    const issues = plugin.validate(architecture, { provider: providerDef });
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      throw new GenerationError(
        `Generator validation failed: ${errors.map((e) => e.message).join('; ')}`
      );
    }
  }

  // Stage 5: Normalize
  const normalized = plugin.normalize(architecture, {
    provider: providerDef,
    mode: options.mode,
  });

  // Stage 6: Generate
  const output = plugin.generate(normalized, {
    provider: providerDef,
    mode: options.mode,
    options,
  });

  // Stage 7: Optional format
  if (plugin.format) {
    const formatted = plugin.format(output.files, {});
    return { ...output, files: formatted };
  }

  return output;
}

// ─── Legacy Pipeline (backward compat) ──────────────────────

function legacyGenerate(
  architecture: ArchitectureModel,
  options: GenerationOptions
): GeneratedOutput {
  // Stage 1: Validate
  const validation = validateArchitecture(architecture);
  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => e.message)
      .join('; ');
    throw new GenerationError(
      `Architecture has validation errors: ${errorMessages}`
    );
  }

  // Stage 2: Resolve provider adapter (legacy)
  const provider = getProvider(options.provider);
  if (!provider) {
    throw new GenerationError(
      `Unknown provider: "${options.provider}". Available: azure`
    );
  }

  // Stage 3: Normalize
  const normalized = normalize(architecture, provider);

  // Stage 4: Generate
  const mainTf = generateMainTf(normalized, provider, options);
  const variablesTf = generateVariablesTf(options);
  const outputsTf = generateOutputsTf(normalized, provider);

  // Stage 5: Format
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

export const terraformPipeline: GeneratorPipeline = { generate: legacyGenerate };

/**
 * Convenience function for generating Terraform code.
 * Returns the generated output or throws GenerationError.
 * @deprecated Use generateCode() with options.generator = 'terraform' instead.
 */
export function generateTerraform(
  architecture: ArchitectureModel,
  options: GenerationOptions
): GeneratedOutput {
  return terraformPipeline.generate(architecture, options);
}
