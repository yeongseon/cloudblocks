import type { ArchitectureModel } from '@cloudblocks/schema';
import type { GeneratedOutput, GenerationOptions, GeneratorId, ProviderName } from './types';
import { isValidAzureRegion } from './types';
import { getProviderDefinition } from './provider';
import { getGenerator, listGeneratorIds, registerGenerator } from './registry';
import { terraformPlugin } from './terraformPlugin';
import { bicepPlugin } from './bicep';
import { pulumiPlugin } from './pulumi';
import { validateArchitecture } from '../../entities/validation/engine';
import { metricsService } from '../../shared/utils/metricsService';

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

function validateRegion(options: GenerationOptions): void {
  if (options.provider !== 'azure') {
    return;
  }

  if (!isValidAzureRegion(options.region)) {
    throw new GenerationError(
      `Invalid Azure region: "${options.region}". Use a valid region like "eastus", "westeurope", etc.`,
    );
  }
}

function assertProviderSupportedByGenerator(
  generatorId: GeneratorId,
  provider: ProviderName,
  supportedProviders: readonly ProviderName[],
): void {
  if (supportedProviders.includes(provider)) {
    return;
  }

  throw new GenerationError(
    `Generator "${generatorId}" does not support provider "${provider}". Supported providers: ${supportedProviders.join(', ')}`,
  );
}

/**
 * Generate code using the specified generator plugin.
 * Defaults to 'terraform' for backward compatibility.
 * Throws GenerationError if validation fails, provider/generator is unknown.
 */
export function generateCode(
  architecture: ArchitectureModel,
  options: GenerationOptions,
): GeneratedOutput {
  const generatorId: GeneratorId = options.generator ?? 'terraform';

  // Stage 1: Validate architecture
  const validation = validateArchitecture(architecture);
  if (!validation.valid) {
    const errorMessages = validation.errors.map((e) => e.message).join('; ');
    throw new GenerationError(`Architecture has validation errors: ${errorMessages}`);
  }

  // Stage 1.5: Validate generation options
  validateRegion(options);

  // Stage 2: Resolve generator plugin
  const plugin = getGenerator(generatorId);
  if (!plugin) {
    const availableGenerators = listGeneratorIds();
    throw new GenerationError(
      `Unknown generator: "${generatorId}". Available: ${availableGenerators.join(', ')}`,
    );
  }

  // Stage 3: Resolve provider definition
  const providerDef = getProviderDefinition(options.provider);
  if (!providerDef) {
    throw new GenerationError(
      `Unknown provider: "${options.provider}". Available: azure, aws, gcp`,
    );
  }

  assertProviderSupportedByGenerator(plugin.id, options.provider, plugin.supportedProviders);

  // Stage 4: Optional generator-level validation
  if (plugin.validate) {
    const issues = plugin.validate(architecture, { provider: providerDef });
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      throw new GenerationError(
        `Generator validation failed: ${errors.map((e) => e.message).join('; ')}`,
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
    metricsService.trackEvent('code_generated', { format: generatorId });
    return { ...output, files: formatted };
  }

  metricsService.trackEvent('code_generated', { format: generatorId });
  return output;
}
