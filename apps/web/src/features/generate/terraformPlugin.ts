import type { GeneratorPlugin } from './types';
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
  supportedProviders: ['azure'],

  filePlan: () => [
    { path: 'main.tf', language: 'hcl' },
    { path: 'variables.tf', language: 'hcl' },
    { path: 'outputs.tf', language: 'hcl' },
  ],

  normalize: (arch, ctx) => {
    // The legacy ProviderAdapter interface is compatible enough for normalize()
    const legacyAdapter = {
      name: ctx.provider.name,
      displayName: ctx.provider.displayName,
      blockMappings: ctx.provider.blockMappings,
      subtypeBlockMappings: ctx.provider.subtypeBlockMappings,
      plateMappings: ctx.provider.plateMappings,
      providerBlock: ctx.provider.generators.terraform.providerBlock,
      requiredProviders: ctx.provider.generators.terraform.requiredProviders,
    };
    return normalize(arch, legacyAdapter, ctx.provider.subtypeBlockMappings);
  },

  generate: (model, ctx) => {
    const legacyAdapter = {
      name: ctx.provider.name,
      displayName: ctx.provider.displayName,
      blockMappings: ctx.provider.blockMappings,
      subtypeBlockMappings: ctx.provider.subtypeBlockMappings,
      plateMappings: ctx.provider.plateMappings,
      providerBlock: ctx.provider.generators.terraform.providerBlock,
      requiredProviders: ctx.provider.generators.terraform.requiredProviders,
    };

    const mainTf = generateMainTf(model, legacyAdapter, ctx.options, ctx.provider.subtypeBlockMappings);
    const variablesTf = generateVariablesTf(ctx.options);
    const outputsTf = generateOutputsTf(model, legacyAdapter, ctx.provider.subtypeBlockMappings);

    return {
      files: [
        { path: 'main.tf', content: mainTf, language: 'hcl' },
        { path: 'variables.tf', content: variablesTf, language: 'hcl' },
        { path: 'outputs.tf', content: outputsTf, language: 'hcl' },
      ],
      metadata: {
        generator: 'terraform',
        version: '1.0.0',
        provider: ctx.options.provider,
        generatedAt: new Date().toISOString(),
      },
    };
  },
};
