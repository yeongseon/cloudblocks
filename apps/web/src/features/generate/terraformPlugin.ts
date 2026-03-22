import type { GeneratorPlugin } from './types';
import { GENERATOR_METADATA_VERSION } from './types';
import { normalize, generateMainTf, generateVariablesTf, generateOutputsTf } from './terraform';

/**
 * Terraform Generator Plugin (v1.0)
 *
 * Wraps the existing terraform.ts pure functions as a GeneratorPlugin.
 * Generates main.tf, variables.tf, outputs.tf for Azure provider.
 */
export const terraformPlugin: GeneratorPlugin = {
  id: 'terraform',
  displayName: 'Terraform (HCL)',
  supportedProviders: ['azure', 'aws', 'gcp'],

  filePlan: () => [
    { path: 'main.tf', language: 'hcl' },
    { path: 'variables.tf', language: 'hcl' },
    { path: 'outputs.tf', language: 'hcl' },
  ],

  normalize: (arch, ctx) => normalize(arch, ctx.provider),

  generate: (model, ctx) => {
    const mainTf = generateMainTf(model, ctx.provider, ctx.options);
    const variablesTf = generateVariablesTf(ctx.options);
    const outputsTf = generateOutputsTf(model, ctx.provider);

    return {
      files: [
        { path: 'main.tf', content: mainTf, language: 'hcl' },
        { path: 'variables.tf', content: variablesTf, language: 'hcl' },
        { path: 'outputs.tf', content: outputsTf, language: 'hcl' },
      ],
      metadata: {
        generator: 'terraform',
        version: GENERATOR_METADATA_VERSION,
        provider: ctx.options.provider,
        generatedAt: new Date().toISOString(),
      },
    };
  },
};
